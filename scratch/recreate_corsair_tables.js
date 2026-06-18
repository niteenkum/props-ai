/**
 * Corsair Table Recreation Script
 *
 * Drops the incorrectly structured Corsair tables and recreates them
 * with the correct columns matching what the Corsair SDK expects.
 *
 * Usage:
 *   node scratch/recreate_corsair_tables.js
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnv() {
  const envContent = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
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
if (!connectionString) {
  console.error("❌ No DATABASE_URL found in .env!");
  process.exit(1);
}

const DROP_SQL = `
-- Drop in reverse dependency order (events/entities reference accounts, accounts references integrations)
DROP TABLE IF EXISTS corsair_events;
DROP TABLE IF EXISTS corsair_entities;
DROP TABLE IF EXISTS corsair_accounts;
DROP TABLE IF EXISTS corsair_integrations;
`;

const CREATE_SQL = fs.readFileSync(
  path.join(__dirname, "../scripts/corsair-migration.sql"),
  "utf8"
);

async function main() {
  console.log("🔌 Connecting to Supabase...");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("✅ Connected!\n");

  try {
    // 1. Drop existing incorrect tables
    console.log("🗑️  Dropping existing Corsair tables...");
    await client.query(DROP_SQL);
    console.log("✅ Dropped: corsair_events, corsair_entities, corsair_accounts, corsair_integrations\n");

    // 2. Recreate with correct schema from migration SQL
    console.log("🏗️  Recreating Corsair tables with correct schema...");
    await client.query(CREATE_SQL);
    console.log("✅ Tables recreated!\n");

    // 3. Verify columns
    console.log("🔍 Verifying table columns:\n");
    const tables = ["corsair_integrations", "corsair_accounts", "corsair_entities", "corsair_events"];
    for (const table of tables) {
      const res = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      if (res.rows.length === 0) {
        console.log(`❌ Table ${table} was NOT created!`);
      } else {
        console.log(`📋 ${table}:`);
        res.rows.forEach((r) => {
          console.log(`   - ${r.column_name} (${r.data_type})${r.is_nullable === "NO" ? " NOT NULL" : ""}`);
        });
        console.log();
      }
    }

    console.log("🎉 Done! Corsair tables are now correctly set up.");
    console.log("\nNext step: Visit /api/mail/gmail/connect?email=your@email.com to connect Gmail via Corsair.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
