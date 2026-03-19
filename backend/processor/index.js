const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const nlp = require("compromise");
const { Pool } = require("pg");
const neo4j = require("neo4j-driver");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Postgres Connection
const pgPool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  host: process.env.DB_HOST || "postgres-db",
  database: process.env.DB_NAME || "conceptweaver",
  port: 5432,
});

// Neo4j Connection
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://neo4j-db:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  )
);

// Setup multer for in-memory file uploads
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/process-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const session = neo4jDriver.session();
  try {
    // 1. Text Extraction
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    // 2. Simple Concept Extraction using compromise NLP
    let doc = nlp(text);
    
    // Grab the top most frequent nouns as "concepts"
    let concepts = doc.nouns().out('frequency').slice(0, 15).map(c => c.normal);
    // Simple deduplication and filtering small words
    concepts = [...new Set(concepts)].filter(c => c.length > 3);

    // Save document metadata to Postgres 
    const insertDoc = await pgPool.query(
      "INSERT INTO documents (filename, uploaded_at) VALUES ($1, CURRENT_TIMESTAMP) RETURNING id",
      [req.file.originalname]
    );
    const docId = insertDoc.rows[0].id;

    // 3. Save to Graph DB (Neo4j)
    // Create Document Node
    await session.run(
       "MERGE (d:Document {id: $docId, name: $filename})",
       { docId: docId.toString(), filename: req.file.originalname }
    );

    // Create Concept Nodes and Connect to Document
    const nodes = [];
    const edges = [];
    for (const concept of concepts) {
       await session.run(`
          MERGE (c:Concept {name: $conceptName})
          WITH c
          MATCH (d:Document {id: $docId})
          MERGE (d)-[:CONTAINS]->(c)
       `, { conceptName: concept, docId: docId.toString() });
       
       nodes.push({ id: concept, label: concept });
       edges.push({ source: docId.toString(), target: concept, type: "CONTAINS" });
    }

    nodes.push({ id: docId.toString(), label: req.file.originalname, category: 'Document' });

    res.json({
       message: "Processing complete", 
       documentId: docId,
       graph: { nodes, edges }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process PDF" });
  } finally {
    await session.close();
  }
});

// Initialization wrapper
async function init() {
  // Ensure tables exist
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Processor: DB ready");
  } catch (err) {
    console.error("❌ DB Init error", err);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Processor service running on port ${PORT}`);
  });
}

init();
