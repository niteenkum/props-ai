"use client";

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PropBot AI — Full Dashboard Page                   ║
 * ║  /dashboard/your-bot                                ║
 * ╚══════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { Clock, Trash2, Sparkles, Plus, Settings, Share2, MoreHorizontal, Globe, Zap, Shield, ArrowRight, ChevronRight, Loader2, Send } from "lucide-react";
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

const AISparkleIcon = () => (
  <div className="relative w-16 h-16 flex items-center justify-center mb-2">
    <div className="absolute w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-xl opacity-15 dark:opacity-25 animate-pulse" style={{ animationDuration: "3s" }} />
    <svg className="w-12 h-12 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" fill="url(#ai-sparkle-grad)" />
      <path d="M19 3C19 5.2 17.2 7 15 7C17.2 7 19 8.8 19 11C19 8.8 20.8 7 23 7C20.8 7 19 5.2 19 3Z" fill="url(#ai-sparkle-grad-small)" />
      <defs>
        <linearGradient id="ai-sparkle-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="ai-sparkle-grad-small" x1="15" y1="3" x2="23" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

// Wrap core logic in a client component to safely use searchParams inside Suspense
function PropBotContent() {
  const { userEmail, userName, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const searchParams = useSearchParams();

  const [messages, setMessages]   = useState<UIMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [customGreeting, setCustomGreeting] = useState("How can I help you today?");
  const messagesEndRef             = useRef<HTMLDivElement>(null);
  const inputRef                   = useRef<HTMLTextAreaElement>(null);
  const hasMessages                = messages.length > 0;

  const [showPalette, setShowPalette] = useState(false);
  const [showHelper, setShowHelper]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteSearchRef = useRef<HTMLInputElement>(null);

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

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.max(44, Math.min(inputRef.current.scrollHeight, 160))}px`;
    }
  }, [input]);

  // Focus search input when palette opens
  useEffect(() => {
    if (showPalette) {
      setTimeout(() => {
        paletteSearchRef.current?.focus();
      }, 50);
    }
  }, [showPalette]);

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

  const COMMANDS = React.useMemo(() => [
    {
      id: "inbox",
      name: "Show Priority Inbox",
      shortcut: "⌘ I",
      description: "Fetch synced emails with AI priority classification",
      action: () => handleSend("Show me my priority inbox with AI-classified emails"),
    },
    {
      id: "pitch",
      name: "Draft Cold Pitch",
      shortcut: "⌘ E",
      description: "Write a personalized cold outreach pitch for clients",
      action: () => handleSend("Help me draft a personalized cold pitch to a potential client looking for a freelance web developer"),
    },
    {
      id: "create-job",
      name: "Create Job Post",
      shortcut: "⌘ J",
      description: "Paste a job description to create and analyze a job",
      action: () => {
        const template = "Here is a job description. Please create a new job post and analyze it for me:\n\n";
        setInput(template);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.selectionStart = template.length;
            inputRef.current.selectionEnd = template.length;
          }
        }, 50);
      }
    },
    {
      id: "stats",
      name: "Show Proposal Stats",
      shortcut: "⌘ D",
      description: "View outreach conversion rates and pipeline counts",
      action: () => handleSend("Show me my proposal statistics, active rates, and lead pipeline updates"),
    },
    {
      id: "schedule",
      name: "Schedule Client Call",
      shortcut: "⌘ .",
      description: "Schedule a Google Meet call linked to a job post",
      action: () => handleSend("Schedule a client call"),
    },
    {
      id: "clear",
      name: "Clear Conversation",
      shortcut: "⌘ ⌫",
      description: "Wipe chat history and reset screen",
      action: () => setMessages([]),
    }
  ], [handleSend, setInput, setMessages]);

  const filteredCommands = React.useMemo(() => {
    return COMMANDS.filter(cmd =>
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [COMMANDS, searchQuery]);

  // Listen for global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
         activeEl.tagName === "TEXTAREA" ||
         (activeEl as HTMLElement).isContentEditable);

      // Cmd+K or Ctrl+K toggle palette
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        setShowPalette((prev) => !prev);
        setSearchQuery("");
        setActiveIndex(0);
        return;
      }

      if (showPalette) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowPalette(false);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredCommands.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[activeIndex]) {
            filteredCommands[activeIndex].action();
            setShowPalette(false);
          }
          return;
        }
      } else {
        // Modifier-based shortcuts — safe, no conflict with typing
        const mod = e.metaKey || e.ctrlKey;
        if (mod) {
          const key = e.key?.toLowerCase();
          // Cmd/Ctrl + I → Priority Inbox
          if (key === "i") {
            e.preventDefault();
            handleSend("Show me my priority inbox with AI-classified emails");
          // Cmd/Ctrl + E → Draft cold pitch (email)
          } else if (key === "e") {
            e.preventDefault();
            handleSend("Help me draft a personalized cold pitch to a potential client looking for a freelance web developer");
          // Cmd/Ctrl + J → Create Job
          } else if (key === "j") {
            e.preventDefault();
            const template = "Here is a job description. Please create a new job post and analyze it for me:\n\n";
            setInput(template);
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.selectionStart = template.length;
                inputRef.current.selectionEnd = template.length;
              }
            }, 50);
          // Cmd/Ctrl + D → Dashboard stats
          } else if (key === "d") {
            e.preventDefault();
            handleSend("Show me my proposal statistics, active rates, and lead pipeline updates");
          // Cmd/Ctrl + . → Schedule call
          } else if (key === ".") {
            e.preventDefault();
            handleSend("Schedule a client call");
          // Cmd/Ctrl + Backspace → Clear chat
          } else if (e.key === "Backspace") {
            e.preventDefault();
            setMessages([]);
          }
        }
        // Esc always closes palette or blurs textarea
        if (e.key === "Escape" && !showPalette) {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showPalette, activeIndex, filteredCommands, handleSend]);

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

  async function handleSendDraft(draft: DraftEmail, provider?: "gmail" | "zoho") {
    if (!userEmail) throw new Error("Not authenticated");
    const result = await sendDraftEmailAction(userEmail, draft, provider);
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
      <div style={{ ...styles.body, position: "relative" }} className="overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-[-100px] left-[5%] w-[450px] h-[450px] bg-gradient-to-tr from-primary/10 via-blue-500/5 to-transparent blur-[110px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-[200px] right-[5%] w-[550px] h-[550px] bg-gradient-to-bl from-violet-500/10 via-primary/5 to-transparent blur-[130px] rounded-full pointer-events-none z-0" />
        {/* Grid overlay for texture */}
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] pointer-events-none z-0 opacity-25 dark:opacity-45" />
        {/* EMPTY STATE */}
        {!hasMessages && !loading && (
          <div style={styles.emptyState}>
            <AISparkleIcon />
            <div style={styles.greetingBlock}>
              <h1 style={styles.greeting}>
                How can I help you, {userName ? userName.split(" ")[0] : "today"}?
              </h1>
              <p style={styles.greetingHint}>
                Ask me anything — draft proposals, calculate freelance rates, or find new leads.
              </p>
              <div style={styles.keyboardTipContainer}>
                <span className="text-xs text-muted-foreground/60">Press </span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-muted-foreground">⌘ K</kbd>
                <span className="text-xs text-muted-foreground/60"> for command palette</span>
              </div>
            </div>
            <QuickActionsGrid onSelect={handleSelectSuggestion} />
          </div>
        )}

        {/* LOADING EMPTY STATE */}
        {!hasMessages && loading && (
          <div style={{ ...styles.emptyState, gap: 20 }}>
            <div className="animate-spin text-indigo-600 dark:text-indigo-400">
              <Loader2 size={36} />
            </div>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", opacity: 0.7 }}>Thinking...</p>
          </div>
        )}

        {/* MESSAGES THREAD */}
        {hasMessages && (
          <div style={styles.chatHistory}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  animation: "propbot-fadein 0.25s ease",
                  display: "flex",
                  width: "100%",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <MessageBubble msg={msg} userEmail={userEmail ?? undefined} onSendDraft={handleSendDraft} onSelectSuggestion={handleSelectSuggestion} onBookCall={handleBookCall} />
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Command Palette Overlay ── */}
      {showPalette && (
        <div 
          style={styles.paletteOverlay} 
          onClick={() => setShowPalette(false)}
        >
          <div 
            style={styles.paletteContainer} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Row */}
            <div style={styles.paletteSearchRow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" style={{ opacity: 0.8 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={paletteSearchRef}
                type="text"
                placeholder="Type a command to run..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                style={styles.paletteSearchInput}
              />
              <span style={styles.paletteEscBadge} onClick={() => setShowPalette(false)}>ESC</span>
            </div>

            {/* Commands List */}
            <div style={styles.paletteList}>
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, index) => {
                  const isHoveredOrActive = index === activeIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setShowPalette(false);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      style={{
                        ...styles.paletteItem,
                        background: isHoveredOrActive ? "var(--palette-item-hover)" : "transparent",
                        borderLeftColor: isHoveredOrActive ? "#7c3aed" : "transparent",
                      }}
                    >
                      <div style={styles.paletteItemLeft}>
                        <div style={styles.paletteItemIconBox}>
                          {cmd.id === "inbox" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                          {cmd.id === "pitch" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
                          {cmd.id === "create-job" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                          {cmd.id === "stats" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                          {cmd.id === "schedule" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                          {cmd.id === "clear" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
                        </div>
                        <div>
                          <div style={styles.paletteItemName}>{cmd.name}</div>
                          <div style={styles.paletteItemDesc}>{cmd.description}</div>
                        </div>
                      </div>
                      <div style={styles.paletteItemRight}>
                        <span style={styles.paletteItemShortcut}>{cmd.shortcut}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={styles.paletteNoResults}>
                  No commands match &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            {/* Footer Row */}
            <div style={styles.paletteFooter}>
              <span>↑↓ to navigate · Enter to select · Esc to close</span>
              <span>PropBot Command Palette</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Input Container ──────────────────────────────────────── */}
      <div style={styles.bottom}>
        {/* Helper popover card */}
        {showHelper && (
          <div style={styles.helperCard}>
            <div style={styles.helperHeader}>
              <span style={styles.helperTitle}>⚡ Power-User Hotkeys</span>
              <button style={styles.helperClose} onClick={() => setShowHelper(false)}>✕</button>
            </div>
            <div style={styles.helperList}>
              {COMMANDS.map((cmd) => (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setShowHelper(false);
                  }}
                  style={styles.helperItem}
                  className="propbot-helper-item"
                >
                  <span style={styles.helperItemName}>{cmd.name}</span>
                  <kbd style={styles.helperItemKbd}>{cmd.shortcut}</kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium floating input */}
        <div 
          id="propbot-input-outer" 
          className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 shadow-lg max-w-[700px] w-full mx-auto relative transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
        >
          {/* Sparkles Icon */}
          <Sparkles className="w-4 h-4 text-primary shrink-0 select-none" />
          
          {/* Auto-growing Textarea */}
          <textarea
            ref={inputRef}
            id="propbot-input"
            rows={1}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder-slate-400 py-0.5 resize-none overflow-y-auto leading-relaxed"
            style={{ minHeight: "44px", maxHeight: "160px" }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Pitchly to analyze a job, draft an email, or check inbox..."
            disabled={loading}
          />
          
          {/* Send Button */}
          <button
            id="propbot-send-btn"
            className={`w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-all active:scale-95 border-0 ${
              !input.trim() || loading ? "opacity-45 cursor-not-allowed" : ""
            }`}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[0.5px]">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}

export default function PropBotPage() {
  return (
    <>
      <style>{`
        :root {
          --bottom-gradient-fade: rgba(248, 247, 255, 0.8);
          --palette-bg: rgba(255, 255, 255, 0.95);
          --palette-text: #1e1b4b;
          --palette-border: rgba(124, 58, 237, 0.18);
          --palette-item-hover: rgba(124, 58, 237, 0.08);
          --palette-shadow: 0 10px 40px rgba(124, 58, 237, 0.15), 0 2px 10px rgba(0,0,0,0.05);
        }
        [data-theme="dark"] {
          --bottom-gradient-fade: rgba(0, 0, 0, 0.8);
          --palette-bg: rgba(9, 9, 11, 0.95);
          --palette-text: #f9fafb;
          --palette-border: rgba(124, 58, 237, 0.3);
          --palette-item-hover: rgba(124, 58, 237, 0.15);
          --palette-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 2px 10px rgba(0,0,0,0.25);
        }
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
          background: var(--card);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
          border: 1.5px solid var(--border);
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }
        #propbot-input-outer:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-glow), 0 8px 30px var(--primary-glow);
        }
        [data-theme="dark"] #propbot-input-outer {
          background: var(--card);
          border-color: var(--border);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }
        [data-theme="dark"] #propbot-input-outer:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-glow), 0 8px 30px rgba(0, 0, 0, 0.6);
        }
        #propbot-send-btn:hover:not(:disabled) {
          background: var(--primary-hover) !important;
          transform: scale(1.04);
        }
        #propbot-send-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .propbot-shortcut-chip:hover {
          border-color: #7c3aed !important;
          color: var(--foreground) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.05);
        }
        .propbot-helper-item:hover {
          background: var(--palette-item-hover) !important;
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
    background: "var(--card)",
    border: "none",
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
    border: "none",
    borderRadius: "16px 16px 0 0",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "20px 24px 20px",
    minHeight: "100%",
    position: "relative" as const,
    zIndex: 1,
  },
  greetingBlock: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 800,
    color: "var(--foreground)",
    margin: 0,
    letterSpacing: "-1px",
    lineHeight: 1.15,
  },
  greetingSub: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--foreground)",
    margin: 0,
    opacity: 0.85,
  },
  greetingHint: {
    fontSize: 12.5,
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
    position: "relative" as const,
    zIndex: 1,
  },
  bottom: {
    background: "linear-gradient(180deg, transparent 0%, var(--bottom-gradient-fade) 30%, var(--background) 100%)",
    padding: "16px 20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    flexShrink: 0,
    borderRadius: "0 0 16px 16px",
    position: "relative",
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
    color: "var(--foreground)",
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
  paletteOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "15vh",
    zIndex: 9999,
    animation: "propbot-fadein 0.2s ease-out",
  },
  paletteContainer: {
    maxWidth: 550,
    width: "90%",
    background: "var(--palette-bg)",
    border: "1.5px solid var(--palette-border)",
    borderRadius: 18,
    boxShadow: "var(--palette-shadow)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  paletteSearchRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderBottom: "1px solid rgba(124, 58, 237, 0.1)",
  },
  paletteSearchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 15,
    color: "var(--palette-text)",
    fontFamily: "inherit",
  },
  paletteEscBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--muted-foreground)",
    background: "var(--border)",
    padding: "3px 7px",
    borderRadius: 5,
    cursor: "pointer",
  },
  paletteList: {
    maxHeight: 320,
    overflowY: "auto",
    padding: 8,
  },
  paletteItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    transition: "background 0.1s ease, border-left-color 0.15s ease",
    borderLeft: "3.5px solid transparent",
  },
  paletteItemLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  paletteItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(124, 58, 237, 0.06)",
    color: "#7c3aed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  paletteItemName: {
    fontSize: 13.5,
    fontWeight: 650,
    color: "var(--foreground)",
  },
  paletteItemDesc: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    marginTop: 2,
  },
  paletteItemRight: {
    display: "flex",
    alignItems: "center",
  },
  paletteItemShortcut: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(124, 58, 237, 0.08)",
    border: "1px solid rgba(124, 58, 237, 0.15)",
    padding: "3px 7px",
    borderRadius: 5,
    minWidth: 36,
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
    letterSpacing: "0.5px",
  },
  paletteNoResults: {
    padding: "24px 16px",
    textAlign: "center",
    fontSize: 13,
    color: "var(--muted-foreground)",
  },
  paletteFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderTop: "1px solid rgba(124, 58, 237, 0.06)",
    background: "rgba(124, 58, 237, 0.02)",
    fontSize: 10.5,
    color: "var(--muted-foreground)",
    fontWeight: 500,
  },
  headerShortcutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 8,
    background: "rgba(124, 58, 237, 0.06)",
    border: "1px solid rgba(124, 58, 237, 0.12)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  shortcutIconKey: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(124, 58, 237, 0.15)",
    padding: "1px 4px",
    borderRadius: 3,
    lineHeight: 1,
  },
  shortcutIconText: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "#7c3aed",
    marginLeft: 3,
  },
  keyboardTipContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
    fontSize: 12,
    color: "var(--muted-foreground)",
  },
  keyboardTipBadge: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(124, 58, 237, 0.06)",
    border: "1px solid rgba(124, 58, 237, 0.15)",
    padding: "2px 5px",
    borderRadius: 4,
    fontFamily: "inherit",
  },
  shortcutChipsContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    maxWidth: 550,
  },
  shortcutChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--muted-foreground)",
    fontSize: 11.5,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  shortcutChipKbd: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(124, 58, 237, 0.06)",
    padding: "1px 4px",
    borderRadius: 3,
    fontFamily: "inherit",
  },
  keyboardBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: "pointer",
    transition: "all 0.15s ease",
    padding: 0,
  },
  helperCard: {
    position: "absolute",
    bottom: "85px",
    right: "20px",
    width: "260px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    boxShadow: "var(--palette-shadow)",
    padding: "12px",
    zIndex: 100,
    animation: "propbot-fadein 0.2s ease-out",
  },
  helperHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: "1px solid var(--border)",
  },
  helperTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--foreground)",
  },
  helperClose: {
    background: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    fontSize: 12,
  },
  helperList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  helperItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  helperItemName: {
    fontSize: 11.5,
    color: "var(--foreground)",
  },
  helperItemKbd: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(124, 58, 237, 0.06)",
    border: "1px solid rgba(124, 58, 237, 0.15)",
    padding: "1px 5px",
    borderRadius: 4,
  },
};
