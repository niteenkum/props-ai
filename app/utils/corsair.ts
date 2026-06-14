/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CORSAIR SDK — Hackathon Required Integration                ║
 * ║  DO NOT replace with custom OAuth — Corsair must be used!   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Corsair handles:
 *   • Gmail + Google Calendar OAuth connect/callback flows
 *   • Secure encrypted token storage in Postgres
 *   • Automatic token refresh
 *   • Typed Gmail API calls (messages, threads, drafts, labels)
 *   • Typed Google Calendar API calls (events.create, hangoutLink for Meet)
 *
 * Usage (multi-tenant — one instance per user email):
 *   import { corsair } from "@/utils/corsair";
 *   const tenant = corsair.withTenant(userEmail);
 *   // Gmail
 *   const msgs = await tenant.gmail.api.messages.list({ maxResults: 50 });
 *   // Google Calendar
 *   const event = await tenant.googlecalendar.api.events.create({ ... conferenceDataVersion: 1 });
 *   const meetLink = event.hangoutLink; // meet.google.com/xxx-yyy-zzz
 *
 * OAuth flows:
 *   Gmail:    GET /api/mail/gmail/connect → /api/mail/gmail/callback
 *   Calendar: GET /api/mail/gcal/connect  → /api/mail/gcal/callback
 *
 * IMPORTANT: setupCorsair() must run before corsair.keys.*.set_*() can work.
 *   setupCorsair() creates the corsair_integrations row for each plugin.
 *   We call it lazily in ensureCorsairReady() which is called by all seed functions.
 */

import { createCorsair, resolveConnectLink } from "corsair";
import { setupCorsair } from "corsair/setup";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { Pool } from "pg";

// Reuse the same pg Pool across hot-reloads in development
const globalForPool = global as unknown as { pgPool?: Pool; corsairReady?: boolean };

if (!globalForPool.pgPool) {
  globalForPool.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
}

const pool = globalForPool.pgPool;

/**
 * The Corsair instance — self-hosted, multi-tenant, backed by our Postgres DB.
 *
 * CORSAIR_KEK: Key Encryption Key — a random 32-char secret that
 * Corsair uses to encrypt OAuth tokens at rest in the database.
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  multiTenancy: true,
  database: pool,   // Corsair accepts a pg.Pool directly
  kek: process.env.CORSAIR_KEK!,
  // Connect config: where to redirect after OAuth (used by resolveConnectLink)
  connect: {
    baseUrl:     process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    redirectUri: process.env.GMAIL_REDIRECT_URI!,
  },
});

/**
 * Ensures Corsair has run setupCorsair() at least once.
 *
 * setupCorsair() creates `corsair_integrations` rows for every plugin
 * (gmail + googlecalendar). Without it, corsair.keys.*.set_* throws
 * "Integration not found".
 *
 * We guard with a process-level flag so we only run it once per server restart.
 */
let _setupPromise: Promise<void> | null = null;

export async function ensureCorsairReady(): Promise<void> {
  if (globalForPool.corsairReady) return;

  if (!_setupPromise) {
    _setupPromise = (async () => {
      try {
        const log = await setupCorsair(corsair);
        console.log("[Corsair] setupCorsair() complete:\n", log);
        globalForPool.corsairReady = true;
      } catch (err) {
        console.error("[Corsair] setupCorsair() failed:", err);
        _setupPromise = null; // allow retry
        throw err;
      }
    })();
  }

  return _setupPromise;
}

/**
 * Seed Gmail integration credentials (client_id, client_secret) into Corsair's DB.
 * Must be called once on app startup before any OAuth flows.
 * Automatically calls setupCorsair() first to ensure the integration row exists.
 */
export async function seedGmailCredentials() {
  try {
    await ensureCorsairReady();
    await corsair.keys.gmail.set_client_id(process.env.GMAIL_CLIENT_ID!);
    await corsair.keys.gmail.set_client_secret(process.env.GMAIL_CLIENT_SECRET!);
    console.log("[Corsair] Gmail integration credentials seeded ✓");
  } catch (err) {
    console.error("[Corsair] Failed to seed Gmail credentials:", err);
  }
}

/**
 * Seed Google Calendar credentials — reuses same OAuth client as Gmail
 * (same client_id + client_secret, just a different redirect URI + scopes).
 * Automatically calls setupCorsair() first to ensure the integration row exists.
 */
export async function seedCalendarCredentials() {
  try {
    await ensureCorsairReady();
    await corsair.keys.googlecalendar.set_client_id(process.env.GMAIL_CLIENT_ID!);
    await corsair.keys.googlecalendar.set_client_secret(process.env.GMAIL_CLIENT_SECRET!);
    console.log("[Corsair] Google Calendar credentials seeded ✓");
  } catch (err) {
    console.error("[Corsair] Failed to seed Calendar credentials:", err);
    throw err; // re-throw so connect route shows proper error
  }
}

export { resolveConnectLink };
export type CorsairInstance = typeof corsair;
