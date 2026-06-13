"use server";

// ─── Mail Server Actions ───────────────────────────────────────────────────
// All mail operations: account status, token refresh, read inbox, send email.
// Zoho-first implementation — provider field is extensible.

import { prisma } from "../utils/prisma";
import { Pool } from "pg";

// ─── Raw pg fallback for SentEmail ───────────────────────────────────────────
// Next.js bundles server actions, so a stale PrismaClient (without SentEmail)
// can persist even after `prisma generate`. We bypass Prisma entirely here and
// talk to Postgres directly via `pg` Pool — no bundle-cache issues.

function rawPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL! });
}

async function rawInsertSentEmail(data: {
  userEmail:  string;
  jobPostId:  string | null;
  provider:   string;
  fromEmail:  string;
  toEmail:    string;
  subject:    string;
  body:       string;
  zohoMsgId:  string | null;
}): Promise<{ id: string; sentAt: string }> {
  const pool = rawPool();
  try {
    const res = await pool.query<{ id: string; sent_at: Date }>(
      `INSERT INTO "SentEmail"
         (id, "userEmail", "jobPostId", provider, "fromEmail", "toEmail", subject, body, "zohoMsgId", "sentAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, "sentAt" AS sent_at`,
      [
        data.userEmail, data.jobPostId, data.provider,
        data.fromEmail, data.toEmail,   data.subject,
        data.body,      data.zohoMsgId,
      ],
    );
    const row = res.rows[0];
    console.log(`[rawInsertSentEmail] ✅ id=${row.id}`);
    return { id: row.id, sentAt: row.sent_at.toISOString() };
  } finally {
    await pool.end();
  }
}

async function rawSelectSentEmails(jobPostId: string): Promise<SentEmailRecord[]> {
  const pool = rawPool();
  try {
    const res = await pool.query<{
      id: string; provider: string; from_email: string;
      to_email: string; subject: string; body: string;
      zoho_msg_id: string | null; sent_at: Date;
    }>(
      `SELECT id, provider,
              "fromEmail"  AS from_email,
              "toEmail"    AS to_email,
              subject, body,
              "zohoMsgId"  AS zoho_msg_id,
              "sentAt"     AS sent_at
       FROM   "SentEmail"
       WHERE  "jobPostId" = $1
       ORDER  BY "sentAt" DESC`,
      [jobPostId],
    );
    return res.rows.map(r => ({
      id:        r.id,
      provider:  r.provider,
      fromEmail: r.from_email,
      toEmail:   r.to_email,
      subject:   r.subject,
      body:      r.body,
      zohoMsgId: r.zoho_msg_id ?? undefined,
      sentAt:    r.sent_at.toISOString(),
    }));
  } finally {
    await pool.end();
  }
}

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
  provider:   "zoho" | "gmail"; // which account this message came from
}

export interface SendResult {
  success:    boolean;
  error?:     string;
  zohoMsgId?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function zohoAuthBase(region: string): string {
  return `https://accounts.zoho.${region}`;
}

// ─── 1. Get all linked mail accounts ──────────────────────────────────────

/** Returns ALL mail accounts linked for a user (Zoho + Gmail combined). */
export async function getMailAccountsAction(
  userEmail: string
): Promise<MailAccountInfo[]> {
  if (!userEmail) return [];

  const accounts = await prisma.mailAccount.findMany({
    where: { userEmail },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map(a => ({
    provider:     a.provider,
    accountEmail: a.accountEmail,
    connected:    true as const,
  }));
}

/** Legacy single-account getter — returns first linked account (for backward compat). */
export async function getMailAccountAction(
  userEmail: string
): Promise<MailAccountInfo | null> {
  const all = await getMailAccountsAction(userEmail);
  return all[0] ?? null;
}

// ─── 2. Disconnect (delete tokens for a specific provider) ────────────────

export async function disconnectMailAction(
  userEmail: string,
  provider: "zoho" | "gmail" = "zoho",
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.mailAccount.delete({
      where: { userEmail_provider: { userEmail, provider } },
    });
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
  const account = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "zoho" } },
  });
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
      where:  { userEmail_provider: { userEmail, provider: "zoho" } },
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
  const account = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "zoho" } },
  });
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
// NOTE: The /folders API requires ZohoMail.folders.READ scope (not granted).
// /messages/view with NO folderId returns all recent mail — this works fine.

export async function fetchInboxAction(
  userEmail: string,
  limit = 20
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  console.log(`\n[fetchInbox] 🚀 CALLED for ${userEmail}, limit=${limit}`);
  const auth = await getValidAccessToken(userEmail);
  if (!auth) {
    console.error("[fetchInbox] ❌ No valid token");
    return { success: false, error: "Mail account not connected or token expired." };
  }

  const { token, accountId, apiBase } = auth;
  console.log(`[fetchInbox] ✅ Token OK | accountId=${accountId} | apiBase=${apiBase}`);

  // Ensure we have the accountId
  let activeAccountId = accountId;
  if (!activeAccountId) {
    try {
      const accRes = await fetch(`${apiBase}/api/accounts`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      if (accRes.ok) {
        const accData   = await accRes.json();
        const firstAcc  = accData?.data?.[0];
        activeAccountId = String(firstAcc?.accountId ?? firstAcc?.accountID ?? "");
        if (activeAccountId) {
          await prisma.mailAccount.update({
            where: { userEmail },
            data:  { zohoAccountId: activeAccountId },
          });
          console.log(`[fetchInbox] ✅ Resolved accountId: ${activeAccountId}`);
        }
      }
    } catch { /* proceed */ }
  }

  if (!activeAccountId) {
    console.error("[fetchInbox] ❌ Cannot resolve Zoho account ID");
    return { success: false, error: "Could not determine Zoho account ID." };
  }

  try {
    // Call messages/view WITHOUT folderId — returns all recent mail (200 OK)
    const params = new URLSearchParams({
      limit:  String(Math.min(limit, 200)),
      sortBy: "date",
    });
    const url = `${apiBase}/api/accounts/${activeAccountId}/messages/view?${params}`;
    console.log(`[fetchInbox] 📡 GET ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    const bodyText = await res.text();
    console.log(`[fetchInbox] Response status: ${res.status}`);

    if (!res.ok) {
      console.error(`[fetchInbox] ❌ Zoho error (${res.status}):`, bodyText.slice(0, 400));
      return { success: false, error: `Zoho API error (${res.status})` };
    }

    const data = JSON.parse(bodyText);
    const raw: any[] = data?.data ?? [];
    console.log(`[fetchInbox] ✅ Got ${raw.length} messages from Zoho`);

    const messages: MailMessage[] = raw.map((m: any) => ({
      messageId:  String(m.messageId   ?? m.msgId ?? ""),
      subject:    m.subject            ?? "(no subject)",
      fromEmail:  m.fromAddress        ?? m.sender ?? "",
      fromName:   m.fromDisplayString  ?? m.senderDisplayName ?? m.sender ?? "",
      receivedAt: m.receivedTime
        ? new Date(Number(m.receivedTime)).toISOString()
        : new Date().toISOString(),
      summary:    (m.summary ?? m.content ?? "").slice(0, 120),
      isRead:     m.isRead === true || m.status === "0" || m.status === "read",
      provider:   "zoho" as const,
    }));

    return { success: true, messages };
  } catch (err: any) {
    console.error("[fetchInbox] ❌ Exception:", err);
    return { success: false, error: err?.message ?? "Failed to fetch inbox." };
  }
}

// ─── 4b. Fetch Gmail inbox via Corsair SDK ───────────────────────────────────

export async function fetchGmailInboxAction(
  userEmail: string,
  limit = 20
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  const account = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "gmail" } },
  });
  if (!account) return { success: false, error: "Gmail account not connected." };

  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);

    // Corsair handles auth/token refresh automatically
    const listRes = await tenant.gmail.api.messages.list({
      maxResults: Math.min(limit, 100),
      labelIds:   ["INBOX"],
    }) as any;

    const msgIds: string[] = (listRes.messages ?? []).map((m: any) => m.id).filter(Boolean);
    if (msgIds.length === 0) return { success: true, messages: [] };

    // Fetch metadata for each message (parallel)
    const messages: MailMessage[] = [];
    await Promise.all(
      msgIds.map(async (id) => {
        try {
          const meta = await tenant.gmail.api.messages.get({
            id,
            format: "full",   // "metadata" wasn't returning payload.headers via Corsair
          }) as any;

          // Headers are in payload.headers with format:full
          const headers = (meta?.payload?.headers ?? []) as { name: string; value: string }[];
          const getH = (name: string) =>
            headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

          const fromRaw   = getH("From");
          const fromMatch = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
          const fromName  = fromMatch?.[1]?.trim() || fromRaw.split("@")[0];
          const fromEmail = fromMatch?.[2]?.trim() ?? fromRaw;
          const subject   = getH("Subject");

          // internalDate is Unix ms timestamp — more reliable than Date header
          const receivedAt = meta?.internalDate
            ? new Date(Number(meta.internalDate)).toISOString()
            : (getH("Date") ? new Date(getH("Date")).toISOString() : new Date().toISOString());

          messages.push({
            messageId:  id,
            subject:    subject || "(no subject)",
            fromEmail,
            fromName,
            receivedAt,
            summary:    (meta.snippet ?? "").slice(0, 120),
            isRead:     !(meta.labelIds ?? []).includes("UNREAD"),
            provider:   "gmail" as const,
          });
        } catch { /* skip failed message */ }
      })
    );

    messages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    console.log(`[fetchGmailInbox] ✅ Got ${messages.length} messages from Gmail via Corsair`);
    return { success: true, messages };
  } catch (err: any) {
    console.error("[fetchGmailInbox] Exception:", err);
    return { success: false, error: err?.message ?? "Failed to fetch Gmail inbox." };
  }
}

// ─── 4c. Unified inbox — Zoho + Gmail combined ────────────────────────────────

export async function fetchUnifiedInboxAction(
  userEmail: string,
  limit = 30
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  const perProvider = Math.ceil(limit / 2);

  const [zohoResult, gmailResult] = await Promise.allSettled([
    fetchInboxAction(userEmail, perProvider),
    fetchGmailInboxAction(userEmail, perProvider),
  ]);

  const all: MailMessage[] = [];

  if (zohoResult.status === "fulfilled" && zohoResult.value.success) {
    all.push(...(zohoResult.value.messages ?? []));
  }
  if (gmailResult.status === "fulfilled" && gmailResult.value.success) {
    all.push(...(gmailResult.value.messages ?? []));
  }

  if (all.length === 0) {
    const zohoErr  = zohoResult.status  === "fulfilled" ? zohoResult.value.error  : "Zoho fetch failed";
    const gmailErr = gmailResult.status === "fulfilled" ? gmailResult.value.error : "Gmail fetch failed";
    return { success: false, error: [zohoErr, gmailErr].filter(Boolean).join(" | ") };
  }

  // Sort combined feed newest first
  all.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  return { success: true, messages: all.slice(0, limit) };
}

// ─── 4d. Fetch a Gmail thread (click-to-open) ────────────────────────────────
// Fetches the full thread for a clicked Gmail message.
// Returns ThreadMessage[] in the same shape as the Zoho thread action.

export async function fetchGmailThreadAction(
  userEmail:  string,
  messageId:  string,   // Gmail message ID (e.g. "19e95b7b3648b5cc")
): Promise<{ success: boolean; messages?: ThreadMessage[]; error?: string; threadId?: string }> {
  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);

    // 1. Get the threadId for this message via Corsair SDK
    // Use format:full — Corsair doesn't pass metadataHeaders correctly to Gmail API
    const msgData  = await tenant.gmail.api.messages.get({
      id: messageId,
      format: "full",
    }) as any;

    const threadId = msgData.threadId as string;

    // 2. Fetch the full thread via Corsair SDK
    const threadData = await tenant.gmail.api.threads.get({
      id: threadId,
      format: "full",
    }) as any;
    const rawMsgs: any[] = (threadData as any).messages ?? [];

    // 3. Get the linked Gmail account email (to determine sent vs received)
    const account = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "gmail" } },
    });
    const myEmail = (account?.accountEmail ?? userEmail).toLowerCase();

    // Helper: decode base64url Gmail body
    function decodeBody(part: any): string {
      if (!part) return "";
      if (part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      if (part.parts) {
        // Prefer text/plain, then text/html
        const plain = part.parts.find((p: any) => p.mimeType === "text/plain");
        const html  = part.parts.find((p: any) => p.mimeType === "text/html");
        if (plain?.body?.data) return Buffer.from(plain.body.data, "base64").toString("utf-8");
        if (html?.body?.data)  return decodeHtml(Buffer.from(html.body.data, "base64").toString("utf-8"));
      }
      return "";
    }

    function decodeHtml(html: string): string {
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    // Strip quoted reply sections
    function stripQuotes(text: string): string {
      const patterns = [
        /\n?\s*On\s+.{10,80}\s+wrote:\s*\n?[\s\S]*/i,
        /\n?\s*-{3,}\s*Original Message\s*-{3,}\s*\n?[\s\S]*/i,
        /\n?\s*From:\s+.+\n\s*Sent:\s+.+\n[\s\S]*/i,
        /\n?\s*_{3,}\s*\n[\s\S]*/,
      ];
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m.index !== undefined) {
          const before = text.slice(0, m.index).trim();
          if (before.length > 0) return before;
        }
      }
      return text;
    }

    // 4. Build ThreadMessage[] from raw Gmail messages
    const messages: ThreadMessage[] = rawMsgs.map((m: any) => {
      const headers = (m.payload?.headers ?? []) as { name: string; value: string }[];
      const getH    = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

      const fromRaw   = getH("From");
      const fromMatch = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
      const fromName  = fromMatch?.[1]?.trim() ?? fromRaw;
      const fromEmail = fromMatch?.[2]?.trim() ?? fromRaw;
      const toEmail   = getH("To");
      const subject   = getH("Subject") || "(no subject)";
      const dateStr   = getH("Date");
      // RFC 2822 Message-ID — needed for proper In-Reply-To threading
      const rfc822MsgId = getH("Message-ID") || getH("Message-Id");

      // isSent: check From header match OR Gmail's SENT label (handles edge cases)
      const labelIds  = (m.labelIds ?? []) as string[];
      const isSent    = fromEmail.toLowerCase() === myEmail
                        || labelIds.includes("SENT");
      const rawBody   = decodeBody(m.payload);
      const body      = stripQuotes(rawBody || m.snippet || "");

      return {
        id:           m.id,
        direction:    isSent ? "sent" : "received",
        fromEmail,
        fromName,
        toEmail,
        subject,
        body,
        sentAt:       dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        zohoMsgId:    m.id,       // Gmail message ID (for identifying messages)
        rfc822MsgId,              // RFC 2822 Message-ID (for threading In-Reply-To)
        gmailThreadId: threadId,  // Gmail thread ID (for messages.send threadId param)
      } as ThreadMessage;
    });

    // Sort oldest first (thread order)
    messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    console.log(`[fetchGmailThreadAction] ✅ Got ${messages.length} thread messages via Corsair (threadId: ${threadId})`);
    return { success: true, messages, threadId };  // return threadId so UI can use it for send
  } catch (err: any) {
    console.error("[fetchGmailThreadAction] Error:", err);
    return { success: false, error: err?.message ?? "Failed to fetch Gmail thread." };
  }
}



// ─── 5. Send an email ────────────────────────────────────────────────────────
// Optional `attachment` attaches a file (e.g. resume PDF) via multipart/form-data.

export interface MailAttachment {
  base64:    string;   // base64-encoded file content
  filename:  string;   // e.g. "Resume_NiteenKumar.pdf"
  mimeType:  string;   // e.g. "application/pdf"
}

export async function sendMailAction(
  userEmail:   string,
  to:          string,
  subject:     string,
  body:        string,
  attachment?: MailAttachment,
  cc?:         string,
  bcc?:        string,
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
    let res: Response;

    if (attachment) {
      // ── Step 1: Upload the attachment to Zoho ──────────────────────────────
      const uploadForm = new FormData();
      const binary  = Buffer.from(attachment.base64, "base64");
      const blob    = new Blob([binary], { type: attachment.mimeType });
      uploadForm.append("attach", blob, attachment.filename);

      const uploadRes = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages/attachments?uploadType=multipart`,
        {
          method:  "POST",
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
          body:    uploadForm,
        }
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        console.error("[sendMail] Zoho upload failed:", uploadRes.status, err);
        return { success: false, error: `Failed to upload attachment (Zoho ${uploadRes.status})` };
      }

      const uploadData   = await uploadRes.json();
      // Zoho returns data as an array ([{ storeName, attachmentName, attachmentPath }])
      const rawData      = uploadData?.data;
      const uploadedFile = Array.isArray(rawData) ? rawData[0] : rawData;
      if (!uploadedFile?.storeName) {
        console.error("[sendMail] Zoho upload response missing storeName:", uploadData);
        return { success: false, error: "Attachment upload succeeded but returned no file reference." };
      }

      // ── Step 2: Send the email with the uploaded attachment reference ───────
      res = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromAddress: accountEmail,
            toAddress:   to,
            ccAddress:   cc || undefined,
            bccAddress:  bcc || undefined,
            subject,
            content:     body,
            mailFormat:  "plaintext",
            attachments: [
              {
                storeName:      uploadedFile.storeName,
                attachmentName: uploadedFile.attachmentName,
                attachmentPath: uploadedFile.attachmentPath,
              },
            ],
          }),
        }
      );
    } else {
      // ── Plain JSON send (no attachment) ─────────────────────────────────────
      res = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromAddress: accountEmail,
            toAddress:   to,
            ccAddress:   cc || undefined,
            bccAddress:  bcc || undefined,
            subject,
            content:     body,
            mailFormat:  "plaintext",
          }),
        }
      );
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendMail] Zoho send failed:", res.status, err);
      return { success: false, error: `Failed to send (Zoho ${res.status})` };
    }

    const resData   = await res.json().catch(() => ({}));
    const zohoMsgId = String(resData?.data?.messageId ?? resData?.messageId ?? "") || undefined;

    console.log(`[sendMail] ✅ Sent from ${userEmail} → ${to}${cc ? ` (CC: ${cc})` : ""}${bcc ? ` (BCC: ${bcc})` : ""}${attachment ? " 📎 +attachment" : ""} (msgId: ${zohoMsgId ?? "n/a"})`);
    return { success: true, zohoMsgId };
  } catch (err: any) {
    console.error("[sendMail] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected send error." };
  }
}


// ─── 6. Send email linked to a job post ──────────────────────────────────────
// Wraps sendMailAction: also persists a SentEmail record and flips job status → Sent.

export interface SentEmailRecord {
  id:         string;
  provider:   string;
  fromEmail:  string;
  toEmail:    string;
  subject:    string;
  body:       string;
  zohoMsgId?: string | null;
  sentAt:     string;  // ISO string
}

export async function sendJobEmailAction(
  userEmail:     string,
  jobPostId:     string,
  to:            string,
  subject:       string,
  body:          string,
  attachResume?: boolean,
  cc?:           string,
  bcc?:          string,
): Promise<{ success: boolean; error?: string; zohoMsgId?: string; sentAt?: string }> {
  // 1. Optionally load user's resume PDF from DB
  let attachment: MailAttachment | undefined;
  if (attachResume) {
    const pool = rawPool();
    try {
      const r = await pool.query<{ resume_pdf_base64: string | null; resume_file_name: string | null }>(
        // Join via User table — UserProfile.email ≠ login email
        `SELECT up."resumePdfBase64" AS resume_pdf_base64,
                up."resumeFileName"  AS resume_file_name
         FROM   "UserProfile" up
         JOIN   "User" u ON u.id = up."userId"
         WHERE  u.email = $1
         LIMIT  1`,
        [userEmail],
      );
      const row = r.rows[0];
      if (row?.resume_pdf_base64) {
        attachment = {
          base64:   row.resume_pdf_base64,
          filename: row.resume_file_name ?? "Resume.pdf",
          mimeType: "application/pdf",
        };
        console.log(`[sendJobEmail] 📎 Attaching resume: ${attachment.filename}`);
      } else {
        console.warn(`[sendJobEmail] attachResume=true but no PDF found for ${userEmail}`);
      }
    } finally {
      await pool.end();
    }
  }

  // 2. Send via Zoho (with or without attachment)
  const result = await sendMailAction(userEmail, to, subject, body, attachment, cc, bcc);
  if (!result.success) return result;

  // 3. Get sender address (Zoho account)
  const account   = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "zoho" } },
  });
  const fromEmail = account?.accountEmail ?? userEmail;

  // 4. Save SentEmail via raw pg (bypasses stale Next.js-bundled Prisma client)
  const recipientToEmail = to + (cc ? `, cc: ${cc}` : "") + (bcc ? `, bcc: ${bcc}` : "");
  const sent = await rawInsertSentEmail({
    userEmail,
    jobPostId,
    provider:  account?.provider ?? "zoho",
    fromEmail,
    toEmail:   recipientToEmail,
    subject,
    body,
    zohoMsgId: result.zohoMsgId ?? null,
  });

  // 5. Check existing sent email count — if this is the first send, sync contactEmail
  const existingSentCount = await prisma.sentEmail.count({ where: { jobPostId } }).catch(() => 1);
  const isFirstSend = existingSentCount <= 1; // ≤1 because we just inserted above

  // 6. Update job status → Sent; also update contactEmail if changed or blank (first send only)
  const currentJob = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    select: { contactEmail: true },
  });

  const shouldUpdateEmail =
    isFirstSend &&
    to.trim() !== "" &&
    (currentJob?.contactEmail !== to.trim());

  await prisma.jobPost.update({
    where: { id: jobPostId },
    data:  {
      status: "Sent",
      ...(shouldUpdateEmail ? { contactEmail: to.trim() } : {}),
    },
  });

  if (shouldUpdateEmail) {
    console.log(`[sendJobEmail] 📧 Updated job contactEmail → ${to.trim()}`);
  }

  return { success: true, zohoMsgId: result.zohoMsgId, sentAt: sent.sentAt };
}

// ─── 7. Get sent email history for a job ────────────────────────────────────────────

export async function getSentEmailsForJobAction(
  jobPostId: string
): Promise<SentEmailRecord[]> {
  return rawSelectSentEmails(jobPostId);
}

// ─── 7b. Unified email thread (sent + received) for a job ────────────────────
// Merges local SentEmail records with messages fetched from Zoho's mailbox
// that share the same thread (searched by subject line).

export interface ThreadMessage {
  id:             string;
  direction:      "sent" | "received";
  fromEmail:      string;
  fromName?:      string;
  toEmail:        string;
  subject:        string;
  body:           string;
  sentAt:         string;  // ISO string
  zohoMsgId?:     string;
  rfc822MsgId?:   string;  // RFC 2822 Message-ID header (for In-Reply-To when replying)
  gmailThreadId?: string;  // Gmail thread ID (different from message ID)
}

export async function getEmailThreadForJobAction(
  userEmail: string,
  jobPostId: string,
): Promise<{ messages: ThreadMessage[]; error?: string }> {
  // 1. Load local sent emails for this job
  const sentRows = await rawSelectSentEmails(jobPostId);
  if (sentRows.length === 0) {
    return { messages: [] };
  }

  // Convert sent rows → ThreadMessage[]
  const sentMessages: ThreadMessage[] = sentRows.map(r => ({
    id:        r.id,
    direction: "sent" as const,
    fromEmail: r.fromEmail,
    toEmail:   r.toEmail,
    subject:   r.subject,
    body:      r.body,
    sentAt:    r.sentAt,
    zohoMsgId: r.zohoMsgId ?? undefined,
  }));

  // 2. Try to fetch received replies from Zoho
  const auth = await getValidAccessToken(userEmail);
  if (!auth || !auth.accountId) {
    // Can't reach Zoho — return only local sent emails
    return { messages: sentMessages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) };
  }

  const { token, accountId, apiBase, accountEmail } = auth;

  try {
    // Use the subject of the first (oldest) sent email to search for the thread
    const baseSubject = sentRows[sentRows.length - 1].subject
      .replace(/^(Re:\s*)+/i, "")
      .trim();

    // Also extract the recipient email (the person we sent to)
    const recipientEmail = sentRows[sentRows.length - 1].toEmail
      .split(",")[0]  // handle "to, cc: xyz" format
      .replace(/cc:.*|bcc:.*/gi, "")
      .trim();

    console.log(`[getEmailThread] 🔍 Searching Zoho for thread:`);
    console.log(`  baseSubject: "${baseSubject}"`);
    console.log(`  recipientEmail: "${recipientEmail}"`);
    console.log(`  accountEmail: "${accountEmail}"`);
    console.log(`  apiBase: "${apiBase}"`);
    console.log(`  accountId: "${accountId}"`);

    // Strategy 1: Search by subject
    // Strategy 2 (fallback): Search by sender (the person who'd reply)
    let rawMessages: any[] = [];

    // Try subject-based search first
    const searchKey = `subject:"${baseSubject}"`;
    const params = new URLSearchParams({
      searchKey,
      limit:  "50",
    });

    console.log(`[getEmailThread] 📡 Zoho search URL: ${apiBase}/api/accounts/${accountId}/messages/search?${params}`);

    const searchRes = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages/search?${params}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      rawMessages = searchData?.data ?? [];
      console.log(`[getEmailThread] ✅ Subject search returned ${rawMessages.length} messages`);
      if (rawMessages.length > 0) {
        rawMessages.forEach((m: any, i: number) => {
          console.log(`  [${i}] msgId=${m.messageId} from=${m.fromAddress ?? m.sender} subject="${m.subject}" folderId=${m.folderId}`);
        });
      }
    } else {
      const errText = await searchRes.text();
      console.warn(`[getEmailThread] ⚠️ Subject search failed: ${searchRes.status} — ${errText}`);
    }

    // Fallback: if no messages found via subject, search by sender (the person who'd reply to us)
    if (rawMessages.length === 0 && recipientEmail) {
      console.log(`[getEmailThread] 🔄 Fallback: searching by sender "${recipientEmail}"`);
      const fallbackKey = `from:${recipientEmail}`;
      const fallbackParams = new URLSearchParams({
        searchKey: fallbackKey,
        limit: "20",
      });

      const fallbackRes = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages/search?${fallbackParams}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const fallbackMsgs: any[] = fallbackData?.data ?? [];
        console.log(`[getEmailThread] ✅ Sender search returned ${fallbackMsgs.length} messages`);
        // Filter to only messages whose subject matches (contains the base subject)
        const subjectLower = baseSubject.toLowerCase();
        rawMessages = fallbackMsgs.filter((m: any) => {
          const s = (m.subject ?? "").toLowerCase().replace(/^re:\s*/i, "");
          return s.includes(subjectLower) || subjectLower.includes(s);
        });
        console.log(`[getEmailThread]   After subject filtering: ${rawMessages.length} messages`);
      } else {
        console.warn(`[getEmailThread] ⚠️ Sender search also failed: ${fallbackRes.status}`);
      }
    }

    // 3. Build a set of Zoho message IDs we already have as sent records
    const sentZohoIds = new Set(sentRows.filter(r => r.zohoMsgId).map(r => r.zohoMsgId!));
    // Also filter by sender — if fromAddress is our own account, it's a sent message (we already have it)
    const accountEmailLower = accountEmail.toLowerCase();

    console.log(`[getEmailThread] 🧹 Filtering: sentZohoIds=${[...sentZohoIds].join(",")} | accountEmail=${accountEmailLower}`);

    // 4. Filter to only received (incoming) messages — skip our own sent messages
    const receivedRaw = rawMessages.filter((m: any) => {
      const msgId = String(m.messageId ?? m.msgId ?? "");
      // Skip if it's one of our sent emails
      if (sentZohoIds.has(msgId)) {
        console.log(`[getEmailThread]   Skipping ${msgId} — already in sentZohoIds`);
        return false;
      }
      // Skip if the sender is us (sent folder copy)
      const from = (m.fromAddress ?? m.sender ?? "").toLowerCase();
      if (from.includes(accountEmailLower)) {
        console.log(`[getEmailThread]   Skipping ${msgId} — sender is us (${from})`);
        return false;
      }
      console.log(`[getEmailThread]   ✅ Keeping received message ${msgId} from ${from}`);
      return true;
    });

    console.log(`[getEmailThread] 📬 ${receivedRaw.length} received messages to fetch content for`);

    // 5. Fetch content for each received message
    const receivedMessages: ThreadMessage[] = [];

    for (const m of receivedRaw) {
      const msgId   = String(m.messageId ?? m.msgId ?? "");
      const folderId = String(m.folderId ?? "");
      let body = m.summary ?? m.content ?? "";

      // Try to fetch the full content if we have folderId
      if (folderId && msgId) {
        try {
          const contentRes = await fetch(
            `${apiBase}/api/accounts/${accountId}/folders/${folderId}/messages/${msgId}/content?includeBlockContent=false`,
            { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
          );
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            // Zoho returns HTML content — strip tags for plaintext display
            const htmlContent = contentData?.data?.content ?? "";
            body = htmlContent
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<\/div>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/&lt;/gi, "<")
              .replace(/&gt;/gi, ">")
              .replace(/&quot;/gi, '"')
              .replace(/&#39;/gi, "'")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            // Strip quoted reply content (e.g. "On Sun, 7 Jun 2026 at 00:34, <x@y.com> wrote:")
            // Common patterns:
            //   "On [date], [name/email] wrote:"
            //   "-----Original Message-----"
            //   "> quoted lines"
            const quotePatterns = [
              /\n?\s*On\s+.{10,80}\s+wrote:\s*\n?[\s\S]*/i,              // "On ... wrote:" + everything after
              /\n?\s*-{3,}\s*Original Message\s*-{3,}\s*\n?[\s\S]*/i,    // -----Original Message-----
              /\n?\s*From:\s+.+\n\s*Sent:\s+.+\n[\s\S]*/i,              // Outlook style "From: ... Sent: ..."
              /\n?\s*_{3,}\s*\n[\s\S]*/,                                  // ___ divider + everything after
            ];
            for (const pattern of quotePatterns) {
              const match = body.match(pattern);
              if (match && match.index !== undefined) {
                // Only strip if there's actual content before the quote
                const beforeQuote = body.slice(0, match.index).trim();
                if (beforeQuote.length > 0) {
                  body = beforeQuote;
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[getEmailThread] Failed to fetch content for ${msgId}:`, err);
        }
      }

      const sentTime = m.receivedTime
        ? new Date(Number(m.receivedTime)).toISOString()
        : m.sentDateInGMT
          ? new Date(m.sentDateInGMT).toISOString()
          : new Date().toISOString();

      receivedMessages.push({
        id:        `zoho-${msgId}`,
        direction: "received",
        fromEmail: m.fromAddress ?? m.sender ?? "",
        fromName:  m.fromDisplayString ?? m.senderDisplayName ?? "",
        toEmail:   m.toAddress ?? accountEmail,
        subject:   m.subject ?? "(no subject)",
        body,
        sentAt:    sentTime,
        zohoMsgId: msgId,
      });
    }

    // 6. Merge and sort by date (oldest first)
    const allMessages = [...sentMessages, ...receivedMessages]
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

    return { messages: allMessages };
  } catch (err: any) {
    console.error("[getEmailThread] Error:", err);
    // Fallback to just sent emails
    return {
      messages: sentMessages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
      error: err?.message,
    };
  }
}

// ─── 8. Get resume filename for a user (used to populate attach toggle) ───────

export async function getUserResumeFilenameAction(
  userEmail: string
): Promise<string | null> {
  const pool = rawPool();
  try {
    const res = await pool.query<{ resume_file_name: string | null; has_pdf: boolean }>(
      // Join via User table so we match by LOGIN email, not profile email field
      `SELECT up."resumeFileName"  AS resume_file_name,
              (up."resumePdfBase64" IS NOT NULL AND up."resumePdfBase64" != '') AS has_pdf
       FROM   "UserProfile" up
       JOIN   "User" u ON u.id = up."userId"
       WHERE  u.email = $1
       LIMIT  1`,
      [userEmail],
    );
    const row = res.rows[0];
    if (!row || !row.has_pdf) return null;
    return row.resume_file_name ?? "Resume.pdf";
  } catch (e) {
    console.error("[getUserResumeFilenameAction]", e);
    return null;
  } finally {
    await pool.end();
  }
}

// ─── 9. Get resume PDF base64 (for in-browser preview / download) ─────────────

export async function getResumePdfBase64Action(
  userEmail: string
): Promise<{ base64: string; filename: string } | null> {
  const pool = rawPool();
  try {
    const res = await pool.query<{ pdf: string | null; filename: string | null }>(
      `SELECT up."resumePdfBase64" AS pdf,
              up."resumeFileName"  AS filename
       FROM   "UserProfile" up
       JOIN   "User" u ON u.id = up."userId"
       WHERE  u.email = $1
       LIMIT  1`,
      [userEmail],
    );
    const row = res.rows[0];
    if (!row?.pdf) return null;
    return { base64: row.pdf, filename: row.filename ?? "Resume.pdf" };
  } catch (e) {
    console.error("[getResumePdfBase64Action]", e);
    return null;
  } finally {
    await pool.end();
  }
}

// ─── 10. Send a reply in an existing email thread ────────────────────────────
// Uses Zoho's inReplyTo field to keep the message in the same thread.

export async function sendReplyEmailAction(
  userEmail:    string,
  jobPostId:    string,
  to:           string,
  subject:      string,
  body:         string,
  inReplyToId:  string,   // Zoho messageId of the message being replied to
): Promise<{ success: boolean; error?: string; zohoMsgId?: string; sentAt?: string }> {
  const auth = await getValidAccessToken(userEmail);
  if (!auth) return { success: false, error: "Mail account not connected or token expired." };

  const { token, accountId, apiBase, accountEmail } = auth;
  if (!accountId) return { success: false, error: "Zoho account ID not available." };

  try {
    // Zoho reply: POST same endpoint but with action=reply and inReplyTo header
    const res = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: accountEmail,
          toAddress:   to,
          subject:     subject.startsWith("Re:") ? subject : `Re: ${subject}`,
          content:     body,
          mailFormat:  "plaintext",
          inReplyTo:   inReplyToId,   // threads the reply in the same conversation
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendReply] Zoho failed:", res.status, err);
      return { success: false, error: `Failed to send reply (Zoho ${res.status})` };
    }

    const resData   = await res.json().catch(() => ({}));
    const zohoMsgId = String(resData?.data?.messageId ?? resData?.messageId ?? "") || undefined;

    // Persist the reply to SentEmail table
    const account   = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "zoho" } },
    });
    const fromEmail = account?.accountEmail ?? userEmail;

    const sent = await rawInsertSentEmail({
      userEmail,
      jobPostId,
      provider:  account?.provider ?? "zoho",
      fromEmail,
      toEmail:   to,
      subject:   subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      body,
      zohoMsgId: zohoMsgId ?? null,
    });

    console.log(`[sendReply] ✅ Reply sent → ${to} (msgId: ${zohoMsgId ?? "n/a"})`);
    return { success: true, zohoMsgId, sentAt: sent.sentAt };
  } catch (err: any) {
    console.error("[sendReply] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected error sending reply." };
  }
}

// ─── 11. General Email Thread Fetcher ─────────────────────────────────────────
// Searches and builds a chronological thread of emails (sent and received) sharing the same subject line.

export async function getEmailThreadAction(
  userEmail: string,
  messageId: string,
  subject: string,
  senderEmail: string
): Promise<{ success: boolean; messages?: ThreadMessage[]; error?: string }> {
  console.log(`\n[getEmailThreadAction] 🚀 CALLED for ${userEmail}, msgId=${messageId}, subject="${subject}", sender="${senderEmail}"`);

  const auth = await getValidAccessToken(userEmail);
  if (!auth || !auth.accountId) {
    console.error("[getEmailThreadAction] ❌ No valid token");
    return { success: false, error: "Mail account not connected or token expired." };
  }

  const { token, accountId, apiBase, accountEmail } = auth;
  const baseSubject = subject
    .replace(/^(Re:\s*|Fwd:\s*)+/i, "")
    .trim();

  try {
    console.log(`[getEmailThreadAction] 🔍 Searching Zoho: baseSubject="${baseSubject}"`);

    const searchKey = `subject:"${baseSubject}"`;
    const params = new URLSearchParams({
      searchKey,
      limit: "50",
    });

    const searchRes = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages/search?${params}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );

    let rawMessages: any[] = [];
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      rawMessages = searchData?.data ?? [];
      console.log(`[getEmailThreadAction] Found ${rawMessages.length} messages by subject search`);
    } else {
      const errText = await searchRes.text();
      console.warn(`[getEmailThreadAction] Subject search failed: ${searchRes.status} — ${errText}`);
    }

    // Ensure the clicked message itself is included
    const hasClickedMsg = rawMessages.some(m => String(m.messageId ?? m.msgId ?? "") === messageId);
    if (!hasClickedMsg) {
      console.log(`[getEmailThreadAction] Clicked message ${messageId} not in results, searching specifically...`);
      const singleRes = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages/search?searchKey=msgId:${messageId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      if (singleRes.ok) {
        const singleData = await singleRes.json();
        const singleMsgs = singleData?.data ?? [];
        if (singleMsgs.length > 0) {
          rawMessages.push(singleMsgs[0]);
        }
      }
    }

    const accountEmailLower = accountEmail.toLowerCase();
    const messages: ThreadMessage[] = [];

    for (const m of rawMessages) {
      const msgId = String(m.messageId ?? m.msgId ?? "");
      const folderId = String(m.folderId ?? "");
      const from = (m.fromAddress ?? m.sender ?? "").toLowerCase();
      const direction = from.includes(accountEmailLower) ? ("sent" as const) : ("received" as const);
      
      let body = m.summary ?? m.content ?? "";

      if (folderId && msgId) {
        try {
          const contentRes = await fetch(
            `${apiBase}/api/accounts/${accountId}/folders/${folderId}/messages/${msgId}/content?includeBlockContent=false`,
            { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
          );
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            const htmlContent = contentData?.data?.content ?? "";
            body = htmlContent
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<\/div>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/&lt;/gi, "<")
              .replace(/&gt;/gi, ">")
              .replace(/&quot;/gi, '"')
              .replace(/&#39;/gi, "'")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            // Strip quotes
            const quotePatterns = [
              /\n?\s*On\s+.{10,80}\s+wrote:\s*\n?[\s\S]*/i,
              /\n?\s*-{3,}\s*Original Message\s*-{3,}\s*\n?[\s\S]*/i,
              /\n?\s*From:\s+.+\n\s*Sent:\s+.+\n[\s\S]*/i,
              /\n?\s*_{3,}\s*\n[\s\S]*/,
            ];
            for (const pattern of quotePatterns) {
              const match = body.match(pattern);
              if (match && match.index !== undefined) {
                const beforeQuote = body.slice(0, match.index).trim();
                if (beforeQuote.length > 0) {
                  body = beforeQuote;
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[getEmailThreadAction] Failed to fetch content for ${msgId}:`, err);
        }
      }

      const receivedAt = m.receivedTime
        ? new Date(Number(m.receivedTime)).toISOString()
        : m.sentDateInGMT
          ? new Date(m.sentDateInGMT).toISOString()
          : new Date().toISOString();

      messages.push({
        id: msgId,
        direction,
        fromEmail: m.fromAddress ?? m.sender ?? "",
        fromName: m.fromDisplayString ?? m.senderDisplayName ?? m.sender ?? "",
        toEmail: m.toAddress ?? accountEmail,
        subject: m.subject ?? "(no subject)",
        body,
        sentAt: receivedAt,
        zohoMsgId: msgId
      });
    }

    messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    return { success: true, messages };
  } catch (err: any) {
    console.error("[getEmailThreadAction] Error:", err);
    return { success: false, error: err?.message ?? "Failed to build thread." };
  }
}

// ─── 12. Send a general thread reply ──────────────────────────────────────────

export async function sendThreadReplyAction(
  userEmail:     string,
  to:            string,
  subject:       string,
  body:          string,
  inReplyToId:   string,   // RFC 2822 Message-ID of the message being replied to
  provider?:     "zoho" | "gmail",
  gmailThreadId?: string,  // actual Gmail thread ID (from fetchGmailThreadAction)
): Promise<{ success: boolean; error?: string; zohoMsgId?: string; sentAt?: string }> {
  console.log(`[sendThreadReplyAction] 🚀 Reply: to=${to}, subject="${subject}", provider=${provider ?? "auto"}, gmailThreadId=${gmailThreadId}`);

  // ── Auto-detect provider if not passed ──────────────────────────────────────
  // Gmail message IDs are hex strings (no dashes), Zoho IDs are numeric
  const detectedProvider = provider
    ?? (/^[0-9a-f]{16,}$/i.test(inReplyToId) ? "gmail" : "zoho");

  // ── Gmail reply via Corsair SDK ──────────────────────────────────────────────
  if (detectedProvider === "gmail") {
    try {
      const { corsair } = await import("../utils/corsair");
      const tenant = corsair.withTenant(userEmail);

      const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;

      // Use RFC 2822 Message-ID for In-Reply-To (inReplyToId may already have <> or not)
      // Normalize: strip existing angle brackets then re-add
      const rfc822Id = inReplyToId.startsWith("<")
        ? inReplyToId
        : `<${inReplyToId}>`;

      // Build RFC 2822 raw email string
      const emailLines = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${rfc822Id}`,
        `References: ${rfc822Id}`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        body,
      ];
      const rawEmail  = emailLines.join("\r\n");
      const base64Raw = Buffer.from(rawEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // gmailThreadId is passed separately — it's the actual thread ID, not message ID
      const sendPayload: any = { raw: base64Raw };
      if (gmailThreadId) sendPayload.threadId = gmailThreadId;

      await tenant.gmail.api.messages.send(sendPayload);

      // Persist to SentEmail table
      const sent = await rawInsertSentEmail({
        userEmail,
        jobPostId: null,
        provider:  "gmail",
        fromEmail: userEmail,
        toEmail:   to,
        subject:   replySubject,
        body,
        zohoMsgId: null,
      });

      console.log(`[sendThreadReplyAction] ✅ Gmail reply sent via Corsair to ${to}`);
      return { success: true, sentAt: sent.sentAt };
    } catch (err: any) {
      console.error("[sendThreadReplyAction] Gmail/Corsair error:", err);
      return { success: false, error: err?.message ?? "Failed to send Gmail reply." };
    }
  }

  // ── Zoho reply (existing logic) ──────────────────────────────────────────────
  const auth = await getValidAccessToken(userEmail);
  if (!auth) return { success: false, error: "Mail account not connected or token expired." };

  const { token, accountId, apiBase, accountEmail } = auth;
  if (!accountId) return { success: false, error: "Zoho account ID not available." };

  try {
    const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
    const res = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: accountEmail,
          toAddress:   to,
          subject:     replySubject,
          content:     body,
          mailFormat:  "plaintext",
          inReplyTo:   inReplyToId,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendThreadReplyAction] Zoho failed:", res.status, err);
      return { success: false, error: `Failed to send reply (Zoho ${res.status})` };
    }

    const resData   = await res.json().catch(() => ({}));
    const zohoMsgId = String(resData?.data?.messageId ?? resData?.messageId ?? "") || undefined;

    const account   = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "zoho" } },
    });
    const fromEmail = account?.accountEmail ?? userEmail;

    const sent = await rawInsertSentEmail({
      userEmail,
      jobPostId: null,
      provider:  account?.provider ?? "zoho",
      fromEmail,
      toEmail:   to,
      subject:   replySubject,
      body,
      zohoMsgId: zohoMsgId ?? null,
    });

    console.log(`[sendThreadReplyAction] ✅ Zoho reply sent to ${to} (msgId: ${zohoMsgId})`);
    return { success: true, zohoMsgId, sentAt: sent.sentAt };
  } catch (err: any) {
    console.error("[sendThreadReplyAction] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected error sending reply." };
  }
}
