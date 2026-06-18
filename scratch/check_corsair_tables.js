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

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const tables = ['corsair_accounts', 'corsair_integrations', 'corsair_entities', 'corsair_events'];
    for (const table of tables) {
      console.log(`\n📋 Columns in table: ${table}`);
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      if (res.rows.length === 0) {
        console.log(`   Table ${table} does not exist!`);
      } else {
        res.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));
      }
    }
  } finally {
    await client.end();
  }
}

main().catch(console.error);
