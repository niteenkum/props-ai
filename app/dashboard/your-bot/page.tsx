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

  const clearChat = () => setMessages([]);

  if (!isReady) return null;

  return (
    <div style={styles.page}>
      {/* ── Ciphy Header Card ────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerDot} />
          <div>
            <h2 style={styles.headerTitle}>Create new multi-prompt</h2>
            <p style={styles.headerSub}>Powered by Gemini · Gmail · Corsair</p>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          <button
            onClick={clearChat}
            style={styles.newTopicBtn}
          >
            <Plus size={15} />
            New topic
          </button>
          
          <div style={styles.divider} />
          
          <button style={styles.actionIconBtn} title="Share">
            <Share2 size={15} />
          </button>
          <button style={styles.actionIconBtn} title="Settings">
            <Settings size={15} />
          </button>
          <button style={styles.actionIconBtn} onClick={clearChat} title="Clear conversation">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Chat Content Scroll Area ─────────────────────────────────────── */}
      <div style={styles.body}>
        {/* EMPTY STATE */}
        {!hasMessages && !loading && (
          <div style={styles.emptyState}>
            <PropBotOrb />
            <div style={styles.greetingBlock}>
              <h1 style={styles.greeting}>Hi! I'm The Pitchly AI.</h1>
              <p style={styles.greetingSub}>{customGreeting}</p>
              <p style={styles.greetingHint}>
                Ask me anything — search Gmail, draft emails, view job metrics, and schedule outreach.
              </p>
            </div>
            <QuickActionsGrid onSelect={(p) => handleSend(p)} />
          </div>
        )}

        {/* MESSAGES THREAD */}
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

      {/* ── Bottom Input Container ──────────────────────────────────────── */}
      <div style={styles.bottom}>
        {/* Suggested Pills */}
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
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <div id="propbot-textarea-wrap" style={styles.inputWrap}>
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
        #propbot-input::placeholder { color: var(--muted-foreground); opacity: 0.6; }
        #propbot-input:focus { outline: none; }
        #propbot-textarea-wrap:focus-within {
          border-color: #7c3aed !important;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.08);
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
    borderTop: "1px solid var(--border)",
    background: "#FFFFFF",
    padding: "16px 20px 20px",
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
    fontSize: 10.5,
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
    padding: "5px 12px",
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
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "#FFFFFF",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
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
    width: 34,
    height: 34,
    background: "#7c3aed",
    border: "none",
    borderRadius: 8,
    color: "#FFFFFF",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
  },
};
