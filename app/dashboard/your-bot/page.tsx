"use client";

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PropBot AI — Full Dashboard Page                   ║
 * ║  /dashboard/your-bot                                ║
 * ╚══════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { Clock, Trash2, Sparkles, Plus, Settings, Share2, MoreHorizontal } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import {
  processDashboardChatAction,
  sendDraftEmailAction,
  bookCallFromBotAction,
  ChatMessage,
  DraftEmail,
} from "../../actions/chat-actions";
import PropBotOrb from "./PropBotOrb";
import QuickActionsGrid from "./QuickActionsGrid";
import MessageBubble, { TypingIndicator, UIMessage } from "./MessageBubble";

// ─── Suggested prompts ──────────────────────────────────────────────────────
const LATEST_PROMPTS = [
  "What's my average match score?",
  "Any interview requests in my inbox?",
  "Draft a follow-up for last week's applications",
  "Which companies have I sent emails to?",
  "How many jobs am I actively tracking?",
];

// Wrap core logic in a client component to safely use searchParams inside Suspense
function PropBotContent() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const searchParams = useSearchParams();

  const [messages, setMessages]   = useState<UIMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [customGreeting, setCustomGreeting] = useState("How can I help you today?");
  const messagesEndRef             = useRef<HTMLDivElement>(null);
  const inputRef                   = useRef<HTMLTextAreaElement>(null);
  const hasMessages                = messages.length > 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatbot_greeting");
      if (saved) {
        setCustomGreeting(saved);
      }
    }
  }, []);

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

  const handleSelectSuggestion = useCallback((prompt: string) => {
    if (prompt.includes("[Paste job description here]")) {
      const template = "Here is a job description. Please create a new job post and analyze it for me:\n\n";
      setInput(template);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = template.length;
          inputRef.current.selectionEnd = template.length;
        }
      }, 50);
    } else {
      handleSend(prompt);
    }
  }, [handleSend]);

  // Listen to url search parameters (q to auto-send, new to clear)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      handleSend(q);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [searchParams, handleSend]);

  useEffect(() => {
    const isNew = searchParams.get("new") === "true";
    if (isNew) {
      setMessages([]);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [searchParams]);

  async function handleSendDraft(draft: DraftEmail) {
    if (!userEmail) throw new Error("Not authenticated");
    const result = await sendDraftEmailAction(userEmail, draft);
    if (!result.success) throw new Error(result.error ?? "Failed to send");
  }

  async function handleBookCall(input: {
    jobId: string; jobRole: string; jobCompany: string;
    title: string; startDateTime: string; durationMinutes: number;
    attendeeEmail?: string; notes?: string;
  }) {
    if (!userEmail) throw new Error("Not authenticated");
    return bookCallFromBotAction(userEmail, input);
  }

  const clearChat = () => setMessages([]);

  if (!isReady) return null;

  return (
    <div style={styles.page}>

      {/* ── Chat Content Scroll Area ─────────────────────────────────────── */}
      <div style={styles.body}>
        {/* EMPTY STATE */}
        {!hasMessages && !loading && (
          <div style={styles.emptyState}>
            <PropBotOrb size={140} state="idle" />
            <div style={styles.greetingBlock}>
              <h1 style={styles.greeting}>Hi! I&apos;m The Pitchly AI.</h1>
              <p style={styles.greetingSub}>{customGreeting}</p>
              <p style={styles.greetingHint}>
                Ask me anything — draft proposals, calculate freelance rates, find gig leads, and track active clients.
              </p>
            </div>
            <QuickActionsGrid onSelect={handleSelectSuggestion} />
          </div>
        )}

        {/* LOADING EMPTY STATE — orb shows thinking */}
        {!hasMessages && loading && (
          <div style={{ ...styles.emptyState, gap: 20 }}>
            <PropBotOrb size={140} state="thinking" />
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", opacity: 0.7 }}>Thinking...</p>
          </div>
        )}

        {/* MESSAGES THREAD */}
        {hasMessages && (
          <div style={styles.chatHistory}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ animation: "propbot-fadein 0.25s ease" }}>
                <MessageBubble msg={msg} userEmail={userEmail ?? undefined} onSendDraft={handleSendDraft} onSelectSuggestion={handleSelectSuggestion} onBookCall={handleBookCall} />
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Bottom Input Container ──────────────────────────────────────── */}
      <div style={styles.bottom}>
        {/* Premium floating input */}
        <div id="propbot-input-outer" style={styles.inputOuter}>
          {/* Top row: textarea */}
          <textarea
            ref={inputRef}
            id="propbot-input"
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — draft proposals, track clients, paste a job lead…"
            rows={2}
            disabled={loading}
          />
          {/* Bottom row: hint + send button */}
          <div style={styles.inputFooterRow}>
            <div style={styles.inputMeta}>
              <span style={styles.inputMetaDot} />
              <span style={styles.inputMetaText}>
                {loading ? "Pitchly AI is thinking…" : "Press Enter to send · Shift+Enter for new line"}
              </span>
            </div>
            <button
              id="propbot-send-btn"
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || loading ? 0.45 : 1,
                cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <span style={{ fontSize: 16 }}>⏳</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropBotPage() {
  return (
    <>
      <style>{`
        @keyframes propbot-dot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes propbot-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes propbot-border-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        #propbot-input::placeholder {
          color: #94a3b8;
          font-size: 14px;
        }
        #propbot-input:focus { outline: none; }
        #propbot-input-outer {
          position: relative;
          border-radius: 16px;
          background: linear-gradient(145deg, #ffffff, #f8f7ff);
          box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08), 0 1px 4px rgba(0,0,0,0.04);
          border: 1.5px solid #e2d9f3;
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }
        #propbot-input-outer:focus-within {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08), 0 4px 24px rgba(124, 58, 237, 0.12);
        }
        #propbot-send-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #6d28d9, #4f46e5) !important;
          transform: scale(1.04);
        }
        #propbot-send-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>
      
      <Suspense fallback={<div>Loading chats...</div>}>
        <PropBotContent />
      </Suspense>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 28px)",
    maxHeight: "calc(100vh - 28px)",
    overflow: "hidden",
    gap: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    background: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: "16px 16px 0 0",
    flexShrink: 0,
    boxShadow: "0 2px 10px rgba(0,0,0,0.01)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#7c3aed",
    boxShadow: "0 0 8px rgba(124,58,237,0.6)",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--foreground)",
    margin: 0,
    lineHeight: 1.2,
  },
  headerSub: {
    fontSize: 10.5,
    color: "var(--muted-foreground)",
    margin: 0,
    marginTop: 2,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  newTopicBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 8,
    background: "#7c3aed",
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
    transition: "background 0.15s",
  },
  actionIconBtn: {
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
  divider: {
    width: 1,
    height: 20,
    background: "var(--border)",
    margin: "0 4px",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    background: "var(--background)",
    scrollbarWidth: "thin" as const,
    scrollbarColor: "var(--border) transparent",
    border: "1px solid var(--border)",
    borderBottom: "none",
    borderRadius: "16px 16px 0 0",
  },
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
    fontSize: 28,
    fontWeight: 700,
    color: "var(--foreground)",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  greetingSub: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--foreground)",
    margin: 0,
    opacity: 0.85,
  },
  greetingHint: {
    fontSize: 13,
    color: "var(--muted-foreground)",
    margin: 0,
    maxWidth: 440,
  },
  chatHistory: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: "24px 20px",
    maxWidth: 860,
    margin: "0 auto",
    width: "100%",
  },
  bottom: {
    background: "linear-gradient(180deg, transparent 0%, rgba(248,247,255,0.8) 30%, #f8f7ff 100%)",
    padding: "16px 20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    flexShrink: 0,
    borderRadius: "0 0 16px 16px",
  },
  inputOuter: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    padding: "14px 16px 12px",
    borderRadius: 16,
  },
  input: {
    background: "transparent",
    border: "none",
    resize: "none" as const,
    fontSize: 14.5,
    color: "#1e1b4b",
    lineHeight: 1.65,
    maxHeight: 140,
    overflowY: "auto" as const,
    fontFamily: "inherit",
    width: "100%",
    outline: "none",
    padding: 0,
  },
  inputFooterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid rgba(124,58,237,0.1)",
  },
  inputMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  inputMetaDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    flexShrink: 0,
    boxShadow: "0 0 6px rgba(124,58,237,0.4)",
  },
  inputMetaText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
  },
  sendBtn: {
    width: 38,
    height: 38,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    borderRadius: 12,
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
    cursor: "pointer",
  },
};
