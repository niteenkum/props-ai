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
  console.log("🔌 Connecting to Supabase...");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // 1. Enable pgvector
    const extCheck = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
    if (extCheck.rows.length > 0) {
      console.log("✅ pgvector is already enabled!");
    } else {
      console.log("⚙️  Enabling pgvector extension...");
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      console.log("✅ pgvector enabled!");
    }

    // 2. Verify vector columns exist
    const colCheck = await client.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE udt_name = 'vector'
      ORDER BY table_name
    `);
    if (colCheck.rows.length > 0) {
      console.log("✅ Vector columns found:");
      colCheck.rows.forEach(r => console.log(`   ${r.table_name}.${r.column_name} (${r.udt_name})`));
    } else {
      console.log("⚠️  No vector columns found yet — need to run ALTER TABLE to add them");
    }

    // 3. Check tables exist
    const tables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    console.log("\n📋 Tables in public schema:");
    tables.rows.forEach(r => console.log(`   - ${r.tablename}`));

    // 4. Check SyncedEmail and FollowUp have embedding columns
    const embeddingCols = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_name IN ('SyncedEmail', 'FollowUp') AND column_name = 'embedding'
    `);
    if (embeddingCols.rows.length > 0) {
      console.log("\n✅ Embedding columns exist:");
      embeddingCols.rows.forEach(r => console.log(`   - ${r.table_name}.${r.column_name}`));
    } else {
      console.log("\n⚠️  Embedding columns missing — will need to add them");
    }

    // 5. Count rows in key tables
    const emailCount = await client.query('SELECT COUNT(*) FROM "SyncedEmail"');
    const followUpCount = await client.query('SELECT COUNT(*) FROM "FollowUp"');
    const userCount = await client.query('SELECT COUNT(*) FROM "User"');
    console.log(`\n📊 Row counts:`);
    console.log(`   User: ${userCount.rows[0].count}`);
    console.log(`   SyncedEmail: ${emailCount.rows[0].count}`);
    console.log(`   FollowUp: ${followUpCount.rows[0].count}`);

  } finally {
    await client.end();
  }
}

setup().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
