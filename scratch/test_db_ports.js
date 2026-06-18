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

async function check(port) {
  const url = connectionString.replace(":5432/", `:${port}/`);
  console.log(`🔌 Testing connection on port ${port}...`);
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`✅ Success on port ${port}!`);
    const res = await client.query('SELECT 1');
    console.log(`   QueryResult:`, res.rows[0]);
  } catch (e) {
    console.error(`❌ Error on port ${port}:`, e.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await check(5432);
  await check(6543);
}

main().catch(console.error);
