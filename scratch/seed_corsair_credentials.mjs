/**
 * Re-seed Corsair integration credentials after table recreation.
 * Runs setupCorsair() to create the corsair_integrations rows for
 * gmail + googlecalendar, then seeds client_id / client_secret.
 *
 * Usage:
 *   node --env-file=.env scratch/seed_corsair_credentials.mjs
 */

import { createCorsair } from "corsair";
import { setupCorsair } from "corsair/setup";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  multiTenancy: true,
  database: pool,
  kek: process.env.CORSAIR_KEK,
});

async function main() {
  console.log("⚙️  Running setupCorsair()...");
  const log = await setupCorsair(corsair);
  console.log("✅ Setup complete:\n", log);

  console.log("\n🔑 Seeding Gmail credentials...");
  await corsair.keys.gmail.set_client_id(process.env.GMAIL_CLIENT_ID);
  await corsair.keys.gmail.set_client_secret(process.env.GMAIL_CLIENT_SECRET);
  console.log("✅ Gmail client_id + client_secret stored!");

  console.log("\n🔑 Seeding Google Calendar credentials...");
  await corsair.keys.googlecalendar.set_client_id(process.env.GMAIL_CLIENT_ID);
  await corsair.keys.googlecalendar.set_client_secret(process.env.GMAIL_CLIENT_SECRET);
  console.log("✅ Google Calendar client_id + client_secret stored!");

  console.log("\n🎉 Corsair is fully configured and ready!\n");
}

main()
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
