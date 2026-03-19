const express = require("express");
const cors = require("cors");
const pool = require("./db/connection");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

async function connectDB() {
  while (true) {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Connected to PostgreSQL");
      
      // Initialize db schema
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ Users table ensured");
      break;
    } catch (err) {
      console.log("⏳ Waiting for PostgreSQL...", err.message);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

connectDB().then(() => {
  app.use("/api/auth", authRoutes);

  app.listen(PORT, () => {
    console.log(`🚀 Auth service running on port ${PORT}`);
  });
});