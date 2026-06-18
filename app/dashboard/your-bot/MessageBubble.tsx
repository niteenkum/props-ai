"use client";

/**
 * PropBot AI — Chat message bubble components.
 * Renders user and assistant messages as clean white card blocks with headers
 * and inline action items.
 */

import React, { useState, useRef } from "react";
import { ThumbsUp, ThumbsDown, Copy, Share2, MoreHorizontal, Sparkles, Video, Calendar, X, Send, Loader2, ChevronLeft, AlertCircle, Paperclip, Maximize2, Minimize2 } from "lucide-react";
import type { ChatResponse, DraftEmail } from "../../actions/chat-actions";
import { getScheduleContextAction } from "../../actions/chat-actions";
import {
  fetchGmailThreadAction,
  getEmailThreadAction,
  sendThreadReplyAction,
  sendGmailNewAction,
  gmailMarkAsReadAction,
  type ThreadMessage,
} from "../../actions/mail-actions";
import DraftEmailCard from "./DraftEmailCard";
import PitchlyOrb from "./PropBotOrb";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionType?: ChatResponse["actionType"];
  actionData?: unknown;
  timestamp: Date;
}

// Helper to format timestamp
function formatTime(date: Date) {
  try {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function fmtThreadTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function threadAvatarColor(email: string) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function renderThreadBody(text: string, isSent: boolean) {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    const lines = para.split(/\n/);
    const renderedLines = lines.map((line, li) => {
      const parts: React.ReactNode[] = [];
      const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s\]\[)]+)/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        if (m.index > last) parts.push(line.slice(last, m.index));
        const url = m[2] || m[3];
        const label = m[1] || (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Open Link"; } })();
        parts.push(<a key={`${pi}-${li}-${m.index}`} href={url} target="_blank" rel="noopener noreferrer" style={{ color: isSent ? "rgba(255,255,255,0.85)" : "#6366f1", textDecoration: "underline" }}>{label}</a>);
        last = m.index + m[0].length;
      }
      if (last < line.length) parts.push(line.slice(last));
      return <span key={`${pi}-${li}`}>{parts.length > 0 ? parts : line}{li < lines.length - 1 && <br />}</span>;
    });
    return <p key={`p-${pi}`} style={{ margin: pi === 0 ? 0 : "8px 0 0", lineHeight: 1.65 }}>{renderedLines}</p>;
  });
}

// ─── Email Thread Modal ───────────────────────────────────────────────────────
function EmailThreadModal({
  email,
  userEmail,
  onClose,
}: {
  email: any;
  userEmail?: string;
  onClose: () => void;
}) {
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [replyText, setReplyText]           = useState("");
  const [sending, setSending]               = useState(false);
  const [sendError, setSendError]           = useState<string | null>(null);
  const [gmailThreadId, setGmailThreadId]   = useState<string | null>(null);
  const [expanded, setExpanded]             = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const provider   = (email.provider as "gmail" | "zoho") || "gmail";
  const messageId  = email.messageId || email.id || "";
  const fromEmail  = email.fromEmail || email.from || "";
  const fromName   = email.fromName || email.from?.split("@")[0] || "Unknown";
  const subject    = email.subject || "(no subject)";
  const avatarColor = threadAvatarColor(fromEmail);

  // Fetch thread on mount
  React.useEffect(() => {
    if (!userEmail || !messageId) {
      setLoading(false);
      setError("Missing email details.");
      return;
    }
    (async () => {
      try {
        let res: { success: boolean; messages?: ThreadMessage[]; error?: string; threadId?: string };
        if (provider === "gmail") {
          res = await fetchGmailThreadAction(userEmail, messageId);
          if (res.threadId) setGmailThreadId(res.threadId);
          // Mark as read silently
          if (!email.isRead) gmailMarkAsReadAction(userEmail, messageId).catch(() => {});
        } else {
          res = await getEmailThreadAction(userEmail, messageId, subject, fromEmail);
        }
        if (res.success && res.messages) {
          setThreadMessages(res.messages);
        } else {
          setError(res.error ?? "Could not load thread.");
        }
      } catch (e: any) {
        setError(e?.message ?? "An error occurred.");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!replyText.trim() || !userEmail) return;
    setSending(true);
    setSendError(null);
    try {
      const lastMsg = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;
      const replyToId = provider === "gmail"
        ? (lastMsg?.rfc822MsgId || lastMsg?.zohoMsgId || messageId)
        : (lastMsg?.zohoMsgId || messageId);
      await sendThreadReplyAction(
        userEmail, fromEmail, subject, replyText, replyToId,
        provider, gmailThreadId || undefined,
      );
      const newMsg: ThreadMessage = {
        id: Date.now().toString(), direction: "sent",
        fromEmail: userEmail, fromName: "You",
        toEmail: fromEmail, subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
        body: replyText, sentAt: new Date().toISOString(),
      };
      setThreadMessages(prev => [...prev, newMsg]);
      setReplyText("");
    } catch (e: any) {
      setSendError(e?.message ?? "Send failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.18s ease",
      }}
    >
      {/* Modal panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 680,
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* ── Modal Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          background: "linear-gradient(135deg, #f8f7ff, #f0f0ff)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: `${avatarColor}18`, border: `2px solid ${avatarColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: avatarColor,
          }}>
            {(fromName).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e1b4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fromName}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {subject}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer",
              width: 30, height: 30, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b", flexShrink: 0, transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Thread Messages ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 12,
          background: "#fafaf9",
          minHeight: 200,
        }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 10 }}>
              <Loader2 size={28} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12.5, color: "#94a3b8" }}>Loading thread…</span>
            </div>
          )}
          {error && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "#ef4444" }}>
              <AlertCircle size={24} />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}
          {!loading && !error && threadMessages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <span style={{ fontSize: 13 }}>No messages in this thread.</span>
            </div>
          )}
          {!loading && !error && threadMessages.map((m, i) => {
            const isSent = m.direction === "sent";
            return (
              <div key={m.id || i} style={{
                display: "flex", flexDirection: "column",
                alignSelf: isSent ? "flex-end" : "flex-start",
                maxWidth: "82%",
                alignItems: isSent ? "flex-end" : "flex-start",
              }}>
                {/* Sender name + time */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {!isSent && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: `${avatarColor}18`, border: `1.5px solid ${avatarColor}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: avatarColor,
                    }}>
                      {(m.fromName || m.fromEmail || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: isSent ? "#6366f1" : "#64748b" }}>
                    {isSent ? "You" : (m.fromName || m.fromEmail?.split("@")[0])}
                  </span>
                  <span style={{ fontSize: 9.5, color: "#94a3b8" }}>{fmtThreadTime(m.sentAt)}</span>
                </div>
                {/* Bubble */}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 16,
                  borderTopRightRadius: isSent ? 4 : 16,
                  borderTopLeftRadius: isSent ? 16 : 4,
                  background: isSent ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#fff",
                  color: isSent ? "#fff" : "#1e293b",
                  fontSize: 12.5, lineHeight: 1.65,
                  boxShadow: isSent
                    ? "0 2px 12px rgba(99,102,241,0.3)"
                    : "0 1px 4px rgba(0,0,0,0.07)",
                  wordBreak: "break-word",
                  border: isSent ? "none" : "1px solid rgba(0,0,0,0.06)",
                }}>
                  {renderThreadBody(m.body, isSent)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Reply Composer ── */}
        {userEmail && (
          <div style={{
            borderTop: "1px solid rgba(0,0,0,0.07)",
            background: "#fff",
            padding: "12px 18px",
            flexShrink: 0,
          }}>
            {/* To / Subject row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 40, flexShrink: 0 }}>To</span>
              <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 500 }}>{fromEmail}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 40, flexShrink: 0 }}>Re:</span>
              <span style={{ fontSize: 11.5, color: "#475569" }}>{subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`}</span>
            </div>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Reply to ${fromName}… (Enter to send, Shift+Enter for new line)`}
              rows={expanded ? 8 : 3}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 12px", borderRadius: 10, fontSize: 13,
                border: "1.5px solid rgba(99,102,241,0.2)",
                background: "#fafaf9",
                color: "#1e293b", outline: "none",
                fontFamily: "inherit", lineHeight: 1.6, resize: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.2)"}
            />
            {sendError && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11.5, color: "#ef4444" }}>
                <AlertCircle size={12} /> {sendError}
              </div>
            )}
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}
              >
                {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                {expanded ? "Collapse" : "Expand"}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 20px", borderRadius: 9,
                  background: replyText.trim() && !sending
                    ? "linear-gradient(135deg, #818cf8, #6366f1)"
                    : "rgba(0,0,0,0.07)",
                  color: replyText.trim() && !sending ? "#fff" : "#94a3b8",
                  border: "none", cursor: replyText.trim() && !sending ? "pointer" : "not-allowed",
                  fontSize: 13, fontWeight: 700,
                  boxShadow: replyText.trim() && !sending ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {sending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
                {sending ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: scale(0.96) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

// ─── Email Result Card (received inbox emails) ───────────────────────────────
function EmailResultCard({ email, userEmail, onClick }: { email: any; userEmail?: string; onClick?: () => void }) {
  const typeColors: Record<string, string> = {
    interview_call: "#8b5cf6",
    offer_letter: "#22c55e",
    rejection: "#ef4444",
    freelance_opportunity: "#f59e0b",
    remote_opportunity: "#3b82f6",
    general: "#64748b",
  };
  const sentimentColor =
    email.sentiment === "positive" ? "#22c55e"
    : email.sentiment === "negative" ? "#ef4444"
    : "var(--muted-foreground)";

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.emailCard,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.12s, border-color 0.15s",
        position: "relative" as const,
      }}
      onMouseEnter={e => {
        if (!onClick) return;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(99,102,241,0.15)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.35)";
      }}
      onMouseLeave={e => {
        if (!onClick) return;
        (e.currentTarget as HTMLDivElement).style.boxShadow = (styles.emailCard as any).boxShadow || "";
        (e.currentTarget as HTMLDivElement).style.borderColor = "";
      }}
    >
      <div style={styles.emailCardRow}>
        <div style={styles.emailAvatar}>
          {(email.fromName || email.from || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.emailFrom}>{email.fromName || email.from || "Unknown"}</div>
          <div style={styles.emailAddr}>{email.from || email.fromEmail || ""}</div>
        </div>
        {email.emailType && (
          <div style={{ ...styles.emailTypePill, background: typeColors[email.emailType] || "#64748b" }}>
            {email.emailType.replace("_", " ")}
          </div>
        )}
      </div>
      <div style={styles.emailSubject}>{email.subject || "(no subject)"}</div>
      {(email.snippet || email.aiSummary || email.summary) && (
        <div style={styles.emailSnippet}>
          {email.snippet || email.aiSummary || email.summary}
        </div>
      )}
      <div style={styles.emailFooter}>
        <span style={{ ...styles.sentimentDot, background: sentimentColor }} />
        <span style={styles.emailDate}>
          {email.date || (email.receivedAt ? new Date(email.receivedAt).toLocaleDateString("en", { month: "short", day: "numeric" }) : "")}
        </span>
        {!email.isRead && <span style={styles.unreadPill}>New</span>}
        {onClick && (
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 700,
            color: "#818cf8", letterSpacing: "0.02em",
          }}>Read thread →</span>
        )}
      </div>
    </div>
  );
}

// Wrapper that manages modal state for inbox email cards
function ClickableEmailResultCard({ email, userEmail }: { email: any; userEmail?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EmailResultCard email={email} userEmail={userEmail} onClick={() => setOpen(true)} />
      {open && (
        <EmailThreadModal
          email={email}
          userEmail={userEmail}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Sent Email Result Card (outbound outreach) ───────────────────────────────
function SentEmailResultCard({ email }: { email: any }) {
  const providerColors: Record<string, string> = {
    gmail:   "#ea4335",
    zoho:    "#e9222a",
    outlook: "#0078d4",
  };
  const providerColor = providerColors[email.provider?.toLowerCase()] ?? "#64748b";
  const avatarLetter = (email.company || email.toEmail || "?").charAt(0).toUpperCase();

  return (
    <div style={styles.emailCard}>
      <div style={styles.emailCardRow}>
        <div style={{ ...styles.emailAvatar, background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
          {avatarLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.emailFrom}>
            {email.company ? email.company : email.toEmail}
          </div>
          {email.role && (
            <div style={styles.emailAddr}>{email.role}</div>
          )}
          {!email.role && email.company && (
            <div style={styles.emailAddr}>{email.toEmail}</div>
          )}
        </div>
        <div style={{ ...styles.emailTypePill, background: providerColor }}>📤 Sent</div>
      </div>
      <div style={styles.emailSubject}>{email.subject || "(no subject)"}</div>
      <div style={styles.emailFooter}>
        <span style={{ ...styles.sentimentDot, background: "#22c55e" }} />
        <span style={styles.emailDate}>
          {email.sentAt
            ? new Date(email.sentAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
            : ""}
        </span>
        <span style={{ ...styles.unreadPill, background: "rgba(14,165,233,0.12)", color: "#0ea5e9", border: "1px solid rgba(14,165,233,0.25)" }}>
          via {email.provider ?? "email"}
        </span>
      </div>
    </div>
  );
}

// ─── Jobs Interactive Panel ────────────────────────────────────────────────────
const JOB_ACTIONS = [
  { id: "proposal",  label: "📝 Draft Proposal",       desc: "Write a custom winning proposal" },
  { id: "email",    label: "✉️ Draft Cold Email",      desc: "Compose outreach to the client" },
  { id: "schedule", label: "📅 Schedule a Call",       desc: "Book an interview or discovery call" },
  { id: "analyze",  label: "🔍 Analyze Fit",            desc: "Get AI take on how well you match" },
];

function JobsPanel({
  jobs,
  onAction,
}: {
  jobs: any[];
  onAction: (prompt: string) => void;
}) {
  const [expanded, setExpanded]       = useState(false);
  const [selected, setSelected]       = useState<string[]>([]);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [confirming, setConfirming]   = useState(false);

  const statusColors: Record<string, string> = {
    Draft: "#64748b", Generated: "#8b5cf6", Sent: "#3b82f6",
    Interviewing: "#22c55e", Declined: "#ef4444", Pending: "#f59e0b",
  };

  const toggleJob = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectedJobs = jobs.filter((j) => selected.includes(j.id ?? j.role));
  const chosenAction = JOB_ACTIONS.find((a) => a.id === actionId);

  const buildPrompt = () => {
    const names = selectedJobs
      .map((j) => `"${j.role}" at ${j.company}`)
      .join(", ");
    switch (actionId) {
      case "proposal":
        return `Please draft a personalized proposal for the following job(s): ${names}. Tailor it to my skills as a freelancer.`;
      case "email":
        return `Please draft a cold outreach email for the following job(s): ${names}. Make it concise and compelling.`;
      case "schedule":
        return `Please help me schedule an interview call for the following job(s): ${names}.`;
      case "analyze":
        return `Please analyze how well I fit the following job(s): ${names}. Give honest feedback.`;
      default:
        return `Help me with the following job(s): ${names}.`;
    }
  };

  const handleConfirm = () => {
    onAction(buildPrompt());
    // Reset state
    setConfirming(false);
    setExpanded(false);
    setSelected([]);
    setActionId(null);
  };

  // ── Summary Card (collapsed) ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={styles.jobSummaryCard}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #ede9fe, #f5f3ff)";
          (e.currentTarget as HTMLElement).style.borderColor = "#7c3aed";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #f5f3ff, #ede9fe)";
          (e.currentTarget as HTMLElement).style.borderColor = "#c4b5fd";
        }}
      >
        <div style={styles.jobSummaryLeft}>
          <div style={styles.jobSummaryIcon}>💼</div>
          <div>
            <div style={styles.jobSummaryTitle}>
              {jobs.length} Job{jobs.length !== 1 ? "s" : ""} Found
            </div>
            <div style={styles.jobSummarySubtitle}>
              Click to view & select jobs to take action
            </div>
          </div>
        </div>
        <div style={styles.jobSummaryChevron}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>
    );
  }

  // ── Confirmation Step ──
  if (confirming) {
    return (
      <div style={styles.jobPanel}>
        {/* Header */}
        <div style={styles.jobPanelHeader}>
          <span style={styles.jobPanelTitle}>✅ Confirm Action</span>
          <button style={styles.jobPanelClose} onClick={() => setConfirming(false)}>← Back</button>
        </div>

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Selected jobs */}
          <div>
            <div style={styles.confirmSectionLabel}>Selected Jobs ({selectedJobs.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {selectedJobs.map((job, i) => (
                <div key={i} style={styles.confirmJobRow}>
                  <div style={styles.confirmJobDot} />
                  <div>
                    <span style={styles.confirmJobRole}>{job.role}</span>
                    {job.company && <span style={styles.confirmJobAt}> at {job.company}</span>}
                  </div>
                  {job.id && (
                    <a href={`/dashboard/jobs/${job.id}`} style={styles.confirmViewBtn} target="_blank" rel="noopener noreferrer">
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action to perform */}
          <div>
            <div style={styles.confirmSectionLabel}>Action to Perform</div>
            <div style={{ ...styles.confirmActionPill, marginTop: 6 }}>
              {chosenAction?.label}
              <span style={styles.confirmActionDesc}> — {chosenAction?.desc}</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            <button
              style={styles.confirmBtn}
              onClick={handleConfirm}
            >
              🚀 Yes, Do It!
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded: Job Selector + Action Picker ──
  return (
    <div style={styles.jobPanel}>
      {/* Panel header */}
      <div style={styles.jobPanelHeader}>
        <span style={styles.jobPanelTitle}>💼 {jobs.length} Jobs Found</span>
        <button style={styles.jobPanelClose} onClick={() => { setExpanded(false); setSelected([]); setActionId(null); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Step 1: Select jobs */}
      <div style={styles.jobPanelSection}>
        <div style={styles.jobPanelStepLabel}>Step 1 — Select jobs to act on</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {jobs.map((job, i) => {
            const jobId = job.id ?? job.role;
            const isSelected = selected.includes(jobId);
            return (
              <div
                key={i}
                onClick={() => toggleJob(jobId)}
                style={{
                  ...styles.jobSelectRow,
                  background: isSelected ? "rgba(124,58,237,0.06)" : "#fafafe",
                  borderColor: isSelected ? "#7c3aed" : "var(--border)",
                  boxShadow: isSelected ? "0 0 0 2px rgba(124,58,237,0.12)" : "none",
                }}
              >
                {/* Checkbox */}
                <div style={{
                  ...styles.jobCheckbox,
                  background: isSelected ? "#7c3aed" : "#fff",
                  borderColor: isSelected ? "#7c3aed" : "#cbd5e1",
                }}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.jobSelectRole}>{job.role || "Untitled Role"}</div>
                  <div style={styles.jobSelectCompany}>{job.company || "Company not specified"}</div>
                </div>
                {/* Match + status */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {job.matchScore && (
                    <div style={styles.jobSelectMatch}>{job.matchScore}%</div>
                  )}
                  {job.status && (
                    <div style={{ ...styles.jobSelectStatus, background: statusColors[job.status] || "#64748b" }}>
                      {job.status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Choose action (only if jobs selected) */}
      {selected.length > 0 && (
        <div style={styles.jobPanelSection}>
          <div style={styles.jobPanelStepLabel}>Step 2 — What would you like to do?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {JOB_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => setActionId(action.id)}
                style={{
                  ...styles.jobActionBtn,
                  background: actionId === action.id ? "rgba(124,58,237,0.08)" : "#fafafe",
                  borderColor: actionId === action.id ? "#7c3aed" : "var(--border)",
                  color: actionId === action.id ? "#5b21b6" : "var(--foreground)",
                }}
              >
                <span style={{ fontSize: 16 }}>{action.label.split(" ")[0]}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{action.label.slice(action.label.indexOf(" ") + 1)}</span>
                <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{action.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Proceed button */}
      {selected.length > 0 && actionId && (
        <div style={{ padding: "0 14px 14px" }}>
          <button
            style={styles.jobProceedBtn}
            onClick={() => setConfirming(true)}
          >
            Review & Confirm →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Schedule Job Select + Analog Clock Panel ────────────────────────────────
function ScheduleJobSelectPanel({
  jobs,
  onBookCall,
  userEmail,
  autoStartNoJob = false,
}: {
  jobs: any[];
  userEmail?: string;
  autoStartNoJob?: boolean;
  onBookCall?: (input: {
    jobId: string; jobRole: string; jobCompany: string;
    title: string; startDateTime: string; durationMinutes: number;
    attendeeEmail?: string; notes?: string;
  }) => Promise<{ success: boolean; meetLink?: string; gcalEventUrl?: string; error?: string }>;
}) {
  // Steps: "trigger" → modal open → "schedule" → "confirm" → "done" / "error"
  const [step, setStep] = useState<"trigger" | "schedule" | "confirm" | "done" | "error">("trigger");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null); // null = no-job flow
  const [noJobTitle, setNoJobTitle] = useState("");  // title for standalone call
  const [meetingTitle, setMeetingTitle] = useState(""); // editable meeting title
  const [date, setDate] = useState<string>("");
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [duration, setDuration] = useState(30);
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false); // loading AI schedule context
  const [result, setResult] = useState<{ meetLink?: string; gcalEventUrl?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch AI schedule context (agenda + contact email) when a job is selected
  const fetchScheduleContext = async (job: any) => {
    if (!userEmail || !job?.id) return;
    setAiLoading(true);
    try {
      const ctx = await getScheduleContextAction(userEmail, job.id);
      if (ctx.contactEmail && !attendeeEmail) setAttendeeEmail(ctx.contactEmail);
      if (ctx.agenda && !notes) setNotes(ctx.agenda);
    } catch { /* silently fail */ }
    finally { setAiLoading(false); }
  };

  // Clock math
  const clockRadius = 68;
  const center      = clockRadius + 6;
  const svgSize     = center * 2;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Live second hand (updates each second)
  const [nowSec, setNowSec] = useState(new Date().getSeconds());
  React.useEffect(() => {
    const id = setInterval(() => setNowSec(new Date().getSeconds()), 1000);
    return () => clearInterval(id);
  }, []);

  const hourAngle = ((hour % 12) / 12 + minute / 720) * 360 - 90;
  const minAngle  = (minute / 60) * 360 - 90;
  const secAngle  = (nowSec / 60) * 360 - 90;

  const hx = center + clockRadius * 0.50 * Math.cos(toRad(hourAngle));
  const hy = center + clockRadius * 0.50 * Math.sin(toRad(hourAngle));
  const mx = center + clockRadius * 0.75 * Math.cos(toRad(minAngle));
  const my = center + clockRadius * 0.75 * Math.sin(toRad(minAngle));
  const sx = center + clockRadius * 0.82 * Math.cos(toRad(secAngle));
  const sy = center + clockRadius * 0.82 * Math.sin(toRad(secAngle));
  const sxTail = center - clockRadius * 0.18 * Math.cos(toRad(secAngle));
  const syTail = center - clockRadius * 0.18 * Math.sin(toRad(secAngle));

  // 12 tick marks + numbers
  const clockMarkers = Array.from({ length: 12 }, (_, i) => {
    const a  = (i / 12) * 360 - 90;
    const r  = toRad(a);
    const isMajor = i % 3 === 0;
    return {
      x1: center + (clockRadius - (isMajor ? 9 : 6)) * Math.cos(r),
      y1: center + (clockRadius - (isMajor ? 9 : 6)) * Math.sin(r),
      x2: center + clockRadius * Math.cos(r),
      y2: center + clockRadius * Math.sin(r),
      nx: center + (clockRadius - 20) * Math.cos(r),
      ny: center + (clockRadius - 20) * Math.sin(r),
      n:  i === 0 ? 12 : i,
      isMajor,
    };
  });

  const ampm  = hour < 12 ? "AM" : "PM";
  const h12   = hour % 12 || 12;
  const timeStr = `${String(h12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const buildStartDateTime = () => date ? `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30` : "";

  // Derived call title (user can override via meetingTitle)
  const callTitle = (() => {
    if (selectedJob) {
      const co = (selectedJob.company ?? "").trim().toLowerCase();
      const companyPart = co && co !== "not specified" ? ` at ${selectedJob.company}` : "";
      return `Interview call — ${selectedJob.role}${companyPart}`;
    }
    return noJobTitle || "Client call";
  })();
  const effectiveTitle = meetingTitle.trim() || callTitle;

  const handleConfirm = async () => {
    if (!date || !onBookCall) return;
    setLoading(true);
    try {
      const res = await onBookCall({
        jobId:           selectedJob?.id ?? "",
        jobRole:         selectedJob?.role ?? "",
        jobCompany:      selectedJob?.company ?? "",
        title:           effectiveTitle,
        startDateTime:   buildStartDateTime(),
        durationMinutes: duration,
        attendeeEmail:   attendeeEmail || undefined,
        notes:           notes || undefined,
      });
      if (res.success) {
        setResult({ meetLink: res.meetLink, gcalEventUrl: res.gcalEventUrl });
        setStep("done");
      } else {
        setErrorMsg(res.error ?? "Failed to book call");
        setStep("error");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Something went wrong");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step: Done ──
  if (step === "done") {
    return (
      <div style={styles.jobPanel}>
        <div style={{ ...styles.jobPanelHeader, background: "linear-gradient(135deg, #d1fae5, #ecfdf5)" }}>
          <span style={{ ...styles.jobPanelTitle, color: "#065f46" }}>✅ Call Scheduled!</span>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={styles.confirmJobRow}>
            <div style={{ ...styles.confirmJobDot, background: "#22c55e" }} />
            <span style={styles.confirmJobRole}>{callTitle}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "#374151" }}>
            📅 {new Date(buildStartDateTime()).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })} · {duration} min
          </div>
          {result?.meetLink && (
            <a href={result.meetLink} target="_blank" rel="noopener noreferrer"
              style={{ ...styles.confirmBtn, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", justifyContent: "center", padding: "10px 16px" }}>
              🎥 Join Google Meet
            </a>
          )}
          {result?.gcalEventUrl && (
            <a href={result.gcalEventUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...styles.cancelBtn, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", justifyContent: "center" }}>
              📆 View in Calendar
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Step: Error ──
  if (step === "error") {
    return (
      <div style={styles.jobPanel}>
        <div style={{ ...styles.jobPanelHeader, background: "linear-gradient(135deg, #fee2e2, #fff1f2)" }}>
          <span style={{ ...styles.jobPanelTitle, color: "#991b1b" }}>❌ Booking Failed</span>
          <button style={styles.jobPanelClose} onClick={() => setStep("schedule")}>← Retry</button>
        </div>
        <div style={{ padding: "14px", fontSize: 12.5, color: "#7f1d1d" }}>{errorMsg}</div>
      </div>
    );
  }

  // ── Step: Confirm ──
  if (step === "confirm") {
    const displayDate = date ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
    return (
      <div style={styles.jobPanel}>
        <div style={styles.jobPanelHeader}>
          <span style={styles.jobPanelTitle}>✅ Confirm Meeting</span>
          <button style={styles.jobPanelClose} onClick={() => setStep("schedule")}>← Edit</button>
        </div>
        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={styles.confirmJobRow}>
            <div style={styles.confirmJobDot} />
            <span style={styles.confirmJobRole}>{callTitle}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={styles.scheduleSummaryCell}>
              <div style={styles.scheduleSummaryCellLabel}>Date</div>
              <div style={styles.scheduleSummaryCellValue}>{displayDate}</div>
            </div>
            <div style={styles.scheduleSummaryCell}>
              <div style={styles.scheduleSummaryCellLabel}>Time</div>
              <div style={styles.scheduleSummaryCellValue}>{timeStr} IST</div>
            </div>
            <div style={styles.scheduleSummaryCell}>
              <div style={styles.scheduleSummaryCellLabel}>Duration</div>
              <div style={styles.scheduleSummaryCellValue}>{duration} minutes</div>
            </div>
            {attendeeEmail && (
              <div style={styles.scheduleSummaryCell}>
                <div style={styles.scheduleSummaryCellLabel}>Attendee</div>
                <div style={{ ...styles.scheduleSummaryCellValue, fontSize: 10.5, wordBreak: "break-all" as const }}>{attendeeEmail}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.confirmBtn, flex: 1 }} onClick={handleConfirm} disabled={loading}>
              {loading ? "Booking…" : "🚀 Book It!"}
            </button>
            <button style={styles.cancelBtn} onClick={() => setStep("schedule")}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Schedule (Clock + inputs) ──
  const today = new Date().toISOString().slice(0, 10);
  if (step === "schedule") {
    return (
      <div style={styles.jobPanel}>
        <div style={styles.jobPanelHeader}>
          <span style={styles.jobPanelTitle}>🕐 Pick Date & Time</span>
          <button style={styles.jobPanelClose} onClick={() => { setStep("trigger"); setModalOpen(false); }}>← Back</button>
        </div>

        {/* Selected job / standalone pill */}
        <div style={{ padding: "10px 14px 0", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={styles.confirmJobDot} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#4c1d95" }}>
            {selectedJob ? selectedJob.role : (noJobTitle || "Standalone call")}
          </span>
          {selectedJob && (() => { const co = (selectedJob.company ?? "").trim().toLowerCase(); return co && co !== "not specified" ? <span style={{ fontSize: 11.5, color: "#7c3aed" }}> at {selectedJob.company}</span> : null; })()}
        </div>

        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Apple Watch-style Clock Card */}
          <div style={styles.analogClockCard}>
            {/* Left: Digital time + label */}
            <div style={{ display: "flex", flexDirection: "column" as const, justifyContent: "center", flex: 1, gap: 6 }}>
              <div style={styles.analogDigitalTime}>
                {timeStr}
                <span style={styles.analogAmPm}>{ampm}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 400, lineHeight: 1.4 }}>
                Today, India
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                +0hrs · IST
              </div>
            </div>

            {/* Right: Analog SVG Clock */}
            <svg width={svgSize} height={svgSize} style={{ flexShrink: 0 }}>
              {/* Clock face */}
              <circle cx={center} cy={center} r={clockRadius} fill="#1c1c1e" />
              <circle cx={center} cy={center} r={clockRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

              {/* Tick marks */}
              {clockMarkers.map((t, i) => (
                <line key={i}
                  x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke={t.isMajor ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"}
                  strokeWidth={t.isMajor ? 2 : 1}
                  strokeLinecap="round"
                />
              ))}

              {/* Numbers */}
              {clockMarkers.map((t, i) => (
                <text
                  key={i}
                  x={t.nx} y={t.ny}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={t.isMajor ? "10" : "8"}
                  fontWeight={t.isMajor ? "600" : "400"}
                  fill={t.isMajor ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)"}
                  fontFamily="system-ui, -apple-system"
                >
                  {t.n}
                </text>
              ))}

              {/* Hour hand */}
              <line x1={center} y1={center} x2={hx} y2={hy}
                stroke="white" strokeWidth="3.5" strokeLinecap="round" />
              {/* Minute hand */}
              <line x1={center} y1={center} x2={mx} y2={my}
                stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              {/* Second hand (live, red) */}
              <line x1={sxTail} y1={syTail} x2={sx} y2={sy}
                stroke="#ff3b30" strokeWidth="1.5" strokeLinecap="round" />
              {/* Center dot */}
              <circle cx={center} cy={center} r={3.5} fill="white" />
              <circle cx={center} cy={center} r={2} fill="#ff3b30" />
            </svg>
          </div>

          {/* Time sliders below the dark clock card */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            <div>
              <div style={{ ...styles.sliderLabel, display: "flex", justifyContent: "space-between" }}>
                <span>Hour</span>
                <b style={{ color: "#1e1b4b" }}>{String(h12).padStart(2, "0")}:00 {ampm}</b>
              </div>
              <input type="range" min={0} max={23} value={hour}
                onChange={e => setHour(Number(e.target.value))}
                style={styles.clockSlider} />
            </div>
            <div>
              <div style={{ ...styles.sliderLabel, display: "flex", justifyContent: "space-between" }}>
                <span>Minute</span>
                <b style={{ color: "#1e1b4b" }}>:{String(minute).padStart(2, "0")}</b>
              </div>
              <input type="range" min={0} max={59} step={5} value={minute}
                onChange={e => setMinute(Number(e.target.value))}
                style={styles.clockSlider} />
            </div>
          </div>

          {/* Meeting title — pre-filled for job flow, blank for no-job */}
          <div style={{
            background: selectedJob ? "linear-gradient(135deg, #faf5ff, #f5f3ff)" : "#f8fafc",
            border: `1px solid ${selectedJob ? "rgba(124,58,237,0.15)" : "#e2e8f0"}`,
            borderRadius: 10, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: selectedJob ? "#7c3aed" : "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>
              {selectedJob ? "✦ Auto-filled from job post" : "Meeting title"}
            </div>
            <input
              type="text"
              placeholder={selectedJob ? callTitle : "e.g. Discovery call with Stripe"}
              value={meetingTitle || (selectedJob ? callTitle : noJobTitle)}
              onChange={(e) => {
                setMeetingTitle(e.target.value);
                if (!selectedJob) setNoJobTitle(e.target.value);
              }}
              style={{
                ...styles.scheduleInput,
                background: "transparent",
                border: "none",
                padding: "0",
                fontWeight: 600,
                fontSize: 13,
                color: "#1e1b4b",
              }}
            />
          </div>

          {/* Date */}
          <div>
            <div style={styles.jobPanelStepLabel}>Date</div>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} style={styles.scheduleInput} />
          </div>

          {/* Duration */}
          <div>
            <div style={styles.jobPanelStepLabel}>Duration</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[15, 30, 45, 60].map((d) => (
                <button key={d} onClick={() => setDuration(d)} style={{ ...styles.durationBtn, background: duration === d ? "#7c3aed" : "#f8fafc", color: duration === d ? "#fff" : "#374151", borderColor: duration === d ? "#7c3aed" : "#e2e8f0" }}>{d}m</button>
              ))}
            </div>
          </div>

          {/* Attendee — pre-filled from job if available */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={styles.jobPanelStepLabel}>Invite email</div>
              {selectedJob && (selectedJob.email || selectedJob.clientEmail) && !attendeeEmail && (
                <button
                  onClick={() => setAttendeeEmail(selectedJob.email || selectedJob.clientEmail)}
                  style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 10.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
                >Use job email ↗</button>
              )}
            </div>
            <input
              type="email"
              placeholder={selectedJob ? (selectedJob.email || selectedJob.clientEmail || "client@company.com") : "client@company.com"}
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              style={styles.scheduleInput}
            />
          </div>

          {/* Notes */}
          <div>
            <div style={styles.jobPanelStepLabel}>Notes / Agenda</div>
            {aiLoading ? (
              <div style={{
                ...styles.scheduleInput,
                background: "linear-gradient(90deg, #f0eeff 25%, #e8e3ff 50%, #f0eeff 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
                height: 72, display: "flex", alignItems: "center", gap: 8, color: "#7c3aed",
                fontSize: 12, fontWeight: 500,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                AI is generating your meeting agenda…
              </div>
            ) : (
              <textarea
                placeholder={selectedJob ? "AI agenda will appear here — or type your own notes" : "Any notes for the call..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...styles.scheduleInput, resize: "none" as const, fontFamily: "inherit" }}
              />
            )}
          </div>

          <button style={{ ...styles.jobProceedBtn, opacity: !date ? 0.5 : 1 }} onClick={() => setStep("confirm")} disabled={!date}>
            Review Meeting Details →
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Trigger (compact card + modal) ──
  // autoStartNoJob mode: render just the standalone row
  if (autoStartNoJob) {
    return (
      <div
        onClick={() => { setSelectedJob(null); setStep("schedule"); }}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "13px 16px",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg, #06b6d418, #0ea5e918)",
          border: "1px solid rgba(6,182,212,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17,
        }}>📆</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Schedule without a job</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Quick standalone call — no job post needed</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Premium trigger card */}
      <div style={{
        background: "#fff",
        border: "1.5px solid rgba(124,58,237,0.15)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>📅</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Schedule a Call</div>
            <div style={{ fontSize: 11.5, color: "#c4b5fd", marginTop: 3, fontWeight: 500 }}>
              {jobs.length > 0 ? `${jobs.length} job posts available` : "Create a new meeting"}
            </div>
          </div>
        </div>

        {/* Option rows */}
        <div style={{ display: "flex", flexDirection: "column" as const }}>

          {/* Option 1 — Link to job */}
          <div
            onClick={() => setModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 16px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#faf5ff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #7c3aed18, #4f46e518)",
              border: "1px solid rgba(124,58,237,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17,
            }}>💼</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Link to a job post</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Pick from your {jobs.length} saved job posts</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {/* Option 2 — Standalone */}
          <div
            onClick={() => { setSelectedJob(null); setStep("schedule"); }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 16px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #06b6d418, #0ea5e918)",
              border: "1px solid rgba(6,182,212,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17,
            }}>📆</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Schedule without a job</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Quick standalone call with any client</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

        </div>
      </div>


      {/* Modal overlay */}
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,10,40,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{
            background: "#fff", borderRadius: 20,
            width: "100%", maxWidth: 480, maxHeight: "80vh",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, #1e1b4b, #312e81)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>📅 Which job is this call for?</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>Select a job post or schedule without one</div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "6px 10px", color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>

            {/* Scrollable job list */}
            <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {jobs.map((job, i) => (
                <div
                  key={i}
                  onClick={() => { setSelectedJob(job); setModalOpen(false); setMeetingTitle(""); setAttendeeEmail(""); setNotes(""); setStep("schedule"); fetchScheduleContext(job); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e8e3ff", background: "#fafafe", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f0eeff"; (e.currentTarget as HTMLElement).style.borderColor = "#7c3aed"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fafafe"; (e.currentTarget as HTMLElement).style.borderColor = "#e8e3ff"; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed20, #4f46e520)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💼</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.role || "Untitled Role"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {(() => { const co = (job.company ?? "").trim().toLowerCase(); return co && co !== "not specified" ? job.company : "No company"; })()}
                    </div>
                  </div>
                  {job.matchScore && <span style={{ fontSize: 11.5, fontWeight: 700, color: "#7c3aed", background: "#f0eeff", padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>{job.matchScore}%</span>}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              ))}
            </div>

            {/* No-job option */}
            <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
              <button
                onClick={() => { setSelectedJob(null); setModalOpen(false); setStep("schedule"); }}
                style={{ width: "100%", padding: "11px 16px", borderRadius: 12, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
              >
                📆 Schedule without a job post
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsResultCard({ stats }: { stats: any }) {
  const total        = stats.total ?? 0;
  const sent         = stats.sent ?? 0;
  const interviewing = stats.interviewing ?? 0;
  const avgMatch     = stats.avgMatchScore ?? 0;
  const draft        = stats.draft ?? 0;
  const sentPct      = total > 0 ? Math.round((sent / total) * 100) : 0;

  // SVG circular progress for avg match
  const r = 36, circ = 2 * Math.PI * r;
  const dash = circ * (avgMatch / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>

      {/* ── Hero banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
        borderRadius: 16,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        boxShadow: "0 8px 32px rgba(79,46,220,0.25)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow orbs */}
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(139,92,246,0.2)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -10, left: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(99,102,241,0.15)", pointerEvents: "none" }} />

        {/* Circular match score */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width={r*2+12} height={r*2+12} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={r+6} cy={r+6} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx={r+6} cy={r+6} r={r} fill="none"
              stroke="url(#matchGrad)" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            <defs>
              <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{avgMatch}%</span>
            <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginTop: 2, letterSpacing: "0.05em" }}>MATCH</span>
          </div>
        </div>

        {/* Right side stats */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Outreach Overview
          </div>

          {/* Total / Sent row */}
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 2 }}>Total Jobs</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa", lineHeight: 1 }}>{sent}</div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 2 }}>Proposals Sent</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: interviewing > 0 ? "#34d399" : "rgba(255,255,255,0.35)", lineHeight: 1 }}>{interviewing}</div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 2 }}>Interviewing</div>
            </div>
          </div>

          {/* Sent progress bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Proposal rate</span>
              <span style={{ fontSize: 9.5, color: "#a78bfa", fontWeight: 700 }}>{sentPct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${sentPct}%`,
                borderRadius: 99,
                background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom pill row ── */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Drafts", value: draft, color: "#8b5cf6", bg: "#f5f3ff" },
          { label: "In Review", value: interviewing, color: "#10b981", bg: "#f0fdf4" },
          { label: "Sent", value: sent, color: "#3b82f6", bg: "#eff6ff" },
          { label: "Avg Match", value: `${avgMatch}%`, color: "#f59e0b", bg: "#fffbeb" },
        ].map((p) => (
          <div key={p.label} style={{
            flex: 1, background: p.bg, borderRadius: 10,
            padding: "10px 8px", textAlign: "center",
            border: `1px solid ${p.color}22`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{p.value}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>{p.label}</div>
          </div>
        ))}
      </div>

    </div>
  );
}


// ─── Scheduled Meetings / Calls (Redesigned Date-Badge Style) ─────────────────
function CallResultCard({ call }: { call: any }) {
  const overdue = new Date(call.scheduledAt).getTime() < Date.now() && call.status === "pending";
  const done = call.status === "done";
  const cancelled = call.status === "cancelled";

  const accentColor = done ? "#22c55e" : cancelled ? "#64748b" : overdue ? "#f59e0b" : "#8b5cf6";
  const statusLabel = done ? "Done" : cancelled ? "Cancelled" : overdue ? "Overdue" : "Upcoming";

  let month = "JUN";
  let day = "17";
  try {
    const d = new Date(call.scheduledAt);
    month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    day = d.getDate().toString();
  } catch (e) {}

  return (
    <div style={styles.callCard}>
      {/* Date badge left column */}
      <div style={styles.dateBadge}>
        <span style={styles.dateBadgeMonth}>{month}</span>
        <span style={styles.dateBadgeDay}>{day}</span>
      </div>

      {/* Details right column */}
      <div style={styles.callContent}>
        <div style={styles.callHeaderRow}>
          <span style={styles.callTitle}>{call.title}</span>
          <span style={{ ...styles.callStatusPill, background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
            {statusLabel}
          </span>
        </div>

        {call.job && (() => {
          const co = (call.job.company ?? "").trim().toLowerCase();
          const hasCompany = co && co !== "not specified";
          return (
            <div style={styles.callJobInfo}>
              {call.job.role}{hasCompany ? <> at <span style={{ fontWeight: 600 }}>{call.job.company}</span></> : null}
            </div>
          );
        })()}

        {call.notes && <p style={styles.callNotes}>{call.notes}</p>}

        <div style={styles.callFooterRow}>
          <span style={styles.callDuration}>⏳ {call.durationMin} mins duration</span>
          {call.meetLink && call.status === "pending" && (
            <a
              href={call.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.meetBtn}
            >
              <Video size={13} style={{ marginRight: 4 }} />
              Join Meet
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div style={styles.typingRow}>
      <div style={styles.botAvatarSm}>
        <Sparkles size={14} color="#7c3aed" />
      </div>
      <div style={styles.typingBubble}>
        <span style={{ ...styles.typingDot, animationDelay: "0ms" }} />
        <span style={{ ...styles.typingDot, animationDelay: "150ms" }} />
        <span style={{ ...styles.typingDot, animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// Helper to render markdown formatting into React elements safely
function parseMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  
  let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;

  const pushListIfOpen = () => {
    if (currentList) {
      const ListTag = currentList.type;
      const items = currentList.items;
      const key = `list-${result.length}`;
      result.push(
        <ListTag key={key} style={ListTag === "ul" ? styles.mdUl : styles.mdOl}>
          {items.map((item, idx) => (
            <li key={`li-${idx}`} style={styles.mdLi}>{item}</li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  const parseItalicAndCode = (str: string): React.ReactNode => {
    const codeParts = str.split("`");
    const codeFormatted = codeParts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <code
            key={index}
            style={{
              fontFamily: "monospace",
              background: "rgba(0,0,0,0.04)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#e11d48",
            }}
          >
            {part}
          </code>
        );
      }
      
      const italicParts = part.split("*");
      const italicFormatted = italicParts.map((subPart, subIndex) => {
        if (subIndex % 2 === 1) {
          return <em key={subIndex} style={{ fontStyle: "italic" }}>{subPart}</em>;
        }
        return subPart;
      });
      return <React.Fragment key={index}>{italicFormatted}</React.Fragment>;
    });
    return <React.Fragment>{codeFormatted}</React.Fragment>;
  };

  const parseInline = (str: string): React.ReactNode => {
    const boldParts = str.split("**");
    const boldFormatted = boldParts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 700 }}>{parseItalicAndCode(part)}</strong>;
      }
      return parseItalicAndCode(part);
    });
    return <React.Fragment>{boldFormatted}</React.Fragment>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Indented lines inside active lists (keeps numbering sequential)
    const startsWithSpace = line.startsWith(" ") || line.startsWith("\t");
    if (currentList && startsWithSpace) {
      const lastIdx = currentList.items.length - 1;
      if (lastIdx >= 0) {
        const lastItem = currentList.items[lastIdx];
        const isSubBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
        const content = isSubBullet ? trimmed.slice(2) : trimmed;
        currentList.items[lastIdx] = (
          <div key={`li-nested-${lastIdx}-${i}`} style={{ display: "flex", flexDirection: "column" }}>
            <div>{lastItem}</div>
            <div style={{ paddingLeft: "16px", color: "var(--foreground)", fontSize: "13px", marginTop: "4px", display: "flex", gap: "6px", alignItems: "flex-start" }}>
              {isSubBullet ? <span style={{ color: "var(--muted-foreground)" }}>•</span> : null}
              <span>{parseInline(content)}</span>
            </div>
          </div>
        );
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      pushListIfOpen();
      result.push(<h3 key={`h3-${i}`} style={styles.mdH3}>{parseInline(trimmed.slice(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      pushListIfOpen();
      result.push(<h2 key={`h2-${i}`} style={styles.mdH2}>{parseInline(trimmed.slice(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      pushListIfOpen();
      result.push(<h1 key={`h1-${i}`} style={styles.mdH1}>{parseInline(trimmed.slice(2))}</h1>);
      continue;
    }

    // Indented sub-bullets (when no list is open - fallback)
    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    if (startsWithSpace && isBullet) {
      pushListIfOpen();
      result.push(
        <div key={`sub-fallback-${i}`} style={{ paddingLeft: "20px", color: "var(--foreground)", fontSize: "13.5px", margin: "4px 0", display: "flex", gap: "6px", alignItems: "flex-start" }}>
          <span style={{ color: "var(--muted-foreground)" }}>•</span>
          <span>{parseInline(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Regular bullets
    if (isBullet) {
      if (!currentList || currentList.type !== "ul") {
        pushListIfOpen();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(parseInline(trimmed.slice(2)));
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        pushListIfOpen();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(parseInline(numMatch[2]));
      continue;
    }

    // Empty lines
    if (trimmed === "") {
      if (!currentList) {
        pushListIfOpen();
      }
      continue;
    }

    // Paragraph text
    pushListIfOpen();
    result.push(<p key={`p-${i}`} style={styles.mdParagraph}>{parseInline(line)}</p>);
  }

  pushListIfOpen();
  return <div style={{ display: "flex", flexDirection: "column" }}>{result}</div>;
}

// ─── Helper to generate contextual suggestions ───────────────────────────────
function getSuggestionsForMessage(msg: UIMessage): { label: string; prompt: string }[] {
  const defaultSuggestions = [
    { label: "📬 Check priority inbox", prompt: "Show me my priority inbox with AI-classified emails" },
    { label: "✉️ Draft an email", prompt: "Help me draft a cold email to a client" },
    { label: "📅 Schedule a meeting", prompt: "Help me schedule a calendar meeting for a client call" },
    { label: "🕒 Any pending jobs?", prompt: "Do I have any pending job posts that I haven't applied to yet?" },
    { label: "📝 Create job from lead", prompt: "Here is a job description. Please create a new job post and analyze it for me:\n\n[Paste job description here]" }
  ];

  if (msg.actionType === "jobs" && Array.isArray(msg.actionData) && msg.actionData.length > 0) {
    const job = msg.actionData[0] as any;
    if (job) {
      // Use role if company is missing/generic
      const rawCompany = (job.company ?? "").trim();
      const company = rawCompany && rawCompany.toLowerCase() !== "not specified" ? rawCompany : null;
      const roleLabel = job.role ? job.role.split(" ").slice(0, 3).join(" ") : "this role";
      const clientLabel = company ?? roleLabel;
      return [
        { label: `✉️ Draft cold email — ${clientLabel}`, prompt: `Help me draft a cold email for the ${job.role || "freelance"} role${company ? ` at ${company}` : ""}` },
        { label: `📝 Generate proposal — ${clientLabel}`, prompt: `Help me generate a custom proposal for the ${job.role || "freelance"} role${company ? ` at ${company}` : ""}` },
        { label: `📅 Book a call — ${clientLabel}`, prompt: `Help me schedule an interview call for the ${job.role || "freelance"} role${company ? ` at ${company}` : ""}` },
        { label: "🕒 Check pending jobs", prompt: "Do I have any pending job posts that I haven't applied to yet?" }
      ];
    }
  }

  if (msg.actionType === "emails" && Array.isArray(msg.actionData) && msg.actionData.length > 0) {
    const email = msg.actionData[0] as any;
    if (email) {
      const name = email.fromName || email.company || "client";
      return [
        { label: `✉️ Draft reply to ${name}`, prompt: `Help me draft a reply to the email from ${name} regarding "${email.subject || "our proposal"}"` },
        { label: `📅 Schedule meeting with ${name}`, prompt: `Help me schedule a call with ${name} to discuss their email` },
        { label: "📋 Show interview calls", prompt: "Show me any interview call emails in my inbox" },
        { label: "🎉 Any offer letters?", prompt: "Do I have any offer letters or positive responses in my inbox?" },
      ];
    }
  }

  if (msg.actionType === "draft" && msg.actionData) {
    const draft = msg.actionData as any;
    if (draft && draft.to) {
      return [
        { label: `📅 Schedule call with recipient`, prompt: `Help me schedule a calendar meeting for a call with ${draft.to}` },
        { label: "🕒 Check pending jobs", prompt: "Do I have any pending job posts that I haven't applied to yet?" },
        { label: "💰 Negotiate rate", prompt: "Help me draft a rate negotiation response to a client" },
        { label: "📝 Create job from lead", prompt: "Here is a job description. Please create a new job post and analyze it for me:\n\n[Paste job description here]" }
      ];
    }
  }

  if (msg.actionType === "calls" && Array.isArray(msg.actionData) && msg.actionData.length > 0) {
    const call = msg.actionData[0] as any;
    if (call) {
      const emailVal = call.attendeeEmail || "";
      const promptToUse = emailVal 
        ? `Help me draft a follow-up email to ${emailVal} regarding our scheduled call "${call.title}"`
        : `Help me draft a follow-up email to the client regarding our scheduled call "${call.title}"`;
      return [
        { label: `✉️ Email client for "${call.title}"`, prompt: promptToUse },
        { label: "🕒 Check pending jobs", prompt: "Do I have any pending job posts that I haven't applied to yet?" },
        { label: "📝 Create job from lead", prompt: "Here is a job description. Please create a new job post and analyze it for me:\n\n[Paste job description here]" }
      ];
    }
  }

  return defaultSuggestions;
}

// ─── Main Message Bubble (Ciphy White Card Layout) ───────────────────────────
interface MessageBubbleProps {
  msg: UIMessage;
  userName?: string;
  userEmail?: string;
  onSendDraft: (draft: DraftEmail) => Promise<void>;
  onSelectSuggestion?: (prompt: string) => void;
  onBookCall?: (input: {
    jobId: string; jobRole: string; jobCompany: string;
    title: string; startDateTime: string; durationMinutes: number;
    attendeeEmail?: string; notes?: string;
  }) => Promise<{ success: boolean; meetLink?: string; gcalEventUrl?: string; error?: string }>;
}

export default function MessageBubble({ msg, userName = "Niteen Kumar", userEmail, onSendDraft, onSelectSuggestion, onBookCall }: MessageBubbleProps) {
  const isUser = msg.role === "user";
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PA";

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.cardBubble}>
      {/* Header Block: Avatar + Name + Timestamp + Action Menu */}
      <div style={styles.cardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isUser ? (
            <div style={styles.userAvatarBadge}>
              {initials}
            </div>
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
              <PitchlyOrb size={32} state="idle" />
            </div>
          )}
          
          <div>
            <span style={styles.senderName}>{isUser ? userName : "Pitchly"}</span>
            <span style={styles.timestamp}>{formatTime(msg.timestamp)}</span>
          </div>
        </div>

      </div>

      {/* Body Content */}
      <div style={styles.cardBody}>
        {/* For draft emails: show a short handoff message, not the full verbose AI reply */}
        {msg.actionType === "draft" && msg.actionData ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            background: "linear-gradient(135deg, #f5f3ff, #eff6ff)",
            borderRadius: 10,
            border: "1px solid rgba(124,58,237,0.12)",
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 18 }}>✉️</span>
            <span style={{ fontSize: 13, color: "#4c1d95", fontWeight: 500, lineHeight: 1.5 }}>
              Hey! I&apos;ve drafted an email for you — review, edit if needed, and hit send whenever you&apos;re ready.
            </span>
          </div>
        ) : (
          <div style={styles.textBody}>{parseMarkdown(msg.content)}</div>
        )}

        {/* Embedded Result Cards */}
        {msg.actionType === "emails" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsList}>
            {(msg.actionData as any[]).map((e, i) =>
              e.toEmail && !e.fromName && !e.from
                ? <SentEmailResultCard key={i} email={e} />
                : <ClickableEmailResultCard key={i} email={e} userEmail={userEmail} />
            )}
          </div>
        ) : null}

        {msg.actionType === "jobs" && Array.isArray(msg.actionData) && msg.actionData.length > 0 ? (
          <JobsPanel
            jobs={msg.actionData as any[]}
            onAction={(prompt) => onSelectSuggestion?.(prompt)}
          />
        ) : null}

        {msg.actionType === "schedule_job_select" && Array.isArray(msg.actionData) ? (
          (msg.actionData as any[]).length > 0 ? (
            <ScheduleJobSelectPanel
              jobs={msg.actionData as any[]}
              onBookCall={onBookCall}
              userEmail={userEmail}
            />
          ) : (
            /* ── No Jobs Empty State ── */
            <div style={{
              background: "#fff",
              border: "1.5px solid rgba(124,58,237,0.15)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(124,58,237,0.07)",
            }}>
              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>📭</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>No Job Posts Found</div>
                  <div style={{ fontSize: 11.5, color: "#c4b5fd", marginTop: 3, fontWeight: 500 }}>You haven&apos;t added any job posts yet</div>
                </div>
              </div>

              {/* Option rows */}
              <div style={{ display: "flex", flexDirection: "column" as const }}>

                {/* Option 1 — Create a job post */}
                <a
                  href="/dashboard/new-scan"
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#faf5ff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, #7c3aed18, #4f46e518)",
                    border: "1px solid rgba(124,58,237,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17,
                  }}>➕</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Create a job post first</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Add a job lead, then link this call to it</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>

                {/* Option 2 — Schedule without a job */}
                <ScheduleJobSelectPanel
                  jobs={[]}
                  onBookCall={onBookCall}
                  userEmail={userEmail}
                  autoStartNoJob
                />

              </div>
            </div>
          )
        ) : null}

        {msg.actionType === "stats" && msg.actionData ? (
          <StatsResultCard stats={msg.actionData as any} />
        ) : null}

        {msg.actionType === "calls" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsList}>
            {(msg.actionData as any[]).map((c, i) => <CallResultCard key={i} call={c} />)}
          </div>
        ) : null}

        {msg.actionType === "draft" && msg.actionData ? (
          <DraftEmailCard draft={msg.actionData as DraftEmail} onSend={onSendDraft} />
        ) : null}

        {/* Contextual Suggestions for Freelancers */}
        {!isUser && onSelectSuggestion && (
          <div style={styles.msgSuggestions}>
            <span style={styles.msgSuggestionsLabel}>Suggested Actions:</span>
            <div style={styles.msgSuggestionsList}>
              {getSuggestionsForMessage(msg).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion(s.prompt)}
                  style={styles.msgSuggestionPill}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "#eff3fd";
                    el.style.borderColor = "#7c3aed40";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "#F8FAFF";
                    el.style.borderColor = "var(--border)";
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Toolbar / Footer Action Icons */}
      <div style={styles.cardFooter}>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={styles.toolbarIconBtn} onClick={handleCopy} title={copied ? "Copied!" : "Copy text"}>
            {copied ? <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Copied!</span> : <Copy size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  msgSuggestions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px dashed var(--border)",
  },
  msgSuggestionsLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--muted-foreground)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  msgSuggestionsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  msgSuggestionPill: {
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "#F8FAFF",
    color: "var(--foreground)",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    boxShadow: "0 1px 2px rgba(0,0,0,0.01)",
    outline: "none",
  },
  mdH1: {
    fontSize: "19px",
    fontWeight: 800,
    marginTop: "16px",
    marginBottom: "8px",
    color: "var(--foreground)",
    lineHeight: 1.35,
  },
  mdH2: {
    fontSize: "16.5px",
    fontWeight: 750,
    marginTop: "14px",
    marginBottom: "6px",
    color: "var(--foreground)",
    lineHeight: 1.35,
  },
  mdH3: {
    fontSize: "14.5px",
    fontWeight: 700,
    marginTop: "12px",
    marginBottom: "4px",
    color: "var(--foreground)",
    lineHeight: 1.35,
  },
  mdParagraph: {
    fontSize: "13.5px",
    lineHeight: 1.6,
    color: "var(--foreground)",
    margin: "0 0 10px 0",
  },
  mdUl: {
    listStyleType: "disc",
    paddingLeft: "20px",
    margin: "0 0 12px 0",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  mdOl: {
    listStyleType: "decimal",
    paddingLeft: "20px",
    margin: "0 0 12px 0",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  mdLi: {
    fontSize: "13.5px",
    lineHeight: 1.6,
    color: "var(--foreground)",
  },
  cardBubble: {
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.02)",
    width: "100%",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  botAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  senderName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--foreground)",
    marginRight: 8,
  },
  timestamp: {
    fontSize: 10.5,
    color: "var(--muted-foreground)",
  },
  moreBtn: {
    background: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    padding: 4,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingLeft: 2,
  },
  textBody: {
    fontSize: 13.5,
    color: "var(--foreground)",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    userSelect: "text" as const,
    cursor: "text",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: "1px solid var(--border)",
    paddingTop: 8,
    marginTop: 4,
  },
  toolbarIconBtn: {
    background: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    padding: 6,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    transition: "background 0.15s, color 0.15s",
  },
  typingRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  botAvatarSm: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "rgba(124, 58, 237, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typingBubble: {
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: "6px 14px 14px 14px",
    padding: "10px 16px",
    display: "flex",
    gap: 5,
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.01)",
  },
  typingDot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#7c3aed",
    animation: "propbot-dot 1.2s ease-in-out infinite",
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  // Email card
  emailCard: {
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  emailCardRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  emailAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  emailFrom: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--foreground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailAddr: {
    fontSize: 10.5,
    color: "var(--muted-foreground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailTypePill: {
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    color: "#fff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
  },
  emailSubject: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#7c3aed",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailSnippet: {
    fontSize: 11.5,
    color: "var(--muted-foreground)",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  emailFooter: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  sentimentDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  emailDate: {
    fontSize: 10.5,
    color: "var(--muted-foreground)",
    flex: 1,
  },
  unreadPill: {
    fontSize: 9,
    fontWeight: 700,
    background: "rgba(124,58,237,0.1)",
    color: "#7c3aed",
    padding: "2px 6px",
    borderRadius: 20,
    border: "1px solid rgba(124,58,237,0.2)",
  },
  // ── Jobs Panel styles ─────────────────────────────────────────────────────
  // Summary card (collapsed state)
  jobSummaryCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
    border: "1.5px solid #c4b5fd",
    borderRadius: 14,
    padding: "14px 16px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left" as const,
    fontFamily: "inherit",
    boxShadow: "0 2px 12px rgba(124,58,237,0.08)",
  },
  jobSummaryLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  jobSummaryIcon: {
    fontSize: 24,
    lineHeight: 1,
    flexShrink: 0,
  },
  jobSummaryTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#4c1d95",
    lineHeight: 1.2,
  },
  jobSummarySubtitle: {
    fontSize: 11.5,
    color: "#7c3aed",
    marginTop: 2,
    fontWeight: 500,
  },
  jobSummaryChevron: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },

  // Expanded panel
  jobPanel: {
    background: "#FFFFFF",
    border: "1.5px solid #e2d9f3",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(124,58,237,0.08)",
    width: "100%",
  },
  jobPanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
    borderBottom: "1px solid #e2d9f3",
  },
  jobPanelTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#4c1d95",
  },
  jobPanelClose: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#7c3aed",
    display: "flex",
    alignItems: "center",
    padding: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit",
    gap: 4,
  },
  jobPanelSection: {
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  jobPanelStepLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#7c3aed",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
  },

  // Job select row
  jobSelectRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    userSelect: "none" as const,
  },
  jobCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    border: "2px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  jobSelectRole: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--foreground)",
    lineHeight: 1.3,
  },
  jobSelectCompany: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    marginTop: 1,
  },
  jobSelectMatch: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(124,58,237,0.08)",
    padding: "1px 7px",
    borderRadius: 10,
  },
  jobSelectStatus: {
    fontSize: 9,
    fontWeight: 700,
    color: "#fff",
    padding: "1px 7px",
    borderRadius: 10,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },

  // Action buttons (2-col grid)
  jobActionBtn: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textAlign: "left" as const,
    gap: 3,
    fontFamily: "inherit",
  },

  // Proceed button
  jobProceedBtn: {
    width: "100%",
    padding: "11px 16px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#fff",
    border: "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
    transition: "all 0.2s ease",
    letterSpacing: "0.01em",
  },

  // Confirmation step styles
  confirmSectionLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
  },
  confirmJobRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  confirmJobDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    flexShrink: 0,
  },
  confirmJobRole: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--foreground)",
  },
  confirmJobAt: {
    fontSize: 12,
    color: "var(--muted-foreground)",
  },
  confirmViewBtn: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: 600,
    color: "#7c3aed",
    textDecoration: "none",
    flexShrink: 0,
  },
  confirmActionPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(124,58,237,0.06)",
    border: "1px solid rgba(124,58,237,0.2)",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#5b21b6",
  },
  confirmActionDesc: {
    fontWeight: 400,
    color: "#7c3aed",
    fontSize: 11.5,
  },
  confirmBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#fff",
    border: "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(124,58,237,0.28)",
    transition: "all 0.2s ease",
  },
  cancelBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    background: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  },

  // ── Scheduling / Analog Clock styles ─────────────────────────────────────
  analogClockCard: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "18px 20px",
    background: "#2c2c2e",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
  },
  analogDigitalTime: {
    fontSize: 32,
    fontWeight: 800,
    color: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, monospace",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  analogAmPm: {
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "inherit",
  },
  sliderLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 3,
    fontWeight: 500,
  },
  clockSlider: {
    width: "100%",
    accentColor: "#7c3aed",
    cursor: "pointer",
    height: 4,
  },
  scheduleInput: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 9,
    border: "1.5px solid #e2d9f3",
    fontSize: 12.5,
    background: "#fafafe",
    color: "var(--foreground)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s ease",
  },
  durationBtn: {
    flex: 1,
    padding: "8px 0",
    borderRadius: 8,
    border: "1.5px solid #e2e8f0",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  },
  scheduleSummaryCell: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column" as const,
    gap: 3,
  },
  scheduleSummaryCellLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
  },
  scheduleSummaryCellValue: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1e1b4b",
    lineHeight: 1.4,
  },

  // Legacy statusPill kept for non-job usage
  statusPill: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 20,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    alignSelf: "flex-start",
  },
  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    width: "100%",
  },
  statCell: {
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 20, fontWeight: 700, color: "#7c3aed" },
  statLabel: { fontSize: 10.5, color: "var(--muted-foreground)", textAlign: "center" as const },
  
  // Call / Meeting card redesigned with left date badge
  callCard: {
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.01)",
    width: "100%",
  },
  dateBadge: {
    width: 48,
    height: 52,
    borderRadius: 10,
    background: "#F43F5E",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(244, 63, 94, 0.25)",
  },
  dateBadgeMonth: {
    fontSize: 9,
    fontWeight: 700,
    color: "#FFFFFF",
    letterSpacing: "0.05em",
    opacity: 0.9,
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: 800,
    color: "#FFFFFF",
    lineHeight: 1,
    marginTop: 2,
  },
  callContent: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  callHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  callTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--foreground)",
    lineHeight: 1.3,
  },
  callStatusPill: {
    fontSize: 9,
    fontWeight: 700,
    padding: "1px 8px",
    borderRadius: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  callJobInfo: {
    fontSize: 11.5,
    color: "var(--muted-foreground)",
  },
  callNotes: {
    fontSize: 11.5,
    color: "var(--muted-foreground)",
    lineHeight: 1.4,
    background: "#F8FAFC",
    padding: "8px 10px",
    borderRadius: 8,
    margin: "4px 0",
    border: "1px solid var(--border)",
  },
  callFooterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  callDuration: {
    fontSize: 11,
    color: "var(--muted-foreground)",
  },
  meetBtn: {
    background: "#7c3aed",
    borderRadius: 8,
    padding: "5px 12px",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
    boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
    transition: "background 0.15s",
  },
};
