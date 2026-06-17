"use server";

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CALENDAR ACTIONS — Powered by Corsair + Google Calendar     ║
 * ║  Uses @corsair-dev/googlecalendar for Meet link generation   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Key feature: passing conferenceDataVersion: 1 to events.create
 * causes Google to auto-generate a Google Meet link → returned as
 * event.hangoutLink (e.g. meet.google.com/xxx-yyy-zzz)
 */

import { prisma } from "../utils/prisma";
import { corsair, seedCalendarCredentials, ensureCorsairReady } from "../utils/corsair";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BookCallInput = {
  jobId: string;
  title: string;
  attendeeEmail: string;
  startDateTime: string;   // ISO 8601, e.g. "2026-06-20T15:00:00+05:30"
  durationMinutes: number; // 30 | 60
  notes?: string;
  timeZone?: string;       // defaults to "Asia/Kolkata"
};

export type BookCallResult = {
  success: boolean;
  followUpId?: string;
  meetLink?: string;
  gcalEventId?: string;
  gcalEventUrl?: string;
  error?: string;
};

export type FollowUpWithJob = {
  id: string;
  userEmail: string;
  jobId: string;
  type: string;
  title: string;
  scheduledAt: string;
  durationMin: number;
  gcalEventId?: string | null;
  meetLink?: string | null;
  gcalEventUrl?: string | null;
  attendeeEmail?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  job: {
    role: string;
    company: string;
    contactEmail?: string | null;
    matchScore: number;
  };
};

// ─── Check if Calendar is Connected ──────────────────────────────────────────

export async function isCalendarConnectedAction(userEmail: string): Promise<boolean> {
  try {
    const acct = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "googlecalendar" } },
    });
    return !!acct;
  } catch {
    return false;
  }
}

// ─── Book a Call ─────────────────────────────────────────────────────────────

/** Extract Google Meet link from all possible response locations */
function extractMeetLink(event: any): string | null {
  // 1. Direct hangoutLink (Workspace accounts, some personal)
  if (event?.hangoutLink) return event.hangoutLink;

  // 2. conferenceData.entryPoints (video type)
  const entryPoints: any[] = event?.conferenceData?.entryPoints ?? [];
  const videoEntry = entryPoints.find((e: any) => e.entryPointType === "video");
  if (videoEntry?.uri) return videoEntry.uri;

  // 3. conferenceData.conferenceId → build meet.google.com URL
  const confId = event?.conferenceData?.conferenceId;
  if (confId) return `https://meet.google.com/${confId}`;

  return null;
}

export async function bookCallAction(
  userEmail: string,
  input: BookCallInput,
): Promise<BookCallResult> {
  const { jobId, title, attendeeEmail, startDateTime, durationMinutes, notes, timeZone = "Asia/Kolkata" } = input;

  try {
    // Ensure Corsair has run setupCorsair() and integration rows exist
    await ensureCorsairReady();
    // Seed credentials (idempotent)
    await seedCalendarCredentials();

    const tenant = corsair.withTenant(userEmail);

    // Calculate end time
    const startMs = new Date(startDateTime).getTime();
    const endMs   = startMs + durationMinutes * 60 * 1000;
    const endDateTime = new Date(endMs).toISOString();

    console.log(`[bookCall] Creating calendar event for ${userEmail}: "${title}" at ${startDateTime}`);

    // Create event with conferenceData to trigger Meet link generation
    // Works for both personal Gmail and Workspace accounts
    const event = await (tenant as any).googlecalendar.api.events.create({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: attendeeEmail ? "all" : "none",
      event: {
        summary:     title,
        description: notes || `ThePitchly scheduled call for: ${title}`,
        start: { dateTime: startDateTime, timeZone },
        end:   { dateTime: endDateTime,   timeZone },
        attendees:    attendeeEmail ? [{ email: attendeeEmail }] : [],
        conferenceData: {
          createRequest: {
            requestId:             `thepitchly-${jobId}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email",  minutes: 24 * 60 },
            { method: "popup",  minutes: 15 },
          ],
        },
      },
    });

    const gcalEventId  = (event as any).id        ?? null;
    const gcalEventUrl = (event as any).htmlLink   ?? null;
    let   meetLink     = extractMeetLink(event);

    console.log(`[bookCall] Event created | eventId=${gcalEventId} | meetLink=${meetLink ?? "pending"}`);

    // If no Meet link yet, Google may still be provisioning it — fetch again after 1s
    if (!meetLink && gcalEventId) {
      await new Promise(r => setTimeout(r, 1200));
      try {
        const fetched = await (tenant as any).googlecalendar.api.events.get({
          calendarId: "primary",
          id: gcalEventId,
          conferenceDataVersion: 1,
        });
        meetLink = extractMeetLink(fetched);
        console.log(`[bookCall] Re-fetched meetLink: ${meetLink}`);
      } catch { /* non-fatal */ }
    }

    // Save follow-up to DB
    const followUp = await prisma.followUp.create({
      data: {
        userEmail,
        jobId,
        type:          "call",
        title,
        scheduledAt:   new Date(startDateTime),
        durationMin:   durationMinutes,
        gcalEventId,
        meetLink,
        gcalEventUrl,
        attendeeEmail: attendeeEmail || null,
        status:        "pending",
        notes:         notes || null,
      },
    });

    return { success: true, followUpId: followUp.id, meetLink: meetLink ?? undefined, gcalEventId, gcalEventUrl };
  } catch (err: any) {
    console.error("[bookCall] Error:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Failed to book call" };
  }
}

// ─── Backfill Meet Link for existing follow-ups ───────────────────────────────
// Called when a follow-up has a gcalEventId but no meetLink stored

export async function backfillMeetLinkAction(
  userEmail: string,
  followUpId: string,
): Promise<{ meetLink: string | null }> {
  try {
    const fu = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!fu || !fu.gcalEventId || fu.meetLink) return { meetLink: fu?.meetLink ?? null };

    await ensureCorsairReady();
    await seedCalendarCredentials();
    const tenant = corsair.withTenant(userEmail);

    const event = await (tenant as any).googlecalendar.api.events.get({
      calendarId: "primary",
      id: fu.gcalEventId,
      conferenceDataVersion: 1,
    });

    const meetLink = extractMeetLink(event);
    if (meetLink) {
      await prisma.followUp.update({
        where: { id: followUpId },
        data:  { meetLink, updatedAt: new Date() },
      });
      console.log(`[backfillMeetLink] Updated follow-up ${followUpId} with meetLink: ${meetLink}`);
    }

    return { meetLink };
  } catch (err: any) {
    console.error("[backfillMeetLink] Error:", err?.message);
    return { meetLink: null };
  }
}

// ─── Get All Follow-Ups for User ─────────────────────────────────────────────

export async function getFollowUpsAction(
  userEmail: string,
  filter: "all" | "upcoming" | "overdue" | "done" = "all",
): Promise<FollowUpWithJob[]> {
  try {
    const now = new Date();
    const whereStatus =
      filter === "upcoming" ? { scheduledAt: { gte: now }, status: "pending" } :
      filter === "overdue"  ? { scheduledAt: { lt: now },  status: "pending" } :
      filter === "done"     ? { status: { in: ["done", "cancelled"] } } :
      {};

    const rows = await prisma.followUp.findMany({
      where: { userEmail, ...whereStatus },
      include: {
        jobPost: { select: { role: true, company: true, contactEmail: true, matchScore: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return rows.map(r => ({
      id:            r.id,
      userEmail:     r.userEmail,
      jobId:         r.jobId,
      type:          r.type,
      title:         r.title,
      scheduledAt:   r.scheduledAt.toISOString(),
      durationMin:   r.durationMin,
      gcalEventId:   r.gcalEventId,
      meetLink:      r.meetLink,
      gcalEventUrl:  r.gcalEventUrl,
      attendeeEmail: r.attendeeEmail,
      status:        r.status,
      notes:         r.notes,
      createdAt:     r.createdAt.toISOString(),
      job: {
        role:         r.jobPost.role,
        company:      r.jobPost.company,
        contactEmail: r.jobPost.contactEmail,
        matchScore:   r.jobPost.matchScore,
      },
    }));
  } catch (err: any) {
    console.error("[getFollowUps] Error:", err?.message);
    return [];
  }
}

// ─── Mark Follow-Up Done ─────────────────────────────────────────────────────

export async function markFollowUpDoneAction(
  userEmail: string,
  followUpId: string,
): Promise<{ success: boolean }> {
  try {
    await prisma.followUp.updateMany({
      where: { id: followUpId, userEmail },
      data:  { status: "done", updatedAt: new Date() },
    });
    return { success: true };
  } catch (err: any) {
    console.error("[markFollowUpDone] Error:", err?.message);
    return { success: false };
  }
}

// ─── Cancel Follow-Up (also deletes calendar event) ──────────────────────────

export async function cancelFollowUpAction(
  userEmail: string,
  followUpId: string,
): Promise<{ success: boolean }> {
  try {
    const fu = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!fu || fu.userEmail !== userEmail) return { success: false };

    // Delete from Google Calendar if we have the event ID
    if (fu.gcalEventId) {
      try {
        const tenant = corsair.withTenant(userEmail);
        await (tenant as any).googlecalendar.api.events.delete({
          id: fu.gcalEventId,
          calendarId: "primary",
          sendUpdates: "all",
        });
        console.log(`[cancelFollowUp] Deleted Google Calendar event ${fu.gcalEventId}`);
      } catch (calErr: any) {
        // Non-fatal — event might already be deleted
        console.warn("[cancelFollowUp] Could not delete GCal event:", calErr?.message);
      }
    }

    await prisma.followUp.updateMany({
      where: { id: followUpId, userEmail },
      data:  { status: "cancelled", updatedAt: new Date() },
    });
    return { success: true };
  } catch (err: any) {
    console.error("[cancelFollowUp] Error:", err?.message);
    return { success: false };
  }
}

// ─── Get Follow-Ups for a specific Job ───────────────────────────────────────

export async function getJobFollowUpsAction(
  userEmail: string,
  jobId: string,
): Promise<FollowUpWithJob[]> {
  try {
    const rows = await prisma.followUp.findMany({
      where: { userEmail, jobId },
      include: {
        jobPost: { select: { role: true, company: true, contactEmail: true, matchScore: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return rows.map(r => ({
      id:            r.id,
      userEmail:     r.userEmail,
      jobId:         r.jobId,
      type:          r.type,
      title:         r.title,
      scheduledAt:   r.scheduledAt.toISOString(),
      durationMin:   r.durationMin,
      gcalEventId:   r.gcalEventId,
      meetLink:      r.meetLink,
      gcalEventUrl:  r.gcalEventUrl,
      attendeeEmail: r.attendeeEmail,
      status:        r.status,
      notes:         r.notes,
      createdAt:     r.createdAt.toISOString(),
      job: {
        role:         r.jobPost.role,
        company:      r.jobPost.company,
        contactEmail: r.jobPost.contactEmail,
        matchScore:   r.jobPost.matchScore,
      },
    }));
  } catch (err: any) {
    console.error("[getJobFollowUps] Error:", err?.message);
    return [];
  }
}
