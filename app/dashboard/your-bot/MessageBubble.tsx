"use client";

/**
 * PropBot AI — Chat message bubble components.
 * Renders user and assistant messages as clean white card blocks with headers
 * and inline action items.
 */

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, Share2, MoreHorizontal, Sparkles, Video, Calendar } from "lucide-react";
import type { ChatResponse, DraftEmail } from "../../actions/chat-actions";
import DraftEmailCard from "./DraftEmailCard";

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

// ─── Email Result Card (received inbox emails) ───────────────────────────────
function EmailResultCard({ email }: { email: any }) {
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
    <div style={styles.emailCard}>
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
      </div>
    </div>
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

// ─── Job Result Card ──────────────────────────────────────────────────────────
function JobResultCard({ job }: { job: any }) {
  const statusColors: Record<string, string> = {
    Draft: "#64748b", Generated: "#8b5cf6", Sent: "#3b82f6",
    Interviewing: "#22c55e", Declined: "#ef4444",
  };
  return (
    <div style={styles.jobCard}>
      <div style={styles.jobCardRow}>
        <div>
          <div style={styles.jobRole}>{job.role}</div>
          <div style={styles.jobCompany}>{job.company}</div>
        </div>
        <div style={styles.matchBadge}>{job.matchScore}%</div>
      </div>
      {job.contactEmail && <div style={styles.jobEmail}>{job.contactEmail}</div>}
      <div style={{ ...styles.statusPill, background: statusColors[job.status] || "#64748b" }}>
        {job.status}
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsResultCard({ stats }: { stats: any }) {
  return (
    <div style={styles.statsGrid}>
      {[
        { label: "Total Jobs", value: stats.total ?? 0, emoji: "📋" },
        { label: "Sent", value: stats.sent ?? 0, emoji: "📤" },
        { label: "Interviewing", value: stats.interviewing ?? 0, emoji: "🎯" },
        { label: "Avg Match", value: `${stats.avgMatchScore ?? 0}%`, emoji: "⭐" },
      ].map((s) => (
        <div key={s.label} style={styles.statCell}>
          <span style={styles.statEmoji}>{s.emoji}</span>
          <span style={styles.statValue}>{s.value}</span>
          <span style={styles.statLabel}>{s.label}</span>
        </div>
      ))}
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

        {call.job && (
          <div style={styles.callJobInfo}>
            {call.job.role} at <span style={{ fontWeight: 600 }}>{call.job.company}</span>
          </div>
        )}

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

// ─── Main Message Bubble (Ciphy White Card Layout) ───────────────────────────
interface MessageBubbleProps {
  msg: UIMessage;
  userName?: string;
  onSendDraft: (draft: DraftEmail) => Promise<void>;
}

export default function MessageBubble({ msg, userName = "Niteen Kumar", onSendDraft }: MessageBubbleProps) {
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
            <div style={styles.botAvatarBadge}>
              <Sparkles size={14} color="#FFFFFF" />
            </div>
          )}
          
          <div>
            <span style={styles.senderName}>{isUser ? userName : "Multi-Prompt AI"}</span>
            <span style={styles.timestamp}>{formatTime(msg.timestamp)}</span>
          </div>
        </div>

        <button style={styles.moreBtn} title="Options">
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* Body Content */}
      <div style={styles.cardBody}>
        <div style={styles.textBody}>{msg.content}</div>

        {/* Embedded Result Cards */}
        {msg.actionType === "emails" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsList}>
            {(msg.actionData as any[]).map((e, i) =>
              e.toEmail && !e.fromName && !e.from
                ? <SentEmailResultCard key={i} email={e} />
                : <EmailResultCard key={i} email={e} />
            )}
          </div>
        ) : null}

        {msg.actionType === "jobs" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsList}>
            {(msg.actionData as any[]).map((j, i) => <JobResultCard key={i} job={j} />)}
          </div>
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
      </div>

      {/* Card Toolbar / Footer Action Icons */}
      <div style={styles.cardFooter}>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={styles.toolbarIconBtn} title="Like">
            <ThumbsUp size={13} />
          </button>
          <button style={styles.toolbarIconBtn} title="Dislike">
            <ThumbsDown size={13} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button style={styles.toolbarIconBtn} onClick={handleCopy} title={copied ? "Copied!" : "Copy text"}>
            {copied ? <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Copied!</span> : <Copy size={13} />}
          </button>
          <button style={styles.toolbarIconBtn} title="Share">
            <Share2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
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
  // Job card
  jobCard: {
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  jobCardRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  jobRole: { fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" },
  jobCompany: { fontSize: 11.5, color: "var(--muted-foreground)" },
  matchBadge: {
    fontSize: 11.5,
    fontWeight: 700,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 20,
    flexShrink: 0,
  },
  jobEmail: { fontSize: 10.5, color: "var(--muted-foreground)" },
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
