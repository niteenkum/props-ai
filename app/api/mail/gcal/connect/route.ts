/**
 * Google Calendar OAuth Connect — via Corsair SDK
 * GET /api/mail/gcal/connect?email=...
 *
 * Corsair generates the OAuth URL with calendar.events scope.
 * Reuses same Google OAuth client as Gmail (same client_id/secret).
 */
import { NextRequest, NextResponse } from "next/server";
import { generateOAuthUrl } from "corsair/oauth";
import { corsair, seedCalendarCredentials, ensureCorsairReady } from "../../../../utils/corsair";

export async function GET(req: NextRequest) {
  const email =
    req.nextUrl.searchParams.get("email") ||
    req.nextUrl.searchParams.get("userEmail");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    // Ensure corsair_integrations row exists for googlecalendar
    await ensureCorsairReady();
    // Seed credentials (idempotent)
    await seedCalendarCredentials();

    const redirectUri = process.env.GCAL_REDIRECT_URI!;
    const { url } = await generateOAuthUrl(corsair, "googlecalendar", {
      tenantId: email,
      redirectUri,
    });

    console.log(`[gcal/connect] Redirecting ${email} to Google Calendar OAuth`);
    return NextResponse.redirect(url);
  } catch (err: any) {
    console.error("[gcal/connect] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
