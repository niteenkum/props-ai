/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CORSAIR SDK — Hackathon Required Integration                ║
 * ║  DO NOT replace with custom OAuth — Corsair must be used!   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Corsair handles:
 *   • Gmail OAuth connect/callback flow
 *   • Secure encrypted token storage in Postgres
 *   • Automatic token refresh
 *   • Typed Gmail API calls (messages, threads, drafts, labels)
 *
 * Usage (multi-tenant — one instance per user email):
 *   import { corsair } from "@/utils/corsair";
 *   const tenant = corsair.withTenant(userEmail);
 *   const msgs = await tenant.gmail.api.messages.list({ maxResults: 50 });
 *
 * OAuth flow:
 *   1. GET /api/mail/gmail/connect?userEmail=... → resolveConnectLink → redirect to Google
 *   2. GET /api/mail/gmail/callback?code=...&state=... → processOAuthCallback → store tokens
 */

import { createCorsair, resolveConnectLink } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { Pool } from "pg";

// Reuse the same pg Pool across hot-reloads in development
const globalForPool = global as unknown as { pgPool?: Pool };

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
  plugins: [gmail()],
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
 * Seed Gmail integration credentials (client_id, client_secret) into Corsair's DB.
 * Must be called once on app startup before any OAuth flows.
 * Corsair stores these encrypted at rest and uses them during token refresh.
 */
export async function seedGmailCredentials() {
  try {
    await corsair.keys.gmail.set_client_id(process.env.GMAIL_CLIENT_ID!);
    await corsair.keys.gmail.set_client_secret(process.env.GMAIL_CLIENT_SECRET!);
    console.log("[Corsair] Gmail integration credentials seeded ✓");
  } catch (err) {
    console.error("[Corsair] Failed to seed Gmail credentials:", err);
  }
}

export { resolveConnectLink };
export type CorsairInstance = typeof corsair;
