/**
 * Gmail OAuth Callback — via Corsair SDK
 * GET /api/mail/gmail/callback?code=...&state=...
 *
 * Corsair's processOAuthCallback() exchanges the auth code for tokens
 * and stores them encrypted in Postgres. No manual token handling needed.
 * After success, redirects to /dashboard/mail with a success flash.
 */
import { NextRequest, NextResponse } from "next/server";
import { processOAuthCallback } from "corsair/oauth";
import { corsair } from "../../../../utils/corsair";
import { prisma } from "../../../../utils/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[gmail/callback] OAuth error:", error);
    return NextResponse.redirect(new URL(`/dashboard/mail?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/mail?error=missing_params", req.url));
  }

  try {
    // Corsair verifies the HMAC state, exchanges code for tokens,
    // and stores access_token + refresh_token encrypted in its DB tables.
    const { tenantId: userEmail } = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: process.env.GMAIL_REDIRECT_URI!,
    });

    if (userEmail.startsWith("auth_pending_")) {
      const tenant = corsair.withTenant(userEmail);
      const accessToken = await (tenant.gmail.keys as any).get_access_token();
      
      let email = "";
      let name = "Google User";

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const gUser = await profileRes.json();
        email = gUser.email;
        name = gUser.name || gUser.given_name || "Google User";
      } else {
        console.warn("[gmail/callback] Userinfo failed, falling back to Gmail getProfile endpoint");
        const gmailProfileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!gmailProfileRes.ok) {
          throw new Error("Failed to fetch Google profile and Gmail user profile");
        }
        const gProfile = await gmailProfileRes.json();
        email = gProfile.emailAddress;
        name = email.split("@")[0] || "Google User";
      }

      // 1. Find or create the user in the database
      let user = await prisma.user.findUnique({ where: { email } });
      let isNew = false;
      if (!user) {
        isNew = true;
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: "google-auth-placeholder",
            role: "Developer",
            status: "ACTIVE", // Google accounts are verified and active immediately
          },
        });

        // Provision UserProfile
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            name,
            role: "Developer",
            email,
            skills: [],
            portfolioUrl: "",
            githubUrl: "",
            linkedinUrl: "",
            education: [] as any,
          },
        });
      } else if (user.status !== "ACTIVE") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE" },
        });
      }

      // 2. Rename the Corsair account to user's real email
      const gmailIntegration = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM corsair_integrations WHERE name = 'gmail'`
      );
      if (gmailIntegration.length > 0) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM corsair_accounts WHERE tenant_id = $1 AND integration_id = $2`,
          email,
          gmailIntegration[0].id
        );
      }
      await prisma.$executeRawUnsafe(
        `UPDATE corsair_accounts SET tenant_id = $1 WHERE tenant_id = $2`,
        email,
        userEmail
      );

      // 3. Upsert our own MailAccount row
      await prisma.mailAccount.upsert({
        where: { userEmail_provider: { userEmail: email, provider: "gmail" } },
        update: { accountEmail: email, updatedAt: new Date() },
        create: {
          userEmail: email,
          provider: "gmail",
          accountEmail: email,
          accessToken: "managed-by-corsair",
          refreshToken: "managed-by-corsair",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      // 4. Set session cookie and redirect to client hydration callback
      const sessionPayload = JSON.stringify({ email: user.email, status: user.status, name: user.name, role: user.role });
      const maxAge = 60 * 60 * 24 * 7; // 7 days
      const redirectUrl = new URL(
        `/auth/callback?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&status=${user.status}&role=${encodeURIComponent(user.role)}${isNew ? "&isNew=true" : ""}`,
        req.url
      );
      const redirectRes = NextResponse.redirect(redirectUrl);
      redirectRes.cookies.set("thepitchly-session", sessionPayload, {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
      return redirectRes;
    }

    console.log(`[gmail/callback] ✅ Gmail connected for ${userEmail}`);

    // Fetch the actual Gmail address connected from Google profile
    let gmailAddress = userEmail; // fallback
    try {
      const tenant = corsair.withTenant(userEmail);
      const accessToken = await (tenant.gmail.keys as any).get_access_token();
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const gUser = await profileRes.json();
        if (gUser.email) {
          gmailAddress = gUser.email;
        }
      }
    } catch (err) {
      console.warn("[gmail/callback] Failed to resolve actual Gmail address, falling back to login email:", err);
    }

    // Sync to our MailAccount table so the UI knows Gmail is connected
    // Corsair stores tokens in its own encrypted tables; we just track the email
    await prisma.mailAccount.upsert({
      where: { userEmail_provider: { userEmail, provider: "gmail" } },
      update: { accountEmail: gmailAddress, updatedAt: new Date() },
      create: {
        userEmail,
        provider:     "gmail",
        accountEmail: gmailAddress,
        accessToken:  "managed-by-corsair",  // Corsair manages tokens encrypted in DB
        refreshToken: "managed-by-corsair",
        expiresAt:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // placeholder
      },
    });

    return NextResponse.redirect(new URL("/dashboard/mail?connected=gmail", req.url));
  } catch (err: any) {
    console.error("[gmail/callback] Error:", err);
    return NextResponse.redirect(new URL(`/dashboard/mail?error=${encodeURIComponent(err.message ?? "callback_failed")}`, req.url));
  }
}
