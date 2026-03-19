from neo4j import GraphDatabase

# 1. Connection Details (Matches our Docker setup)
URI = "bolt://localhost:7687"
AUTH = ("neo4j", "password")
driver = GraphDatabase.driver(URI, auth=AUTH)

def save_structured_hierarchy(filename, hierarchy):
    """Saves nested JSON hierarchy (MainTopic -> SubTopic -> Concepts) to Neo4j"""
    main_topic = hierarchy.get("main_topic", "Unknown")
    subtopics = hierarchy.get("subtopics", [])
    
    with driver.session() as session:
        # 1. Clean old data for this filename (optional/idempotent)
        session.run("MATCH (d:Document {name: $filename}) DETACH DELETE d", filename=filename)
        
        # 2. Create the Document and MainTopic
        session.run("""
            CREATE (d:Document {name: $filename})
            CREATE (m:MainTopic {text: $main_topic})
            CREATE (d)-[:ROOT_TOPIC]->(m)
        """, filename=filename, main_topic=main_topic)
        
        # 3. Create Subtopics and Concepts
        for sub in subtopics:
            topic_name = sub.get("topic")
            concepts = sub.get("concepts", [])
            
            session.run("""
                MATCH (m:MainTopic {text: $main_topic})
                CREATE (s:SubTopic {text: $topic_name})
                CREATE (m)-[:HAS_SUBTOPIC]->(s)
                WITH s
                UNWIND $concepts as concept_text
                CREATE (c:Concept {text: concept_text})
                CREATE (s)-[:HAS_DETAIL]->(c)
            """, main_topic=main_topic, topic_name=topic_name, concepts=concepts)
            
    print(f"✅ Saved Structured Hierarchy for {filename}")

def save_concepts_hierarchical(filename, data):
    """Fallback/Legacy support for quadruple data"""
    if isinstance(data, dict):
        return save_structured_hierarchy(filename, data)
    # Legacy quadruple logic below...

def get_all_documents():
    """Retrieves all documents and their structural semantic links"""
    query = """
    MATCH (d:Document)
    OPTIONAL MATCH (d)-[:HAS_CHAPTER]->(c:Chapter)-[:HAS_CONCEPT]->(s:Concept)-[r:RELATED_TO]->(o:Concept)
    WITH d, c, s, r, o WHERE c IS NOT NULL OR (c IS NULL)
    RETURN d.name as filename, 
           CASE WHEN c IS NULL THEN [] ELSE collect([c.name, s.text, r.type, o.text]) END as concepts
    """
    with driver.session() as session:
        result = session.run(query)
        return [{"filename": record["filename"], "concepts": record["concepts"]} for record in result]
