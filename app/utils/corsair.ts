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
import { getEmbedding } from "./embeddings";

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
  plugins: [
    gmail({
      webhookHooks: {
        messageChanged: {
          after: async (ctx, response) => {
            console.log(`[Corsair Webhook] Gmail messageChanged triggered for ${ctx.tenantId}`);
            if (!response.success || !response.data) return;
            const data = response.data as any;
            const userEmail = ctx.tenantId;
            if (!userEmail) return;

            const { prisma } = await import("./prisma");

            try {
              if (data.type === "messageReceived") {
                const message = data.message;
                if (!message?.id) return;

                const exists = await prisma.syncedEmail.findUnique({
                  where: {
                    userEmail_provider_messageId: {
                      userEmail,
                      provider: "gmail",
                      messageId: message.id,
                    },
                  },
                });

                if (!exists) {
                  const headers = (message.payload?.headers ?? []) as { name: string; value: string }[];
                  const getH = (name: string) =>
                    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

                  const fromRaw = getH("From");
                  const fromMatch = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
                  const fromName = fromMatch?.[1]?.trim() || fromRaw.split("@")[0] || "Unknown";
                  const fromEmail = fromMatch?.[2]?.trim() ?? fromRaw;
                  const subject = getH("Subject") || "(no subject)";

                  const receivedAt = message.internalDate
                    ? new Date(Number(message.internalDate))
                    : (getH("Date") ? new Date(getH("Date")) : new Date());

                  const summary = (message.snippet ?? "").slice(0, 120);

                  const { classifyEmailWithAI } = await import("../actions/mail-actions");
                  const aiResult = await classifyEmailWithAI(userEmail, subject, fromEmail, fromName, summary);

                  const created = await prisma.syncedEmail.create({
                    data: {
                      userEmail,
                      provider: "gmail",
                      messageId: message.id,
                      subject,
                      fromEmail,
                      fromName,
                      receivedAt,
                      summary,
                      isRead: !(message.labelIds ?? []).includes("UNREAD"),
                      emailType: aiResult.type,
                      aiSummary: aiResult.summary,
                      sentiment: aiResult.sentiment,
                    },
                  });
                  console.log(`[Corsair Webhook] Gmail messageReceived saved new message ${message.id} for ${userEmail}`);

                  try {
                    const textToEmbed = `Subject: ${subject}\nContent: ${summary}`;
                    const embedding = await getEmbedding(textToEmbed);
                    const vectorStr = `[${embedding.join(",")}]`;
                    await prisma.$executeRawUnsafe(
                      `UPDATE "SyncedEmail" SET embedding = $1::vector WHERE id = $2`,
                      vectorStr,
                      created.id
                    );
                    console.log(`[Corsair Webhook] Successfully generated embedding for new email ${created.id}`);
                  } catch (embedErr: any) {
                    console.error(`[Corsair Webhook] Failed to generate embedding for email ${created.id}:`, embedErr.message);
                  }
                }
              } else if (data.type === "messageDeleted") {
                const message = data.message;
                if (message?.id) {
                  await prisma.syncedEmail.deleteMany({
                    where: { userEmail, provider: "gmail", messageId: message.id },
                  });
                  console.log(`[Corsair Webhook] Gmail messageDeleted deleted message ${message.id} for ${userEmail}`);
                }
              } else if (data.type === "messageLabelChanged") {
                const message = data.message;
                if (message?.id) {
                  await prisma.syncedEmail.updateMany({
                    where: { userEmail, provider: "gmail", messageId: message.id },
                    data: {
                      isRead: !(message.labelIds ?? []).includes("UNREAD"),
                    },
                  });
                  console.log(`[Corsair Webhook] Gmail messageLabelChanged updated read status of message ${message.id} for ${userEmail}`);
                }
              }
            } catch (err: any) {
              console.error(`[Corsair Webhook] Error processing Gmail webhook:`, err);
            }
          },
        },
      },
    }),
    googlecalendar({
      webhookHooks: {
        onEventChanged: {
          after: async (ctx, response) => {
            console.log(`[Corsair Webhook] Google Calendar onEventChanged triggered for ${ctx.tenantId}`);
            if (!response.success || !response.data) return;
            const data = response.data as any;
            const userEmail = ctx.tenantId;
            if (!userEmail) return;

            const { prisma } = await import("./prisma");

            try {
              if (data.type === "eventCreated" || data.type === "eventUpdated") {
                const event = data.event;
                if (!event?.id) return;

                const startDateTime = event.start?.dateTime ?? event.start?.date;
                const endDateTime = event.end?.dateTime ?? event.end?.date;
                if (!startDateTime) return;

                let durationMinutes = 30;
                if (startDateTime && endDateTime) {
                  const diffMs = new Date(endDateTime).getTime() - new Date(startDateTime).getTime();
                  durationMinutes = Math.round(diffMs / (60 * 1000));
                }

                const meetLink = event.hangoutLink || null;
                const gcalEventUrl = event.htmlLink || null;
                const attendeeEmail = event.attendees?.find((a: any) => a.email !== userEmail)?.email || null;
                const status = event.status === "cancelled" ? "cancelled" : "pending";
                const title = event.summary || "Calendar Event";
                const notes = event.description || null;

                const existing = await prisma.followUp.findFirst({
                  where: { gcalEventId: event.id, userEmail },
                });

                if (existing) {
                  const updated = await prisma.followUp.update({
                    where: { id: existing.id },
                    data: {
                      title,
                      scheduledAt: new Date(startDateTime),
                      durationMin: durationMinutes,
                      meetLink,
                      gcalEventUrl,
                      attendeeEmail,
                      status,
                      notes,
                    },
                  });
                  console.log(`[Corsair Webhook] Google Calendar updated followUp event ${event.id} for ${userEmail}`);

                  try {
                    const textToEmbed = `Event: ${title}\nNotes: ${notes || ""}`;
                    const embedding = await getEmbedding(textToEmbed);
                    const vectorStr = `[${embedding.join(",")}]`;
                    await prisma.$executeRawUnsafe(
                      `UPDATE "FollowUp" SET embedding = $1::vector WHERE id = $2`,
                      vectorStr,
                      updated.id
                    );
                    console.log(`[Corsair Webhook] Successfully updated embedding for calendar event ${updated.id}`);
                  } catch (embedErr: any) {
                    console.error(`[Corsair Webhook] Failed to embed updated event ${updated.id}:`, embedErr.message);
                  }
                } else {
                  const created = await prisma.followUp.create({
                    data: {
                      userEmail,
                      jobId: null,
                      type: "call",
                      title,
                      scheduledAt: new Date(startDateTime),
                      durationMin: durationMinutes,
                      gcalEventId: event.id,
                      meetLink,
                      gcalEventUrl,
                      attendeeEmail,
                      status,
                      notes,
                    },
                  });
                  console.log(`[Corsair Webhook] Google Calendar created followUp event ${event.id} for ${userEmail}`);

                  try {
                    const textToEmbed = `Event: ${title}\nNotes: ${notes || ""}`;
                    const embedding = await getEmbedding(textToEmbed);
                    const vectorStr = `[${embedding.join(",")}]`;
                    await prisma.$executeRawUnsafe(
                      `UPDATE "FollowUp" SET embedding = $1::vector WHERE id = $2`,
                      vectorStr,
                      created.id
                    );
                    console.log(`[Corsair Webhook] Successfully created embedding for calendar event ${created.id}`);
                  } catch (embedErr: any) {
                    console.error(`[Corsair Webhook] Failed to embed created event ${created.id}:`, embedErr.message);
                  }
                }
              } else if (data.type === "eventDeleted") {
                if (data.eventId) {
                  const existing = await prisma.followUp.findFirst({
                    where: { gcalEventId: data.eventId, userEmail },
                  });
                  if (existing) {
                    await prisma.followUp.update({
                      where: { id: existing.id },
                      data: { status: "cancelled" },
                    });
                    console.log(`[Corsair Webhook] Google Calendar cancelled followUp event ${data.eventId} for ${userEmail}`);
                  }
                }
              }
            } catch (err: any) {
              console.error(`[Corsair Webhook] Error processing Calendar webhook:`, err);
            }
          },
        },
      },
    }),
  ],
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
