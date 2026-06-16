"use client";

/**
 * PropBot AI — Chat message bubble components.
 * Renders user and assistant messages including rich result cards.
 */

import React from "react";
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

function CallResultCard({ call }: { call: any }) {
  const overdue = new Date(call.scheduledAt).getTime() < Date.now() && call.status === "pending";
  const done = call.status === "done";
  const cancelled = call.status === "cancelled";

  const accentColor = done ? "#22c55e" : cancelled ? "#64748b" : overdue ? "#f59e0b" : "#8b5cf6";
  const statusLabel = done ? "Done" : cancelled ? "Cancelled" : overdue ? "Overdue" : "Upcoming";

  function fmtCallDateTime(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch {
      return iso;
    }
  }

  return (
    <div style={{ ...styles.callCard, borderLeft: `3px solid ${accentColor}` }}>
      <div style={styles.callHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.callTitle}>{call.title}</div>
          {call.job && (
            <div style={styles.callJobInfo}>
              {call.job.role} at <strong>{call.job.company}</strong>
            </div>
          )}
        </div>
        <div style={{ ...styles.callStatusPill, background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
          {statusLabel}
        </div>
      </div>
      
      <div style={styles.callTime}>
        <span>📅 {fmtCallDateTime(call.scheduledAt)} ({call.durationMin} mins)</span>
      </div>

      {call.notes && <div style={styles.callNotes}>{call.notes}</div>}

      {call.meetLink && call.status === "pending" && (
        <a
          href={call.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.meetBtn}
        >
          📹 Join Google Meet
        </a>
      )}
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div style={styles.typingRow}>
      <div style={styles.botAvatarSm}>🤖</div>
      <div style={styles.typingBubble}>
        <span style={{ ...styles.typingDot, animationDelay: "0ms" }} />
        <span style={{ ...styles.typingDot, animationDelay: "150ms" }} />
        <span style={{ ...styles.typingDot, animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ─── Main Message Bubble ──────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: UIMessage;
  onSendDraft: (draft: DraftEmail) => Promise<void>;
}

export default function MessageBubble({ msg, onSendDraft }: MessageBubbleProps) {
  const isUser = msg.role === "user";

  return (
    <div style={{ ...styles.msgRow, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && <div style={styles.botAvatarSm}>🤖</div>}

      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Text bubble */}
        <div style={isUser ? styles.userBubble : styles.botBubble}>
          {msg.content}
        </div>

        {/* Rich result cards */}
        {msg.actionType === "emails" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsList}>
            {(msg.actionData as any[]).map((e, i) =>
              // Detect sent emails by the presence of 'toEmail' (outbound) vs 'fromEmail'/'from' (inbound)
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

      {isUser && (
        <div style={styles.userAvatarSm}>✨</div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  msgRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
  },
  botAvatarSm: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))",
    border: "1px solid rgba(124,58,237,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    flexShrink: 0,
  },
  userAvatarSm: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(124,58,237,0.12)",
    border: "1px solid rgba(124,58,237,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
  },
  botBubble: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "6px 18px 18px 18px",
    padding: "12px 16px",
    fontSize: 14,
    color: "var(--foreground)",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxShadow: "var(--card-shadow)",
  },
  userBubble: {
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    borderRadius: "18px 6px 18px 18px",
    padding: "12px 16px",
    fontSize: 14,
    color: "#fff",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
  },
  typingRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  typingBubble: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "6px 18px 18px 18px",
    padding: "14px 20px",
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  typingDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#7c3aed",
    animation: "propbot-dot 1.2s ease-in-out infinite",
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  // Email card
  emailCard: {
    background: "var(--card)",
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
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  emailFrom: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--foreground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailAddr: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailTypePill: {
    fontSize: 9.5,
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
    fontSize: 13,
    fontWeight: 600,
    color: "#7c3aed",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailSnippet: {
    fontSize: 12,
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
    fontSize: 11,
    color: "var(--muted-foreground)",
    flex: 1,
  },
  unreadPill: {
    fontSize: 9.5,
    fontWeight: 700,
    background: "rgba(124,58,237,0.15)",
    color: "#7c3aed",
    padding: "2px 7px",
    borderRadius: 20,
    border: "1px solid rgba(124,58,237,0.25)",
  },
  // Job card
  jobCard: {
    background: "var(--card)",
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
  jobRole: { fontSize: 13, fontWeight: 600, color: "var(--foreground)" },
  jobCompany: { fontSize: 12, color: "var(--muted-foreground)" },
  matchBadge: {
    fontSize: 12,
    fontWeight: 700,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#fff",
    padding: "3px 9px",
    borderRadius: 20,
    flexShrink: 0,
  },
  jobEmail: { fontSize: 11, color: "var(--muted-foreground)" },
  statusPill: {
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    padding: "2px 9px",
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
  },
  statCell: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: 700, color: "#7c3aed" },
  statLabel: { fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" as const },
  callCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  callHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  callTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--foreground)",
    lineHeight: 1.35,
  },
  callJobInfo: {
    fontSize: 11.5,
    color: "var(--muted-foreground)",
    marginTop: 2,
  },
  callStatusPill: {
    fontSize: 9.5,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
  callTime: {
    fontSize: 11.5,
    color: "#7c3aed",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  callNotes: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    lineHeight: 1.4,
    background: "var(--input)",
    padding: "6px 8px",
    borderRadius: 6,
    whiteSpace: "pre-wrap" as const,
  },
  meetBtn: {
    background: "linear-gradient(135deg, #059669, #10b981)",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "inline-block",
    boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
    transition: "opacity 0.2s",
    marginTop: 4,
  },
};
