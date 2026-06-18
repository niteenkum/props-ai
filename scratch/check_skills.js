import pg from "pg";
import fs from "fs";

const { Client } = pg;

function parseEnv() {
  const envContent = fs.readFileSync("/Users/niteenkumar/Documents/niteen/props-ai/.env", "utf8");
  for (const line of envContent.split("\n")) {
    if (line.startsWith("DATABASE_URL=")) {
      let val = line.substring("DATABASE_URL=".length).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      return val;
    }
  }
  return null;
}

const connectionString = parseEnv();
if (!connectionString) { console.error("No DATABASE_URL found!"); process.exit(1); }

async function setup() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const res = await client.query('SELECT COUNT(*), MIN(name), MAX(name) FROM "Skill"');
    console.log("Skill rows check:", res.rows[0]);

    const sample = await client.query('SELECT * FROM "Skill" LIMIT 5');
    console.log("Sample skills:", sample.rows);
  } finally {
    await client.end();
  }
}

setup().catch(e => { console.error("Error:", e.message); process.exit(1); });
