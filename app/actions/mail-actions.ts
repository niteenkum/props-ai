"use server";

// ─── Mail Server Actions ───────────────────────────────────────────────────
// All mail operations: account status, token refresh, read inbox, send email.
// Zoho-first implementation — provider field is extensible.

import { prisma } from "../utils/prisma";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MailAccountInfo {
  provider:     string;
  accountEmail: string;
  connected:    true;
}

export interface MailMessage {
  messageId:  string;
  subject:    string;
  fromEmail:  string;
  fromName:   string;
  receivedAt: string;   // ISO string
  summary:    string;   // first ~120 chars of snippet
  isRead:     boolean;
}

export interface SendResult {
  success: boolean;
  error?:  string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function zohoAuthBase(region: string): string {
  return `https://accounts.zoho.${region}`;
}

// ─── 1. Get linked mail account ───────────────────────────────────────────

export async function getMailAccountAction(
  userEmail: string
): Promise<MailAccountInfo | null> {
  if (!userEmail) return null;

  const account = await prisma.mailAccount.findUnique({
    where: { userEmail },
  });

  if (!account) return null;

  return {
    provider:     account.provider,
    accountEmail: account.accountEmail,
    connected:    true,
  };
}

// ─── 2. Disconnect (delete tokens) ────────────────────────────────────────

export async function disconnectMailAction(
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.mailAccount.delete({ where: { userEmail } });
    return { success: true };
  } catch {
    return { success: false, error: "Account not found or already disconnected." };
  }
}

// ─── 3. Refresh Zoho access token ─────────────────────────────────────────
// Returns the fresh access token (also updates the DB).
// Called internally by fetchInbox / sendMail when the token is expired.

export async function refreshZohoTokenAction(
  userEmail: string
): Promise<string | null> {
  const account = await prisma.mailAccount.findUnique({ where: { userEmail } });
  if (!account || account.provider !== "zoho") return null;

  const clientId     = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;

  // Derive the region-correct accounts server from the stored mail API base
  // e.g. https://mail.zoho.in → https://accounts.zoho.in
  const authBase = account.apiBase
    ? account.apiBase.replace("mail.zoho", "accounts.zoho")
    : zohoAuthBase(process.env.ZOHO_REGION || "com");

  try {
    const res = await fetch(`${authBase}/oauth/v2/token`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        refresh_token: account.refreshToken,
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    "refresh_token",
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error || !data.access_token) {
      console.error("[refreshZohoToken] Refresh failed:", data);
      return null;
    }

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await prisma.mailAccount.update({
      where:  { userEmail },
      data:   { accessToken: data.access_token, expiresAt },
    });

    return data.access_token as string;
  } catch (err) {
    console.error("[refreshZohoToken] Error:", err);
    return null;
  }
}

// ─── Internal: get a valid (possibly refreshed) access token ───────────────

async function getValidAccessToken(
  userEmail: string
): Promise<{ token: string; accountId: string | null; apiBase: string; accountEmail: string } | null> {
  const account = await prisma.mailAccount.findUnique({ where: { userEmail } });
  if (!account) return null;

  // Fall back to env region if apiBase was never stored (legacy rows)
  const apiBase = account.apiBase
    ?? `https://mail.zoho.${process.env.ZOHO_REGION || "com"}`;

  const isExpired = new Date() >= account.expiresAt;
  const token     = isExpired
    ? await refreshZohoTokenAction(userEmail)
    : account.accessToken;

  if (!token) return null;
  return { token, accountId: account.zohoAccountId, apiBase, accountEmail: account.accountEmail };
}

// ─── 4. Fetch inbox messages ──────────────────────────────────────────────

export async function fetchInboxAction(
  userEmail: string,
  limit = 20
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  const auth = await getValidAccessToken(userEmail);
  if (!auth) {
    return { success: false, error: "Mail account not connected or token expired." };
  }

  const { token, accountId, apiBase } = auth;

  // We need the Zoho accountId to call the messages API
  if (!accountId) {
    // Try to fetch it now
    try {
      const accRes = await fetch(`${apiBase}/api/accounts`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      if (accRes.ok) {
        const accData    = await accRes.json();
        const firstAcc   = accData?.data?.[0];
        const fetchedId  = firstAcc?.accountId ?? firstAcc?.accountID;
        if (fetchedId) {
          await prisma.mailAccount.update({
            where: { userEmail },
            data:  { zohoAccountId: String(fetchedId) },
          });
          // Re-run with the now-known accountId
          return fetchInboxAction(userEmail, limit);
        }
      }
    } catch { /* fall through to error */ }
    return { success: false, error: "Could not determine Zoho account ID." };
  }

  try {
    const params = new URLSearchParams({
      folderId: "INBOX",
      limit:    String(Math.min(limit, 50)),
      sortBy:   "date",
    });

    const res = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages/view?${params}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[fetchInbox] Zoho API error:", res.status, err);
      return { success: false, error: `Zoho API error (${res.status})` };
    }

    const data = await res.json();
    const raw: any[] = data?.data ?? [];

    const messages: MailMessage[] = raw.map((m: any) => ({
      messageId:  String(m.messageId   ?? m.msgId ?? ""),
      subject:    m.subject            ?? "(no subject)",
      fromEmail:  m.fromAddress        ?? m.sender ?? "",
      fromName:   m.fromDisplayString  ?? m.senderDisplayName ?? "",
      receivedAt: m.receivedTime
        ? new Date(Number(m.receivedTime)).toISOString()
        : new Date().toISOString(),
      summary:    (m.summary ?? m.content ?? "").slice(0, 120),
      isRead:     m.isRead === true || m.status === "read",
    }));

    return { success: true, messages };
  } catch (err: any) {
    console.error("[fetchInbox] Error:", err);
    return { success: false, error: err?.message ?? "Failed to fetch inbox." };
  }
}

// ─── 5. Send an email ────────────────────────────────────────────────────

export async function sendMailAction(
  userEmail:   string,
  to:          string,
  subject:     string,
  body:        string
): Promise<SendResult> {
  const auth = await getValidAccessToken(userEmail);
  if (!auth) {
    return { success: false, error: "Mail account not connected or token expired." };
  }

  const { token, accountId, apiBase, accountEmail } = auth;

  if (!accountId) {
    return { success: false, error: "Zoho account ID not available. Try reconnecting." };
  }

  try {
    const res = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: accountEmail,  // Must be the exact linked Zoho mailbox address
          toAddress:   to,
          subject,
          content:     body,
          mailFormat:  "plaintext",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendMail] Zoho send failed:", res.status, err);
      return { success: false, error: `Failed to send (Zoho ${res.status})` };
    }

    console.log(`[sendMail] ✅ Sent from ${userEmail} → ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error("[sendMail] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected send error." };
  }
}
