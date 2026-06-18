import pg from "pg";
import fs from "fs";
import path from "path";

const { Client } = pg;

function parseEnv() {
  const envContent = fs.readFileSync("/Users/niteenkumar/Documents/niteen/props-ai/.env", "utf8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("DATABASE_URL=")) {
      let val = line.substring("DATABASE_URL=".length).trim();
      // Remove surrounding quotes if any
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
      return val;
    }
  }
  return null;
}

const connectionString = parseEnv() || "postgresql://niteenkumar@localhost:5432/props_ai_db?schema=public";

async function checkVector() {
  console.log("Connecting to:", connectionString);
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const resExt = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
    if (resExt.rows.length > 0) {
      console.log("✅ pgvector extension is already installed!");
    } else {
      console.log("pgvector extension is NOT active. Attempting to create it...");
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        console.log("✅ Successfully enabled pgvector extension!");
      } catch (err) {
        console.error("❌ Failed to enable pgvector extension:", err.message);
      }
    }
  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await client.end();
  }
}

checkVector();
