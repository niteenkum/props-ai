"use client";

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PropBot AI — Full Dashboard Page                   ║
 * ║  /dashboard/your-bot                                ║
 * ╚══════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import {
  Clock, Trash2, Sparkles, Plus, Settings, Share2, MoreHorizontal, Globe, Zap, Shield, ArrowRight, ChevronRight, Loader2, Send,
  Bot, AlertCircle, BookOpen, Link2, FileText, CheckCircle2, RotateCcw, Copy, Check, AlertTriangle, ExternalLink, TrendingUp, Building2, Phone, Mail, X
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useJobScanner, ALL_PLATFORMS, type PlatformKey, type AIModel } from "../../hooks/useJobScanner";
import { useTheme } from "../../components/theme-provider";
import { platformLabel } from "../../utils/platform-detector";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "../styles";
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

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: copied ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : "var(--input)", color: copied ? (isDark ? "#4ade80" : "#16a34a") : "var(--muted-foreground)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
    >
      {copied ? <><Check style={{ width: 12, height: 12 }} /> Copied!</> : <><Copy style={{ width: 12, height: 12 }} /> Copy</>}
    </button>
  );
}

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
  const { profile }            = useProfile(userEmail ?? "");
  const scanner                = useJobScanner(userEmail ?? "", profile);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  const initialTab = searchParams.get("tab") === "scan" ? "scan" : "chat";
  const [activeTab, setActiveTab] = useState<"chat" | "scan">(initialTab);

  const [messages, setMessages]   = useState<UIMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [customGreeting, setCustomGreeting] = useState("How can I help you today?");
  const messagesEndRef             = useRef<HTMLDivElement>(null);
  const inputRef                   = useRef<HTMLTextAreaElement>(null);
  const textareaRef                = useRef<HTMLTextAreaElement>(null);
  const hasMessages                = messages.length > 0;

  // Synced URL search parameter tab selection
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "scan") {
      setActiveTab("scan");
    } else {
      setActiveTab("chat");
    }
  }, [searchParams]);

  // Auto-resize scan proposal editor textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [scanner.generatedProposals, scanner.activeResultTab, activeTab]);

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

  const providerLabel = (scanner.aiProvider || "AI").charAt(0).toUpperCase() + (scanner.aiProvider || "ai").slice(1);
  const step = scanner.drawerStep;

  // ─── Platform helpers ──────────────────────────────────────────────────────
  const PlatformIcon = () => {
    switch (scanner.platform) {
      case "upwork":     return <Globe        style={{ width: 13, height: 13 }} />;
      case "email":      return <Mail         style={{ width: 13, height: 13 }} />;
      case "linkedin":   return <Link2        style={{ width: 13, height: 13 }} />;
      case "freelancer": return <Zap          style={{ width: 13, height: 13 }} />;
      default:           return <FileText     style={{ width: 13, height: 13 }} />;
    }
  };
  const pColors = (() => {
    switch (scanner.platform) {
      case "upwork":    return { bg: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4", border: isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0", text: isDark ? "#4ade80" : "#16a34a" };
      case "email":     return { bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff", border: isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe", text: isDark ? "#60a5fa" : "#2563eb" };
      case "linkedin":  return { bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff", border: isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe", text: isDark ? "#60a5fa" : "#0a66c2" };
      case "whatsapp":  return { bg: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4", border: isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0", text: isDark ? "#4ade80" : "#16a34a" };
      case "freelancer":return { bg: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb", border: isDark ? "rgba(245,158,11,0.3)" : "#fde68a", text: isDark ? "#fbbf24" : "#b45309" };
      default:          return { bg: "var(--input)", border: "var(--border)", text: "var(--muted-foreground)" };
    }
  })();

  const canAnalyze = scanner.pasteText.trim().length > 40;
  const isAnalyzing = step === "checking";
  const hasResults  = step === "results" && Object.keys(scanner.generatedProposals).length > 0;

  // ─── Score helpers ─────────────────────────────────────────────────────────
  const ai = scanner.aiCandidacy;
  const score = ai?.score ?? 0;
  const scoreColor = score >= 85 ? "#22c55e" : score >= 55 ? "#818cf8" : score >= 35 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 85 ? "Strong Fit" : score >= 55 ? "Moderate Fit" : score >= 35 ? "Weak Fit" : "Poor Fit";
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (score / 100) * circumference;

  if (!isReady) return null;

  return (
    <div style={styles.page}>
      {/* ── Tab Switcher Header ── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px 24px 10px 24px",
        background: "transparent",
        flexShrink: 0,
        zIndex: 20,
      }}>
        <div className="tab-switcher-container">
          <button
            onClick={() => {
              setActiveTab("chat");
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "chat");
              window.history.replaceState(null, "", url.toString());
            }}
            className={`tab-switcher-btn ${activeTab === "chat" ? "active" : ""}`}
          >
            <Sparkles size={13} />
            <span>AI Copilot Chat</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("scan");
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "scan");
              window.history.replaceState(null, "", url.toString());
            }}
            className={`tab-switcher-btn ${activeTab === "scan" ? "active" : ""}`}
          >
            <Bot size={13} />
            <span>Deep Job Scan</span>
          </button>
        </div>
      </div>

      {/* ── Chat Tab View ── */}
      {activeTab === "chat" && (
        <>
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
        </>
      )}

      {/* ── Job Scan Tab View ── */}
      {activeTab === "scan" && (
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 24px 40px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          animation: "propbot-fadein 0.25s ease-out",
        }} className="scrollbar-none">
          
          <header>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Deep Scan Job Analyzer</h2>
            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 4 }}>
              Paste any job post — Upwork, LinkedIn, WhatsApp, email — and generate tailored proposals with AI.
            </p>
          </header>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

            {/* Left: Paste area */}
            <div style={{ ...cardStyle, position: "sticky", top: "0px", overflow: "hidden", zIndex: 10 }}>
              {scanner.generationError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span>{scanner.generationError}</span>
                  </div>
                  <button onClick={() => scanner.setGenerationError(null)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", padding: 2 }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}

              <form onSubmit={scanner.handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Raw Job Post Content</label>
                  <button
                    type="button"
                    onClick={() => scanner.setPasteText("View Zvart Manukyan's profile\nZvart Manukyan\n\n • 3rd+\n\nTechnical Project & Product Manager | AI-Driven Product Development | Ex-Software Engineer\n\n1h • \n\n\nFollow\nHey there :)\n\nLooking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.\nSomeone who feels confident with frontend, cares about reusable code, and can also support a Flutter app when needed.\nPing me if this sounds like you, or share it with someone who might be a good fit.\ncontact: zvart@example.com")}
                    style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  >
                    Insert Demo Post
                  </button>
                </div>

                <textarea
                  rows={12}
                  value={scanner.pasteText}
                  onChange={e => { scanner.setPasteText(e.target.value); scanner.setGenerationError(null); }}
                  placeholder="Paste the full job post, LinkedIn listing, Upwork description, WhatsApp message, or email request here..."
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {scanner.pasteText.trim() && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: pColors.bg, color: pColors.text, border: `1px solid ${pColors.border}` }}>
                        <PlatformIcon />
                        {platformLabel(scanner.platform)}
                      </span>
                    )}
                    {!scanner.pasteText.trim() && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: scanner.aiAvailable ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
                          {scanner.aiAvailable ? `${providerLabel} Ready` : "Heuristic Mode (no API key)"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => { scanner.setPasteText(""); scanner.setGenerationError(null); }}
                      style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={!canAnalyze || isAnalyzing}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, border: "none",
                        background: canAnalyze && !isAnalyzing ? "linear-gradient(135deg, #818cf8, #6366f1)" : "var(--border)",
                        color: canAnalyze && !isAnalyzing ? "#fff" : "var(--muted-foreground)",
                        fontSize: 13, fontWeight: 700,
                        cursor: canAnalyze && !isAnalyzing ? "pointer" : "not-allowed",
                        boxShadow: canAnalyze && !isAnalyzing ? "0 4px 14px rgba(99,102,241,0.3)" : "none",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { if (canAnalyze && !isAnalyzing) e.currentTarget.style.opacity = "0.88"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                    >
                      {isAnalyzing
                        ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Analyzing...</>
                        : <><Sparkles style={{ width: 15, height: 15 }} /> Analyze Job</>
                      }
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right: Dynamic Analysis Panel */}
            <div style={{ ...cardStyle, minHeight: 430, maxHeight: "calc(100vh - 200px)", display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
              
              {/* EMPTY: no paste */}
              {!scanner.pasteText.trim() && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: 10, padding: "40px 20px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles style={{ width: 24, height: 24, color: "rgba(99,102,241,0.5)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Paste a job post</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.65, margin: 0, maxWidth: 200 }}>
                      Paste any job listing on the left, then click <strong style={{ color: "#818cf8" }}>Analyze Job</strong> to see AI analysis here.
                    </p>
                  </div>
                </div>
              )}

              {/* READY: pasted but not analyzed */}
              {scanner.pasteText.trim() && (step === "idle") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px" }}>
                  <h3 style={sectionTitleStyle}>
                    <BookOpen style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                    Job Scanner
                  </h3>
                  <div>
                    <span style={labelStyle}>Detected Platform</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: pColors.bg, color: pColors.text, border: `1px solid ${pColors.border}` }}>
                        <PlatformIcon />
                        {platformLabel(scanner.platform)}
                      </span>
                      <ArrowRight style={{ width: 12, height: 12, color: "var(--muted-foreground)", opacity: 0.4 }} />
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>6 templates</span>
                    </div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: 12, background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", textAlign: "center" }}>
                    <Sparkles style={{ width: 22, height: 22, color: "#818cf8", margin: "0 auto 8px", display: "block" }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Ready to Analyze</p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
                      Click <strong style={{ color: "#818cf8" }}>Analyze Job</strong> to get candidacy score, contact info, and matched skills.
                    </p>
                  </div>
                </div>
              )}

              {/* ANALYZING spinner */}
              {step === "checking" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, padding: "40px 20px" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)", border: "2px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 style={{ width: 28, height: 28, color: "#818cf8", animation: "spin 1s linear infinite" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Analyzing Job Post</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>AI is scoring your candidacy and extracting contact info...</p>
                  </div>
                </div>
              )}

              {/* DUPLICATE warning */}
              {step === "duplicate" && scanner.duplicateState && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px" }}>
                  <div style={{ padding: "14px", borderRadius: 12, background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb", border: `1px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fde68a"}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <AlertTriangle style={{ width: 18, height: 18, color: isDark ? "#fbbf24" : "#d97706", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fbbf24" : "#92400e", margin: "0 0 4px" }}>Duplicate Detected</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.6 }}>{scanner.duplicateState.reason}</p>
                    </div>
                  </div>
                  <div style={{ padding: "14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 2px" }}>{scanner.duplicateState.existingJob.role}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 8px" }}>at {scanner.duplicateState.existingJob.company}</p>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 700, background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb", color: isDark ? "#fbbf24" : "#b45309", border: `1px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fde68a"}` }}>
                      {scanner.duplicateState.confidence}% match
                    </span>
                  </div>
                  <button onClick={scanner.handleGoToExistingJob} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #818cf8, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <ExternalLink style={{ width: 14, height: 14 }} /> View Existing
                  </button>
                  <button onClick={scanner.handleContinueDespiteDuplicate} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--input)", color: "var(--foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Create New Anyway
                  </button>
                </div>
              )}

              {/* ANALYSIS results + platform selection */}
              {(step === "analysis" || step === "platforms" || step === "results") && ai && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, overflowY: "auto" }}>
                  {/* Score hero */}
                  <div style={{ padding: "20px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                      {/* Ring */}
                      <div style={{ flexShrink: 0, position: "relative" }}>
                        <svg width="76" height="76" viewBox="0 0 76 76">
                          <circle cx="38" cy="38" r="36" fill="none" stroke={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="6" />
                          <circle cx="38" cy="38" r="36" fill="none" stroke={scoreColor} strokeWidth="6"
                            strokeDasharray={circumference} strokeDashoffset={dashOffset}
                            strokeLinecap="round" transform="rotate(-90 38 38)"
                            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
                          <span style={{ fontSize: 8, color: "var(--muted-foreground)" }}>/100</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40`, display: "inline-block", marginBottom: 6 }}>{scoreLabel}</span>
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.6 }}>{ai.explanation || "AI analyzed your profile against this job post."}</p>
                      </div>
                    </div>

                    {/* Job details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {ai.role && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><TrendingUp style={{ width: 12, height: 12, color: "#818cf8" }} /><span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{ai.role}</span></div>}
                      {ai.company && ai.company !== "Not specified" && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Building2 style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} /><span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{ai.company}</span></div>}
                      {ai.contactEmail && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Mail style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} /><span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{ai.contactEmail}</span></div>}
                      {ai.contactCc && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Mail style={{ width: 12, height: 12, color: "var(--muted-foreground)", opacity: 0.8 }} /><span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>CC: {ai.contactCc}</span></div>}
                      {ai.contactBcc && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Mail style={{ width: 12, height: 12, color: "var(--muted-foreground)", opacity: 0.8 }} /><span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>BCC: {ai.contactBcc}</span></div>}
                      {ai.contactPhone && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Phone style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} /><span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{ai.contactPhone}</span></div>}
                    </div>

                    {/* Skills */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                      <div style={{ padding: "10px", borderRadius: 10, background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4", border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}` }}>
                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: isDark ? "#4ade80" : "#16a34a", margin: "0 0 6px" }}>✅ Matched</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {ai.matchedSkills.slice(0, 5).map((s, i) => <span key={i} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 50, fontWeight: 600, background: isDark ? "rgba(34,197,94,0.12)" : "#dcfce7", color: isDark ? "#4ade80" : "#166534" }}>{s}</span>)}
                          {!ai.matchedSkills.length && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>None detected</span>}
                        </div>
                      </div>
                      <div style={{ padding: "10px", borderRadius: 10, background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2", border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#fecaca"}` }}>
                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: isDark ? "#f87171" : "#dc2626", margin: "0 0 6px" }}>❌ Missing</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {ai.missingSkills.slice(0, 5).map((s, i) => <span key={i} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 50, fontWeight: 600, background: isDark ? "rgba(239,68,68,0.12)" : "#fee2e2", color: isDark ? "#f87171" : "#991b1b" }}>{s}</span>)}
                          {!ai.missingSkills.length && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>None detected</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Platform selector */}
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: "0 0 10px" }}>Select Templates</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {ALL_PLATFORMS.map(p => {
                        const active = scanner.selectedPlatforms.has(p.key as PlatformKey);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => scanner.togglePlatform(p.key as PlatformKey)}
                            style={{
                              padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                              border: `2px solid ${active ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                              background: active ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)") : "var(--card)",
                              textAlign: "left", display: "flex", flexDirection: "column", gap: 2, transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: 12 }}>{p.icon}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#818cf8" : "var(--foreground)" }}>{p.label}</span>
                              {active && <CheckCircle2 style={{ width: 11, height: 11, color: "#818cf8", marginLeft: "auto" }} />}
                            </div>
                            <span style={{ fontSize: 9, color: "var(--muted-foreground)", paddingLeft: 18 }}>{p.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Model selector */}
                  <div style={{ padding: "14px 20px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: "0 0 8px" }}>AI Model</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(["auto", "gemini", "claude"] as AIModel[]).map(key => {
                        const labels: Record<string, string> = { auto: "Auto (Best Available)", gemini: "Gemini 2.5 Flash", claude: "Claude Sonnet" };
                        const icons: Record<string, string> = { auto: "🤖", gemini: "✨", claude: "🧠" };
                        const isAvailable = key === "auto" || scanner.availableModels.includes(key);
                        const isSelected  = scanner.selectedModel === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => { if (isAvailable) scanner.setSelectedModel(key); }}
                            style={{
                              padding: "8px 12px", borderRadius: 9, cursor: isAvailable ? "pointer" : "not-allowed",
                              border: `2px solid ${isSelected ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                              background: isSelected ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)") : "var(--card)",
                              opacity: isAvailable ? 1 : 0.45,
                              display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
                            }}
                          >
                            <span style={{ fontSize: 13 }}>{icons[key]}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "#818cf8" : "var(--foreground)", flex: 1, textAlign: "left" }}>{labels[key]}</span>
                            <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 50, fontWeight: 700, background: isAvailable ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : (isDark ? "rgba(239,68,68,0.1)" : "#fef2f2"), color: isAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#f87171" : "#dc2626") }}>
                              {isAvailable ? "Active" : "No Key"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error + Generate */}
                  <div style={{ padding: "14px 20px" }}>
                    {scanner.generationError && (
                      <div style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11, fontWeight: 500, marginBottom: 10 }}>
                        {scanner.generationError}
                      </div>
                    )}
                    <button
                      onClick={scanner.handleGenerateProposals}
                      disabled={scanner.selectedPlatforms.size === 0}
                      style={{
                        width: "100%", padding: "13px", borderRadius: 12, border: "none",
                        background: scanner.selectedPlatforms.size > 0 ? "linear-gradient(135deg, #818cf8, #6366f1)" : "var(--border)",
                        color: scanner.selectedPlatforms.size > 0 ? "#fff" : "var(--muted-foreground)",
                        fontSize: 14, fontWeight: 700, cursor: scanner.selectedPlatforms.size > 0 ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: scanner.selectedPlatforms.size > 0 ? "0 4px 18px rgba(99,102,241,0.35)" : "none",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { if (scanner.selectedPlatforms.size > 0) e.currentTarget.style.opacity = "0.88"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                    >
                      <Sparkles style={{ width: 15, height: 15 }} />
                      {step === "results" ? "Regenerate" : "Generate"} {scanner.selectedPlatforms.size} Proposal{scanner.selectedPlatforms.size !== 1 ? "s" : ""}
                      <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              )}

              {/* GENERATING spinner */}
              {step === "generating" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20, padding: "40px 20px" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))", border: "2px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s ease-in-out infinite" }}>
                    <Sparkles style={{ width: 28, height: 28, color: "#818cf8", animation: "spin 3s linear infinite" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Crafting your proposals...</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>AI is writing personalized outreach for each platform.</p>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
                    {Array.from(scanner.selectedPlatforms).map(p => {
                      const info = ALL_PLATFORMS.find(pl => pl.key === p);
                      return (
                        <span key={p} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                          <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                          {info?.label || p}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Status bottom bar — only on idle/ready states */}
              {(step === "idle" || (!scanner.pasteText.trim())) && (
                <div style={{ padding: "16px 20px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, borderTop: scanner.pasteText.trim() && step !== "checking" ? `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` : "none" }}>
                  <div style={{ padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: scanner.aiAvailable ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : (isDark ? "rgba(245,158,11,0.1)" : "#fffbeb"), border: `1px solid ${scanner.aiAvailable ? (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0") : (isDark ? "rgba(245,158,11,0.3)" : "#fde68a")}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: scanner.aiAvailable ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: scanner.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                        {scanner.aiAvailable ? `${providerLabel} Active` : "Heuristic Mode"}
                      </span>
                    </div>
                    <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, color: scanner.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                      {scanner.aiAvailable ? "LIVE" : "BASIC"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RESULTS: full-width proposals below */}
          {hasResults && (
            <div style={{ ...cardStyle, marginTop: 0 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Proposals Ready</span>
                  {ai && (
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      · {ai.role} {ai.company !== "Not specified" ? `at ${ai.company}` : ""}
                      {ai.contactEmail && ` · ${ai.contactEmail}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Platform tabs */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
                {Object.keys(scanner.generatedProposals).map(p => {
                  const info = ALL_PLATFORMS.find(pl => pl.key === p);
                  const active = scanner.activeResultTab === p;
                  const failed = scanner.generatedProposals[p]?.startsWith("[Generation failed");
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => scanner.setActiveResultTab(p)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                        border: `1.5px solid ${active ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                        background: active ? (isDark ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.08)") : "var(--card)",
                        color: active ? "#818cf8" : (failed ? "#ef4444" : "var(--foreground)"),
                        fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{info?.icon || "📄"}</span>
                      {info?.label || p}
                    </button>
                  );
                })}
              </div>

              {/* Active proposal */}
              {scanner.activeResultTab && scanner.generatedProposals[scanner.activeResultTab] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--muted-foreground)", opacity: 0.6 }}>
                      ✏️ Editable — click to modify
                    </span>
                    <CopyButton text={scanner.generatedProposals[scanner.activeResultTab]} isDark={isDark} />
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={scanner.generatedProposals[scanner.activeResultTab]}
                    onChange={e => {
                      scanner.handleEditProposal(scanner.activeResultTab, e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    spellCheck={false}
                    style={{
                      width: "100%", minHeight: 180, padding: "14px 16px", borderRadius: 12,
                      background: "var(--input)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                      fontSize: 13, lineHeight: 1.75, color: "var(--foreground)", fontFamily: "inherit",
                      resize: "none", overflow: "hidden", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)"; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"; }}
                  />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}` }}>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.5, fontFamily: "monospace" }}>
                      {scanner.generatedProposals[scanner.activeResultTab].length} chars
                    </span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => { scanner.setPasteText(""); scanner.setGenerationError(null); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--input)", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--input)"; }}
                      >
                        <RotateCcw style={{ width: 12, height: 12 }} /> New Scan
                      </button>
                      <button
                        onClick={scanner.handleSaveAndClose}
                        disabled={scanner.isSavingJob}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 9, border: "none", background: scanner.isSavingJob ? "var(--border)" : "linear-gradient(135deg, #818cf8, #6366f1)", color: scanner.isSavingJob ? "var(--muted-foreground)" : "#fff", fontSize: 12, fontWeight: 700, cursor: scanner.isSavingJob ? "not-allowed" : "pointer", boxShadow: scanner.isSavingJob ? "none" : "0 4px 14px rgba(99,102,241,0.3)" }}
                        onMouseEnter={e => { if (!scanner.isSavingJob) e.currentTarget.style.opacity = "0.88"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      >
                        {scanner.isSavingJob
                          ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Saving...</>
                          : <><CheckCircle2 style={{ width: 13, height: 13 }} /> Save & Continue</>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
        .tab-switcher-container {
          display: flex;
          background: rgba(241, 245, 249, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 3px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-theme="dark"] .tab-switcher-container {
          background: rgba(30, 41, 59, 0.45);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
        }
        .tab-switcher-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          border-radius: 25px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          color: var(--muted-foreground);
          background: transparent;
          transition: all 0.2s ease;
        }
        .tab-switcher-btn:hover {
          color: var(--foreground);
          background: rgba(0, 0, 0, 0.03);
        }
        [data-theme="dark"] .tab-switcher-btn:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .tab-switcher-btn.active {
          color: #fff !important;
          background: linear-gradient(135deg, #818cf8, #6366f1);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
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
