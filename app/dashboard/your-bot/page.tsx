"use client";

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PropBot AI — Full Dashboard Page                   ║
 * ║  /dashboard/your-bot                                ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * File structure (all inside app/dashboard/your-bot/):
 *   page.tsx             ← this file (main page + chat logic)
 *   PropBotOrb.tsx       ← animated floating orb
 *   QuickActionsGrid.tsx ← 6 quick action cards
 *   MessageBubble.tsx    ← chat message + rich result cards
 *   DraftEmailCard.tsx   ← editable email compose card
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Clock, Trash2, Sparkles } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  processDashboardChatAction,
  sendDraftEmailAction,
  ChatMessage,
  DraftEmail,
} from "../../actions/chat-actions";
import PropBotOrb from "./PropBotOrb";
import QuickActionsGrid from "./QuickActionsGrid";
import MessageBubble, { TypingIndicator, UIMessage } from "./MessageBubble";

// ─── Suggested latest prompts ──────────────────────────────────────────────

const LATEST_PROMPTS = [
  "What's my average match score?",
  "Any interview requests in my inbox?",
  "Draft a follow-up for last week's applications",
  "Which companies have I sent emails to?",
  "How many jobs am I actively tracking?",
];

// ─── Page Component ────────────────────────────────────────────────────────

export default function PropBotPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });

  const [messages, setMessages]   = useState<UIMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const messagesEndRef             = useRef<HTMLDivElement>(null);
  const inputRef                   = useRef<HTMLTextAreaElement>(null);
  const hasMessages                = messages.length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Send a message ──────────────────────────────────────────────────────

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
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: "user", content: prompt });

      const result = await processDashboardChatAction(userEmail, history);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          actionType: result.actionType,
          actionData: result.actionData,
          timestamp: new Date(),
        },
      ]);
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

  async function handleSendDraft(draft: DraftEmail) {
    if (!userEmail) throw new Error("Not authenticated");
    const result = await sendDraftEmailAction(userEmail, draft);
    if (!result.success) throw new Error(result.error ?? "Failed to send");
  }

  const clearChat = () => setMessages([]);

  if (!isReady) return null;

  return (
    <>
      {/* Global keyframes */}
      <style>{`
        @keyframes propbot-dot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes propbot-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #propbot-input::placeholder { color: var(--muted-foreground); opacity: 0.6; }
        #propbot-input:focus { outline: none; }
        #propbot-textarea-wrap:focus-within {
          border-color: rgba(124,58,237,0.5) !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }
      `}</style>

      <div style={styles.page}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <Sparkles size={16} color="var(--primary-foreground)" />
            </div>
            <div>
              <h2 style={styles.headerTitle}>PropBot AI</h2>
              <p style={styles.headerSub}>Powered by Gemini · Gmail · Corsair</p>
            </div>
          </div>
          {hasMessages && (
            <button
              id="propbot-clear-btn"
              onClick={clearChat}
              style={styles.clearBtn}
              title="Clear conversation"
            >
              <Trash2 size={14} />
              Clear chat
            </button>
          )}
        </div>

        {/* ── Main area: either empty state or chat ───────────────────── */}
        <div style={styles.body}>

          {/* EMPTY STATE: orb + greeting + quick actions */}
          {!hasMessages && !loading && (
            <div style={styles.emptyState}>
              <PropBotOrb />
              <div style={styles.greetingBlock}>
                <h1 style={styles.greeting}>Hi! I'm PropBot.</h1>
                <p style={styles.greetingSub}>
                  How can I help you today?
                </p>
                <p style={styles.greetingHint}>
                  Ask me anything — I can search your Gmail, draft emails, show job stats, and more.
                </p>
              </div>
              <QuickActionsGrid onSelect={(p) => handleSend(p)} />
            </div>
          )}

          {/* CHAT HISTORY */}
          {hasMessages && (
            <div style={styles.chatHistory}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ animation: "propbot-fadein 0.25s ease" }}>
                  <MessageBubble msg={msg} onSendDraft={handleSendDraft} />
                </div>
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Bottom: suggested prompts + input ─────────────────────── */}
        <div style={styles.bottom}>
          {/* Latest prompts row */}
          {!loading && (
            <div style={styles.promptsRow}>
              <div style={styles.promptsLabel}>
                <Clock size={12} />
                Suggestions
              </div>
              <div style={styles.promptsPills}>
                {LATEST_PROMPTS.map((p) => (
                  <button
                    key={p}
                    style={styles.promptPill}
                    onClick={() => handleSend(p)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.5)";
                      (e.currentTarget as HTMLElement).style.color = "#7c3aed";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input box */}
          <div
            id="propbot-textarea-wrap"
            style={styles.inputWrap}
          >
            <textarea
              ref={inputRef}
              id="propbot-input"
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… search inbox, draft email, check stats (Enter to send)"
              rows={1}
              disabled={loading}
            />
            <div style={styles.inputActions}>
              <span style={styles.inputHint}>⏎ Send</span>
              <button
                id="propbot-send-btn"
                style={{
                  ...styles.sendBtn,
                  opacity: !input.trim() || loading ? 0.5 : 1,
                  cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                }}
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
              >
                {loading ? "⏳" : "➤"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 32px)",
    maxHeight: "calc(100vh - 32px)",
    overflow: "hidden",
    gap: 0,
  },
  // Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border)",
    background: "var(--card)",
    borderRadius: "16px 16px 0 0",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "var(--foreground)",
    margin: 0,
    lineHeight: 1.2,
  },
  headerSub: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    margin: 0,
    marginTop: 2,
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted-foreground)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  // Body (scrollable)
  body: {
    flex: 1,
    overflowY: "auto",
    background: "var(--background)",
    scrollbarWidth: "thin" as const,
    scrollbarColor: "var(--border) transparent",
  },
  // Empty state
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    padding: "48px 24px 32px",
    minHeight: "100%",
  },
  greetingBlock: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  greeting: {
    fontSize: 30,
    fontWeight: 700,
    color: "var(--foreground)",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  greetingSub: {
    fontSize: 22,
    fontWeight: 600,
    color: "var(--foreground)",
    margin: 0,
    opacity: 0.8,
  },
  greetingHint: {
    fontSize: 13,
    color: "var(--muted-foreground)",
    margin: 0,
    maxWidth: 420,
  },
  // Chat history
  chatHistory: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "24px 20px",
    maxWidth: 820,
    margin: "0 auto",
    width: "100%",
  },
  // Bottom bar
  bottom: {
    borderTop: "1px solid var(--border)",
    background: "var(--card)",
    padding: "14px 20px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flexShrink: 0,
    borderRadius: "0 0 16px 16px",
  },
  promptsRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    overflowX: "auto" as const,
    scrollbarWidth: "none" as const,
  },
  promptsLabel: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--muted-foreground)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
  },
  promptsPills: {
    display: "flex",
    gap: 7,
    overflowX: "auto" as const,
    scrollbarWidth: "none" as const,
  },
  promptPill: {
    padding: "5px 13px",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted-foreground)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    transition: "border-color 0.15s, color 0.15s",
    fontFamily: "inherit",
  },
  inputWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--input)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    resize: "none" as const,
    fontSize: 14,
    color: "var(--foreground)",
    lineHeight: 1.6,
    maxHeight: 120,
    overflowY: "auto" as const,
    fontFamily: "inherit",
  },
  inputActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  inputHint: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    opacity: 0.5,
    whiteSpace: "nowrap" as const,
  },
  sendBtn: {
    width: 38,
    height: 38,
    background: "var(--primary)",
    border: "none",
    borderRadius: 10,
    color: "var(--primary-foreground)",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
  },
};
