"use client";

/**
 * ThePitchly Dashboard Chatbot — Floating AI Assistant
 *
 * A premium glassmorphic chat bubble that lets users interact with
 * their Gmail, job applications, and AI assistant in one place.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  processDashboardChatAction,
  sendDraftEmailAction,
  ChatMessage,
  ChatResponse,
  DraftEmail,
} from "../actions/chat-actions";
import { useAuth } from "../hooks/useAuth";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionType?: ChatResponse["actionType"];
  actionData?: unknown;
  timestamp: Date;
}

// ─── Sub-Components ────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={styles.typingBubble}>
      <div style={styles.dotWrapper}>
        <span style={{ ...styles.dot, animationDelay: "0ms" }} />
        <span style={{ ...styles.dot, animationDelay: "150ms" }} />
        <span style={{ ...styles.dot, animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function EmailCard({ email }: { email: any }) {
  const sentimentColor =
    email.sentiment === "positive"
      ? "#22c55e"
      : email.sentiment === "negative"
      ? "#ef4444"
      : "#94a3b8";

  const typeColors: Record<string, string> = {
    interview_call: "#8b5cf6",
    offer_letter: "#22c55e",
    rejection: "#ef4444",
    freelance_opportunity: "#f59e0b",
    remote_opportunity: "#3b82f6",
    general: "#64748b",
  };

  return (
    <div style={styles.emailCard}>
      <div style={styles.emailCardHeader}>
        <div style={styles.emailAvatar}>
          {(email.fromName || email.from || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.emailFrom}>{email.fromName || email.from || "Unknown"}</div>
          <div style={styles.emailAddress}>{email.from || email.fromEmail || ""}</div>
        </div>
        <div style={{ ...styles.emailTypePill, background: typeColors[email.emailType] || "#64748b" }}>
          {(email.emailType || "general").replace("_", " ")}
        </div>
      </div>
      <div style={styles.emailSubject}>{email.subject || "(no subject)"}</div>
      <div style={styles.emailSnippet}>{email.snippet || email.summary || email.aiSummary || ""}</div>
      <div style={styles.emailFooter}>
        <span style={{ ...styles.sentimentDot, background: sentimentColor }} />
        <span style={styles.emailDate}>
          {email.date || (email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : "")}
        </span>
        {!email.isRead && <span style={styles.unreadBadge}>New</span>}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: any }) {
  const statusColors: Record<string, string> = {
    Draft: "#64748b",
    Generated: "#8b5cf6",
    Sent: "#3b82f6",
    Interviewing: "#22c55e",
    Declined: "#ef4444",
  };

  return (
    <div style={styles.jobCard}>
      <div style={styles.jobHeader}>
        <div>
          <div style={styles.jobRole}>{job.role}</div>
          <div style={styles.jobCompany}>{job.company}</div>
        </div>
        <div style={styles.matchBadge}>{job.matchScore}%</div>
      </div>
      {job.contactEmail && <div style={styles.jobEmail}>{job.contactEmail}</div>}
      <div style={{ ...styles.jobStatusPill, background: statusColors[job.status] || "#64748b" }}>
        {job.status}
      </div>
    </div>
  );
}

function StatsCard({ stats }: { stats: any }) {
  return (
    <div style={styles.statsGrid}>
      {[
        { label: "Total Jobs", value: stats.total ?? 0, icon: "📋" },
        { label: "Sent", value: stats.sent ?? 0, icon: "📤" },
        { label: "Interviewing", value: stats.interviewing ?? 0, icon: "🎯" },
        { label: "Avg Match", value: `${stats.avgMatchScore ?? 0}%`, icon: "⭐" },
      ].map((item) => (
        <div key={item.label} style={styles.statItem}>
          <div style={styles.statIcon}>{item.icon}</div>
          <div style={styles.statValue}>{item.value}</div>
          <div style={styles.statLabel}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function CallCard({ call }: { call: any }) {
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

function DraftCard({
  draft,
  onSend,
  onEdit,
  userEmail,
}: {
  draft: DraftEmail;
  onSend: (d: DraftEmail, provider?: "gmail" | "zoho") => void;
  onEdit: (d: DraftEmail) => void;
  userEmail?: string;
}) {
  const [editDraft, setEditDraft] = useState<DraftEmail>(draft);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<"gmail" | "zoho">("gmail");

  useEffect(() => {
    if (!userEmail) return;
    import("../actions/mail-actions").then(({ getMailAccountsAction }) => {
      getMailAccountsAction(userEmail).then((accounts) => {
        const providers = accounts.map(a => a.provider).filter(Boolean);
        setConnectedProviders(providers);
        if (providers.includes("zoho") && !providers.includes("gmail")) {
          setSelectedProvider("zoho");
        } else {
          setSelectedProvider("gmail");
        }
      }).catch(err => {
        console.error("Failed to load connected mail accounts", err);
      });
    });
  }, [userEmail]);

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      await onSend(editDraft, selectedProvider);
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{ ...styles.draftCard, borderColor: "#22c55e44" }}>
        <div style={{ textAlign: "center", color: "#22c55e", padding: "12px 0" }}>
          ✅ Email sent successfully via {selectedProvider === "zoho" ? "Zoho" : "Gmail"}!
        </div>
      </div>
    );
  }

  const hasBoth = connectedProviders.includes("gmail") && connectedProviders.includes("zoho");

  return (
    <div style={styles.draftCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={styles.draftHeader}>
          <span style={styles.draftHeaderIcon}>✉️</span>
          <span style={styles.draftHeaderText}>Review Draft</span>
        </div>
        {hasBoth ? (
          <div style={styles.providerSelector}>
            <button
              style={{
                ...styles.providerTab,
                ...(selectedProvider === "gmail" ? styles.providerTabActiveGmail : {}),
              }}
              onClick={() => setSelectedProvider("gmail")}
            >
              Gmail
            </button>
            <button
              style={{
                ...styles.providerTab,
                ...(selectedProvider === "zoho" ? styles.providerTabActiveZoho : {}),
              }}
              onClick={() => setSelectedProvider("zoho")}
            >
              Zoho
            </button>
          </div>
        ) : (
          <span style={selectedProvider === "zoho" ? styles.zohoBadge : styles.gmailBadge}>
            {selectedProvider === "zoho" ? "Zoho" : "Gmail"}
          </span>
        )}
      </div>
      <div style={styles.draftField}>
        <label style={styles.draftLabel}>To</label>
        <input
          style={styles.draftInput}
          value={editDraft.to}
          onChange={(e) => setEditDraft({ ...editDraft, to: e.target.value })}
        />
      </div>
      {editDraft.cc !== undefined && (
        <div style={styles.draftField}>
          <label style={styles.draftLabel}>CC</label>
          <input
            style={styles.draftInput}
            value={editDraft.cc ?? ""}
            onChange={(e) => setEditDraft({ ...editDraft, cc: e.target.value })}
          />
        </div>
      )}
      <div style={styles.draftField}>
        <label style={styles.draftLabel}>Subject</label>
        <input
          style={styles.draftInput}
          value={editDraft.subject}
          onChange={(e) => setEditDraft({ ...editDraft, subject: e.target.value })}
        />
      </div>
      <div style={styles.draftField}>
        <label style={styles.draftLabel}>Body</label>
        <textarea
          style={{ ...styles.draftInput, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
          value={editDraft.body}
          onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
        />
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: 12, padding: "4px 0" }}>{error}</div>}
      <button
        id="chat-send-email-btn"
        style={styles.sendEmailBtn}
        onClick={handleSend}
        disabled={sending}
      >
        {sending ? "Sending…" : `📤 Send via ${selectedProvider === "zoho" ? "Zoho" : "Gmail"}`}
      </button>
    </div>
  );
}

function MessageBubble({
  msg,
  userEmail,
  onSendDraft,
}: {
  msg: UIMessage;
  userEmail?: string;
  onSendDraft: (d: DraftEmail, provider?: "gmail" | "zoho") => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div style={{ ...styles.messageRow, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <div style={styles.botAvatar}>🤖</div>
      )}
      <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={isUser ? styles.userBubble : styles.botBubble}>
          {msg.content}
        </div>

        {/* Rich action cards */}
        {msg.actionType === "emails" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsContainer}>
            {(msg.actionData as any[]).map((email, i) => (
              <EmailCard key={i} email={email} />
            ))}
          </div>
        ) : null}
        {msg.actionType === "jobs" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsContainer}>
            {(msg.actionData as any[]).map((job, i) => (
              <JobCard key={i} job={job} />
            ))}
          </div>
        ) : null}
        {msg.actionType === "stats" && msg.actionData ? (
          <StatsCard stats={msg.actionData as any} />
        ) : null}
        {msg.actionType === "calls" && Array.isArray(msg.actionData) ? (
          <div style={styles.cardsContainer}>
            {(msg.actionData as any[]).map((call, i) => (
              <CallCard key={i} call={call} />
            ))}
          </div>
        ) : null}
        {msg.actionType === "draft" && msg.actionData ? (
          <DraftCard
            draft={msg.actionData as DraftEmail}
            onSend={onSendDraft}
            onEdit={(_d) => {}}
            userEmail={userEmail}
          />
        ) : null}
      </div>
      {isUser && (
        <div style={styles.userAvatar}>✨</div>
      )}
    </div>
  );
}

// ─── Main Chatbot Component ─────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "📧 Draft cold email", prompt: "Help me draft a cold email to a potential client" },
  { label: "🔍 Search my inbox", prompt: "Search my Gmail inbox for recent recruiter emails" },
  { label: "📊 Outreach stats", prompt: "Show me my job outreach statistics" },
  { label: "📬 Recruiter replies", prompt: "Fetch emails from recruiters in my inbox" },
];

export default function DashboardChatBot() {
  const { userEmail } = useAuth({ requiredStatus: "ACTIVE" });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! 👋 I'm The Pitchly AI, your AI assistant. I can search your Gmail, show your job stats, draft emails, and more. What can I help you with?",
      actionType: "text",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = useCallback(async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading || !userEmail) return;

    setInput("");
    const userMsg: UIMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build history for Gemini (exclude welcome message)
      const history: ChatMessage[] = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: prompt });

      const result = await processDashboardChatAction(userEmail, history);

      const botMsg: UIMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        actionType: result.actionType,
        actionData: result.actionData,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: err?.message ?? "Something went wrong. Please try again.",
          actionType: "error",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, userEmail, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  async function handleSendDraft(draft: DraftEmail, provider?: "gmail" | "zoho") {
    if (!userEmail) throw new Error("Not authenticated");
    const result = await sendDraftEmailAction(userEmail, draft, provider);
    if (!result.success) throw new Error(result.error ?? "Failed to send");
  }

  return (
    <>
      {/* Dot/pulse keyframes */}
      <style>{`
        @keyframes chatDotPulse {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes chatBubblePop {
          0% { transform: scale(0.8) translateY(12px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes chatPanelSlide {
          0% { transform: translateY(20px) scale(0.97); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes chatPulseBadge {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(139,92,246,0); }
        }
      `}</style>

      {/* Floating Trigger */}
      <button
        id="propbot-chat-trigger"
        onClick={() => setOpen((o) => !o)}
        style={styles.triggerBtn}
        aria-label="Open The Pitchly AI Assistant"
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>{open ? "✕" : "🤖"}</span>
        {!open && <div style={styles.pulseBadge} />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div style={styles.panel} role="dialog" aria-label="The Pitchly AI Chat">
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.headerAvatar}>🤖</div>
              <div>
                <div style={styles.headerTitle}>The Pitchly AI</div>
                <div style={styles.headerSub}>AI Assistant · Powered by Gemini</div>
              </div>
            </div>
            <button
              id="propbot-close-btn"
              onClick={() => setOpen(false)}
              style={styles.closeBtn}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={styles.messagesArea} id="propbot-messages-area">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} userEmail={userEmail ?? undefined} onSendDraft={handleSendDraft} />
            ))}
            {loading && <TypingDots />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && !loading && (
            <div style={styles.quickActions}>
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  id={`quick-action-${qa.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                  style={styles.quickPill}
                  onClick={() => handleSend(qa.prompt)}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              id="propbot-input"
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={loading}
            />
            <button
              id="propbot-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                ...styles.sendBtn,
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
              aria-label="Send message"
            >
              {loading ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  triggerBtn: {
    position: "fixed",
    bottom: 28,
    right: 28,
    zIndex: 9999,
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
    animation: "chatBubblePop 0.3s ease",
  },
  pulseBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#22c55e",
    animation: "chatPulseBadge 1.8s ease-in-out infinite",
    border: "2px solid #0f172a",
  },
  panel: {
    position: "fixed",
    bottom: 96,
    right: 24,
    zIndex: 9998,
    width: 420,
    maxHeight: "72vh",
    background: "rgba(15, 23, 42, 0.92)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
    animation: "chatPanelSlide 0.25s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    borderBottom: "1px solid rgba(139,92,246,0.15)",
    background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.08))",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    boxShadow: "0 4px 12px rgba(124,58,237,0.4)",
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#e2e8f0",
    fontFamily: "'Inter', sans-serif",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "'Inter', sans-serif",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    fontSize: 16,
    padding: "4px 8px",
    borderRadius: 8,
    transition: "color 0.2s",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(124,58,237,0.3) transparent",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed33, #4f46e533)",
    border: "1px solid rgba(139,92,246,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #0ea5e920, #7c3aed20)",
    border: "1px solid rgba(14,165,233,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    flexShrink: 0,
  },
  botBubble: {
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: "4px 16px 16px 16px",
    padding: "10px 14px",
    fontSize: 13.5,
    color: "#e2e8f0",
    lineHeight: 1.55,
    fontFamily: "'Inter', sans-serif",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    borderRadius: "16px 4px 16px 16px",
    padding: "10px 14px",
    fontSize: 13.5,
    color: "#fff",
    lineHeight: 1.55,
    fontFamily: "'Inter', sans-serif",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
  },
  typingBubble: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dotWrapper: {
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: "4px 16px 16px 16px",
    padding: "12px 18px",
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#7c3aed",
    animation: "chatDotPulse 1.2s ease-in-out infinite",
  },
  cardsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  emailCard: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(139,92,246,0.15)",
    borderRadius: 12,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    transition: "border-color 0.2s",
  },
  emailCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  emailAvatar: {
    width: 32,
    height: 32,
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
    fontSize: 12.5,
    fontWeight: 600,
    color: "#e2e8f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emailAddress: {
    fontSize: 10.5,
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emailTypePill: {
    fontSize: 9.5,
    fontWeight: 600,
    padding: "2px 7px",
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
    color: "#c4b5fd",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emailSnippet: {
    fontSize: 11.5,
    color: "#94a3b8",
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  emailFooter: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  sentimentDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  emailDate: {
    fontSize: 10.5,
    color: "#64748b",
    flex: 1,
  },
  unreadBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    background: "rgba(124,58,237,0.3)",
    color: "#c4b5fd",
    padding: "2px 6px",
    borderRadius: 20,
    border: "1px solid rgba(139,92,246,0.3)",
  },
  jobCard: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(139,92,246,0.15)",
    borderRadius: 12,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  jobHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  jobRole: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  jobCompany: {
    fontSize: 11.5,
    color: "#94a3b8",
  },
  matchBadge: {
    fontSize: 12,
    fontWeight: 700,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    padding: "3px 8px",
    borderRadius: 20,
    color: "#fff",
    flexShrink: 0,
  },
  jobEmail: {
    fontSize: 11,
    color: "#64748b",
  },
  jobStatusPill: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 20,
    color: "#fff",
    alignSelf: "flex-start",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  statItem: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(139,92,246,0.15)",
    borderRadius: 12,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#c4b5fd",
  },
  statLabel: {
    fontSize: 10.5,
    color: "#64748b",
    textAlign: "center" as const,
  },
  draftCard: {
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 14,
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  draftHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  draftHeaderIcon: { fontSize: 18 },
  draftHeaderText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#e2e8f0",
  },
  draftField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  draftLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  draftInput: {
    background: "rgba(30, 41, 59, 0.6)",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12.5,
    color: "#e2e8f0",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: "'Inter', sans-serif",
  },
  sendEmailBtn: {
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
    transition: "opacity 0.2s",
  },
  quickActions: {
    padding: "8px 14px",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    borderTop: "1px solid rgba(139,92,246,0.1)",
    flexShrink: 0,
  },
  quickPill: {
    background: "rgba(124,58,237,0.12)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 11.5,
    color: "#c4b5fd",
    cursor: "pointer",
    transition: "background 0.2s",
    fontFamily: "'Inter', sans-serif",
  },
  inputArea: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    padding: "12px 14px",
    borderTop: "1px solid rgba(139,92,246,0.12)",
    background: "rgba(15, 23, 42, 0.6)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "rgba(30, 41, 59, 0.7)",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    color: "#e2e8f0",
    outline: "none",
    resize: "none" as const,
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5,
    maxHeight: 100,
    overflowY: "auto" as const,
  },
  sendBtn: {
    width: 40,
    height: 40,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    color: "#fff",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
    flexShrink: 0,
    transition: "opacity 0.2s, transform 0.1s",
  },
  callCard: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(139,92,246,0.15)",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "border-color 0.2s",
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
    color: "#e2e8f0",
    lineHeight: 1.35,
  },
  callJobInfo: {
    fontSize: 11.5,
    color: "#94a3b8",
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
    color: "#c4b5fd",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  callNotes: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 1.4,
    background: "rgba(30, 41, 59, 0.4)",
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
  providerSelector: {
    display: "flex",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 2,
    border: "1px solid rgba(139,92,246,0.15)",
  },
  providerTab: {
    fontSize: 9.5,
    fontWeight: 600,
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    padding: "3px 8px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  providerTabActiveGmail: {
    background: "rgba(124, 58, 237, 0.2)",
    color: "#ff8a80",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  providerTabActiveZoho: {
    background: "rgba(124, 58, 237, 0.2)",
    color: "#60a5fa",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  gmailBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    padding: "2px 7px",
    borderRadius: 20,
    border: "1px solid rgba(239,68,68,0.2)",
  },
  zohoBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    background: "rgba(59,130,246,0.1)",
    color: "#60a5fa",
    padding: "2px 7px",
    borderRadius: 20,
    border: "1px solid rgba(59,130,246,0.2)",
  },
};
