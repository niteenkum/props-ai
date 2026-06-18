"use server";

import { prisma } from "../utils/prisma";
import { getEmbedding } from "../utils/embeddings";

export interface SemanticEmailResult {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  summary: string;
  receivedAt: Date;
  emailType: string;
  sentiment: string | null;
  similarity: number;
}

export interface SemanticCalendarResult {
  id: string;
  title: string;
  notes: string | null;
  scheduledAt: Date;
  attendeeEmail: string | null;
  meetLink: string | null;
  gcalEventUrl: string | null;
  status: string;
  similarity: number;
}

/**
 * Server Action: Backfill embeddings for emails and calendar events
 * that don't have embeddings populated yet.
 */
export async function backfillEmbeddingsAction(): Promise<{
  success: boolean;
  emailsCount: number;
  calendarCount: number;
  error?: string;
}> {
  try {
    console.log("[Backfill] Starting embedding backfill...");

    // 1. Get emails without embeddings
    const emailsToBackfill = await prisma.$queryRaw<
      Array<{ id: string; subject: string; summary: string }>
    >`
      SELECT id, subject, summary FROM "SyncedEmail" WHERE embedding IS NULL
    `;

    console.log(`[Backfill] Found ${emailsToBackfill.length} emails to embed.`);
    let emailsCount = 0;
    for (const email of emailsToBackfill) {
      try {
        const textToEmbed = `Subject: ${email.subject}\nContent: ${email.summary}`;
        const embedding = await getEmbedding(textToEmbed);
        const vectorStr = `[${embedding.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `UPDATE "SyncedEmail" SET embedding = $1::vector WHERE id = $2`,
          vectorStr,
          email.id
        );
        emailsCount++;
      } catch (err: any) {
        console.error(`[Backfill] Failed for email ${email.id}:`, err.message);
      }
    }

    // 2. Get calendar events (FollowUps) without embeddings
    const eventsToBackfill = await prisma.$queryRaw<
      Array<{ id: string; title: string; notes: string | null }>
    >`
      SELECT id, title, notes FROM "FollowUp" WHERE embedding IS NULL
    `;

    console.log(`[Backfill] Found ${eventsToBackfill.length} calendar events to embed.`);
    let calendarCount = 0;
    for (const event of eventsToBackfill) {
      try {
        const textToEmbed = `Event: ${event.title}\nNotes: ${event.notes || ""}`;
        const embedding = await getEmbedding(textToEmbed);
        const vectorStr = `[${embedding.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `UPDATE "FollowUp" SET embedding = $1::vector WHERE id = $2`,
          vectorStr,
          event.id
        );
        calendarCount++;
      } catch (err: any) {
        console.error(`[Backfill] Failed for event ${event.id}:`, err.message);
      }
    }

    console.log(`[Backfill] Successfully backfilled ${emailsCount} emails and ${calendarCount} calendar events.`);
    return { success: true, emailsCount, calendarCount };
  } catch (err: any) {
    console.error("[Backfill] Error during backfill:", err);
    return { success: false, emailsCount: 0, calendarCount: 0, error: err.message };
  }
}

/**
 * Server Action: Fast local semantic search using cosine similarity on pgvector.
 */
export async function localSemanticSearchAction(
  query: string,
  userEmail: string,
  limit: number = 8
): Promise<{
  success: boolean;
  emails: SemanticEmailResult[];
  calendar: SemanticCalendarResult[];
  error?: string;
}> {
  if (!query.trim()) {
    return { success: true, emails: [], calendar: [] };
  }

  try {
    console.log(`[Vector Search] 🔍 Semantic search for: "${query}" (user: ${userEmail})`);
    
    // Generate query embedding
    const queryEmbedding = await getEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // Search emails (using <=> cosine distance in pgvector, similarity = 1 - distance)
    const emails = await prisma.$queryRawUnsafe<SemanticEmailResult[]>(
      `
      SELECT 
        id, 
        subject, 
        "fromName", 
        "fromEmail", 
        summary, 
        "receivedAt", 
        "emailType", 
        sentiment,
        (1 - (embedding <=> $1::vector)) as similarity
      FROM "SyncedEmail"
      WHERE "userEmail" = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      vectorStr,
      userEmail,
      limit
    );

    // Search calendar events
    const calendar = await prisma.$queryRawUnsafe<SemanticCalendarResult[]>(
      `
      SELECT 
        id, 
        title, 
        notes, 
        "scheduledAt", 
        "attendeeEmail", 
        "meetLink", 
        "gcalEventUrl", 
        status,
        (1 - (embedding <=> $1::vector)) as similarity
      FROM "FollowUp"
      WHERE "userEmail" = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      vectorStr,
      userEmail,
      limit
    );

    // Map database output (some drivers return similarity as string, so we ensure numeric type)
    const formattedEmails = emails.map(e => ({
      ...e,
      similarity: Number(e.similarity)
    }));

    const formattedCalendar = calendar.map(c => ({
      ...c,
      similarity: Number(c.similarity)
    }));

    console.log(`[Vector Search] Found ${formattedEmails.length} emails and ${formattedCalendar.length} events.`);
    return { success: true, emails: formattedEmails, calendar: formattedCalendar };
  } catch (err: any) {
    console.error("[Vector Search] Cosine similarity search failed:", err);
    return { success: false, emails: [], calendar: [], error: err.message };
  }
}
