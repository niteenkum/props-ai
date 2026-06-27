"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe, Sliders, Loader2, CheckCircle2, X,
  AlertCircle, ExternalLink, Briefcase, Sparkles,
  Building2, ArrowRight, RefreshCw, Plus, ChevronDown,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../components/theme-provider";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "../styles";
import {
  startLinkedinScrapeAction,
  getScrapeStatusAction,
  fetchAndProcessJobsAction,
  type ProcessedJobSummary,
} from "../../actions/apify-actions";
import Link from "next/link";

type ScrapeStep = "idle" | "starting" | "scraping" | "processing" | "completed" | "failed";

// ─── Predefined keyword tags ───────────────────────────────────────────────────
const PRESET_KEYWORDS = [
  { label: "React Developer",          category: "Frontend" },
  { label: "Next.js Developer",        category: "Frontend" },
  { label: "Frontend Developer",       category: "Frontend" },
  { label: "React Native Developer",   category: "Mobile" },
  { label: "Ionic Developer",          category: "Mobile" },
  { label: "Full Stack Developer",     category: "Full Stack" },
  { label: "Node.js Developer",        category: "Backend" },
  { label: "Backend Developer",        category: "Backend" },
  { label: "NestJS Developer",         category: "Backend" },
  { label: "Ruby on Rails Developer",  category: "Backend" },
  { label: "Web Developer",            category: "General" },
  { label: "JavaScript Developer",     category: "General" },
  { label: "Tech Lead",                category: "Leadership" },
  { label: "Team Lead",                category: "Leadership" },
  { label: "CTO",                      category: "Leadership" },
  { label: "Technical Consultant",     category: "Leadership" },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; bgDark: string; borderDark: string; textDark: string }> = {
  Frontend:   { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb", bgDark: "rgba(59,130,246,0.12)", borderDark: "rgba(59,130,246,0.35)", textDark: "#60a5fa" },
  Mobile:     { bg: "#fdf4ff", border: "#e9d5ff", text: "#7c3aed", bgDark: "rgba(139,92,246,0.12)", borderDark: "rgba(139,92,246,0.35)", textDark: "#a78bfa" },
  "Full Stack": { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", bgDark: "rgba(34,197,94,0.12)", borderDark: "rgba(34,197,94,0.35)", textDark: "#4ade80" },
  Backend:    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", bgDark: "rgba(249,115,22,0.12)", borderDark: "rgba(249,115,22,0.35)", textDark: "#fb923c" },
  General:    { bg: "#f8fafc", border: "#e2e8f0", text: "#475569", bgDark: "rgba(148,163,184,0.12)", borderDark: "rgba(148,163,184,0.35)", textDark: "#94a3b8" },
  Leadership: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", bgDark: "rgba(244,63,94,0.12)", borderDark: "rgba(244,63,94,0.35)", textDark: "#fb7185" },
};

export default function LinkedInScraperPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Selected keyword tags
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([
    "React Developer",
    "Next.js Developer",
    "Full Stack Developer",
    "Frontend Developer",
    "Node.js Developer",
  ]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Config
  const [jobType, setJobType] = useState("freelance");
  const [selectedSources, setSelectedSources] = useState<("jobs" | "posts")[]>(["jobs"]);
  const [limitPerKeyword, setLimitPerKeyword] = useState(10);

  // Scraper runtime state
  const [step, setStep] = useState<ScrapeStep>("idle");
  const [currentKeywordIdx, setCurrentKeywordIdx] = useState(0);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [runId, setRunId] = useState<string | null>(null);

  // Cumulative results across all keyword runs
  const [allResults, setAllResults] = useState<{
    processed: number;
    imported: number;
    skipped: number;
    jobs: ProcessedJobSummary[];
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!isReady) return null;

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const addCustomKeyword = () => {
    const trimmed = customKeyword.trim();
    if (!trimmed || selectedKeywords.includes(trimmed)) return;
    setSelectedKeywords(prev => [...prev, trimmed]);
    setCustomKeyword("");
    setShowCustomInput(false);
  };

  const removeSelectedKeyword = (kw: string) => {
    setSelectedKeywords(prev => prev.filter(k => k !== kw));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ── Run a single task scrape, then recursively advance to next ──────────
  const runScrapeTask = async (
    tasks: { keyword: string; source: "jobs" | "posts" }[],
    idx: number,
    accumulated: { processed: number; imported: number; skipped: number; jobs: ProcessedJobSummary[] }
  ) => {
    if (idx >= tasks.length) {
      // All tasks done
      setStep("completed");
      setStatusMessage(`All ${tasks.length} task${tasks.length > 1 ? "s" : ""} synced successfully!`);
      clearInterval(timerRef.current!);
      return;
    }

    const task = tasks[idx];
    setCurrentKeywordIdx(idx);
    setCurrentKeyword(`${task.keyword} (${task.source === "posts" ? "Posts" : "Jobs"})`);
    setStep("starting");
    setStatusMessage(`[${idx + 1}/${tasks.length}] Starting ${task.source === "posts" ? "Posts Search" : "Jobs Board Scrape"} for "${task.keyword}"...`);
    setRunId(null);

    const triggerRes = await startLinkedinScrapeAction(task.keyword, jobType, limitPerKeyword, userEmail, task.source);

    if (!triggerRes.success || !triggerRes.data) {
      setErrorMsg(triggerRes.error || "Failed to trigger scraper.");
      setStep("failed");
      clearInterval(timerRef.current!);
      return;
    }

    const activeRunId = triggerRes.data.runId;
    setRunId(activeRunId);
    setStep("scraping");
    setStatusMessage(`[${idx + 1}/${tasks.length}] Crawling LinkedIn ${task.source === "posts" ? "Posts" : "Jobs"} for "${task.keyword}"...`);

    // Poll for status
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      const statusRes = await getScrapeStatusAction(activeRunId);

      if (!statusRes.success || !statusRes.data) {
        clearInterval(pollIntervalRef.current!);
        setStep("failed");
        setErrorMsg("Error polling scraper status.");
        clearInterval(timerRef.current!);
        return;
      }

      const currentStatus = statusRes.data.status;

      if (currentStatus === "SUCCEEDED") {
        clearInterval(pollIntervalRef.current!);
        setStep("processing");
        setStatusMessage(`[${idx + 1}/${tasks.length}] Analyzing "${task.keyword}" ${task.source} with Gemini AI...`);

        const processRes = await fetchAndProcessJobsAction(statusRes.data.datasetId!, userEmail, task.keyword, jobType, task.source);

        const newAccumulated = {
          processed: accumulated.processed + (processRes.jobsProcessed || 0),
          imported:  accumulated.imported  + (processRes.jobsImported  || 0),
          skipped:   accumulated.skipped   + (processRes.jobsSkipped   || 0),
          jobs:      [
            ...accumulated.jobs,
            ...(processRes.processedJobs || []).map(j => ({ ...j, source: task.source }))
          ],
        };

        setAllResults(newAccumulated);

        // Advance to next task
        await runScrapeTask(tasks, idx + 1, newAccumulated);

      } else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(currentStatus)) {
        clearInterval(pollIntervalRef.current!);
        clearInterval(timerRef.current!);
        setStep("failed");
        setErrorMsg(`Apify run for "${task.keyword}" (${task.source}) ended with status: ${currentStatus}`);
      }
    }, 5000);
  };

  // ── Main start handler ─────────────────────────────────────────────────────
  const handleStartScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKeywords.length === 0 || selectedSources.length === 0) return;

    setStep("starting");
    setErrorMsg(null);
    setAllResults(null);
    setElapsedTime(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);

    // Build tasks
    const tasks: { keyword: string; source: "jobs" | "posts" }[] = [];
    for (const kw of selectedKeywords) {
      for (const src of selectedSources) {
        tasks.push({ keyword: kw, source: src });
      }
    }

    await runScrapeTask(tasks, 0, { processed: 0, imported: 0, skipped: 0, jobs: [] });
  };

  const isRunning = step !== "idle" && step !== "completed" && step !== "failed";
  const totalTasksCount = selectedKeywords.length * selectedSources.length;
  const progress = isRunning
    ? step === "starting" ? 10
    : step === "scraping" ? 20 + (currentKeywordIdx / totalTasksCount) * 55
    : step === "processing" ? 20 + ((currentKeywordIdx + 0.7) / totalTasksCount) * 55
    : 0
    : step === "completed" ? 100 : 0;

  return (
    <>
      {/* ── Header ── */}
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>LinkedIn Freelance Scraper</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Select job keywords, configure your location, and Apify + Gemini will find and import matching freelance posts automatically.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: Config Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Keyword Selector */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              <Sliders style={{ width: 15, height: 15, color: "var(--primary)" }} />
              Search Keywords
            </h3>

            <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 10, marginBottom: 14, lineHeight: 1.6 }}>
              Toggle the roles you want to scan. Each selected keyword runs as a separate Apify query.
            </p>

            {/* Category groups */}
            {(["Frontend", "Mobile", "Full Stack", "Backend", "General", "Leadership"] as const).map(cat => {
              const items = PRESET_KEYWORDS.filter(k => k.category === cat);
              const c = CATEGORY_COLORS[cat];
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", marginBottom: 6 }}>
                    {cat}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {items.map(kw => {
                      const isSelected = selectedKeywords.includes(kw.label);
                      return (
                        <button
                          key={kw.label}
                          type="button"
                          onClick={() => toggleKeyword(kw.label)}
                          disabled={isRunning}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: isRunning ? "not-allowed" : "pointer",
                            border: `1px solid ${isSelected ? (isDark ? c.borderDark : c.border) : "var(--border)"}`,
                            background: isSelected ? (isDark ? c.bgDark : c.bg) : "transparent",
                            color: isSelected ? (isDark ? c.textDark : c.text) : "var(--muted-foreground)",
                            transition: "all 0.15s",
                            opacity: isRunning ? 0.6 : 1,
                          }}
                        >
                          {isSelected && <CheckCircle2 style={{ width: 10, height: 10, display: "inline", marginRight: 4, verticalAlign: "middle" }} />}
                          {kw.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Custom keyword */}
            {showCustomInput ? (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  autoFocus
                  type="text"
                  value={customKeyword}
                  onChange={e => setCustomKeyword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomKeyword())}
                  placeholder="e.g. GraphQL Expert"
                  style={{ ...inputStyle, fontSize: 12, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addCustomKeyword}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCustomInput(false); setCustomKeyword(""); }}
                  style={{ padding: "6px 8px", borderRadius: 8, background: "var(--input)", color: "var(--muted-foreground)", fontSize: 12, border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                disabled={isRunning}
                style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: "var(--muted-foreground)", background: "transparent", border: "1px dashed var(--border)", cursor: isRunning ? "not-allowed" : "pointer" }}
              >
                <Plus style={{ width: 11, height: 11 }} /> Add Custom Keyword
              </button>
            )}
          </div>

          {/* Job Type + Limit */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              <Globe style={{ width: 15, height: 15, color: "var(--primary)" }} />
              Scrape Settings
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>Search Sources</label>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4, marginBottom: 8, lineHeight: 1.5 }}>
                  Choose one or both sources to search on LinkedIn.
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { value: "jobs",  label: "LinkedIn Jobs Board", emoji: "💼" },
                    { value: "posts", label: "LinkedIn Feed Posts", emoji: "📝" },
                  ].map(opt => {
                    const isSelected = selectedSources.includes(opt.value as any);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedSources(prev => {
                            if (isSelected) {
                              if (prev.length === 1) return prev; // Keep at least one selected
                              return prev.filter(x => x !== opt.value);
                            } else {
                              return [...prev, opt.value as "jobs" | "posts"];
                            }
                          });
                        }}
                        disabled={isRunning}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isRunning ? "not-allowed" : "pointer",
                          border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                          background: isSelected ? "var(--primary)" : "var(--input)",
                          color: isSelected ? "#ffffff" : "var(--foreground)",
                          transition: "all 0.15s",
                          opacity: isRunning ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Job Type</label>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4, marginBottom: 8, lineHeight: 1.5 }}>
                  Select the type of work you're looking for.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { value: "freelance", label: "Freelance",            emoji: "💼" },
                    { value: "contract",  label: "Contract",             emoji: "🤝" },
                    { value: "part-time", label: "Part-time",            emoji: "⏰" },
                    { value: "full-time", label: "Full-time",            emoji: "🏢" },
                    { value: "internship",label: "Internship",           emoji: "🎓" },
                  ].map(opt => {
                    const isSelected = jobType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setJobType(opt.value)}
                        disabled={isRunning}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isRunning ? "not-allowed" : "pointer",
                          border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                          background: isSelected ? "var(--primary)" : "var(--input)",
                          color: isSelected ? "#ffffff" : "var(--foreground)",
                          transition: "all 0.15s",
                          opacity: isRunning ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Max Jobs Per Keyword</label>
                <select
                  value={limitPerKeyword}
                  onChange={e => setLimitPerKeyword(Number(e.target.value))}
                  disabled={isRunning}
                  style={{ ...inputStyle, marginTop: 6, cursor: "pointer" }}
                >
                  <option value={10}>10 listings per keyword</option>
                  <option value={15}>15 listings per keyword</option>
                  <option value={25}>25 listings per keyword</option>
                </select>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <form onSubmit={handleStartScrape}>
            <button
              type="submit"
              disabled={isRunning || selectedKeywords.length === 0}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 10,
                background: "var(--primary)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                cursor: isRunning || selectedKeywords.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: isRunning || selectedKeywords.length === 0 ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {isRunning ? (
                <>
                  <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
                  Running ({formatTime(elapsedTime)})
                </>
              ) : (
                <>
                  <RefreshCw style={{ width: 15, height: 15 }} />
                  Start LinkedIn Sync {selectedKeywords.length > 0 && `(${selectedKeywords.length} keyword${selectedKeywords.length > 1 ? "s" : ""})`}
                </>
              )}
            </button>
            {selectedKeywords.length === 0 && (
              <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6, textAlign: "center" }}>Select at least one keyword above.</p>
            )}
          </form>
        </div>

        {/* ── Right: Status + Results ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Selected Tags Summary */}
          {selectedKeywords.length > 0 && (
            <div style={cardStyle}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted-foreground)", marginBottom: 10 }}>
                {selectedKeywords.length} Selected Keyword{selectedKeywords.length > 1 ? "s" : ""} — Will run in sequence
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedKeywords.map((kw, i) => {
                  const preset = PRESET_KEYWORDS.find(p => p.label === kw);
                  const c = preset ? CATEGORY_COLORS[preset.category] : CATEGORY_COLORS["General"];
                  const isActive = isRunning && i === currentKeywordIdx;
                  return (
                    <div
                      key={kw}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: isActive ? (isDark ? c.bgDark : c.bg) : "var(--input)",
                        color: isActive ? (isDark ? c.textDark : c.text) : "var(--foreground)",
                        border: isActive ? `1px solid ${isDark ? c.borderDark : c.border}` : "1px solid var(--border)",
                        transition: "all 0.3s",
                      }}
                    >
                      {isActive && <Loader2 style={{ width: 9, height: 9 }} className="animate-spin" />}
                      {!isActive && i < currentKeywordIdx && step !== "idle" && (
                        <CheckCircle2 style={{ width: 9, height: 9, color: "#22c55e" }} />
                      )}
                      <span style={{ opacity: !isRunning || i >= currentKeywordIdx ? 1 : 0.5 }}>{i + 1}. {kw}</span>
                      {!isRunning && (
                        <button
                          type="button"
                          onClick={() => removeSelectedKeyword(kw)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", display: "flex", opacity: 0.6 }}
                        >
                          <X style={{ width: 9, height: 9 }} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Monitor */}
          {step !== "idle" && (
            <div style={{
              ...cardStyle,
              borderColor: step === "failed" ? "rgba(239,68,68,0.3)" : step === "completed" ? "rgba(34,197,94,0.3)" : "var(--border)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>
                  Live Sync Progress
                </h4>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {isRunning && (
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      Keyword <strong style={{ color: "var(--foreground)" }}>{currentKeywordIdx + 1}</strong> / {selectedKeywords.length}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>⏱ {formatTime(elapsedTime)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", height: 5, background: "var(--input)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                <div style={{
                  height: "100%",
                  background: step === "failed" ? "#ef4444" : step === "completed" ? "#22c55e" : "var(--primary)",
                  width: `${progress}%`,
                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                }} />
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {step === "starting" && <Loader2 style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} className="animate-spin" />}
                {step === "scraping" && <Loader2 style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0 }} className="animate-spin" />}
                {step === "processing" && <Sparkles style={{ width: 16, height: 16, color: "#818cf8", flexShrink: 0 }} className="animate-spin" />}
                {step === "completed" && <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />}
                {step === "failed" && <AlertCircle style={{ width: 16, height: 16, color: "#ef4444", flexShrink: 0 }} />}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                    {step === "starting" && "Triggering Apify Actor..."}
                    {step === "scraping" && `Crawling: "${currentKeyword}"`}
                    {step === "processing" && `Gemini Analysis: "${currentKeyword}"`}
                    {step === "completed" && "All Keywords Synced!"}
                    {step === "failed" && "Sync Failed"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, lineHeight: 1.5 }}>{statusMessage}</p>
                  {runId && (
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4, fontFamily: "monospace" }}>Run ID: {runId}</p>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444", lineHeight: 1.5 }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Stats Summary */}
          {allResults && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Total Scanned", value: allResults.processed, color: "var(--foreground)" },
                { label: "Imported (Fit)", value: allResults.imported, color: "#22c55e" },
                { label: "Skipped", value: allResults.skipped, color: "var(--muted-foreground)" },
              ].map(s => (
                <div key={s.label} style={{ ...cardStyle, textAlign: "center", padding: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: "6px 0 0" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Results Table */}
          {allResults && allResults.jobs.length > 0 && (
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>
                <Briefcase style={{ width: 15, height: 15, color: "var(--primary)" }} />
                Scraped Job Postings ({allResults.jobs.length} total)
              </h3>
              <div style={{ marginTop: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "8px 4px", color: "var(--muted-foreground)", fontWeight: 600, textAlign: "left" }}>Role / Company</th>
                      <th style={{ padding: "8px 4px", color: "var(--muted-foreground)", fontWeight: 600, textAlign: "center" }}>Match</th>
                      <th style={{ padding: "8px 4px", color: "var(--muted-foreground)", fontWeight: 600, textAlign: "center" }}>Status</th>
                      <th style={{ padding: "8px 4px", color: "var(--muted-foreground)", fontWeight: 600, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.jobs.map((job, idx) => {
                      const scoreColor = job.score >= 85 ? "#22c55e" : job.score >= 55 ? "#818cf8" : "#f59e0b";
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "11px 4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <p style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 12.5, margin: 0 }}>{job.title}</p>
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: (job as any).source === "posts" ? "rgba(2,132,199,0.12)" : "rgba(10,102,194,0.12)",
                                color: (job as any).source === "posts" ? "#0284c7" : "#0a66c2",
                                border: (job as any).source === "posts" ? "1px solid rgba(2,132,199,0.2)" : "1px solid rgba(10,102,194,0.2)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                flexShrink: 0
                              }}>
                                {(job as any).source === "posts" ? "📝 LinkedIn Post" : "💼 LinkedIn Job"}
                              </span>
                            </div>
                            <p style={{ color: "var(--muted-foreground)", fontSize: 11, margin: "3px 0 0", display: "flex", alignItems: "center", gap: 3 }}>
                              <Building2 style={{ width: 10, height: 10 }} />{job.company}
                            </p>
                          </td>
                          <td style={{ padding: "11px 4px", textAlign: "center" }}>
                            {job.score > 0 ? (
                              <span style={{
                                display: "inline-block", padding: "2px 8px", borderRadius: 12,
                                background: job.imported ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : "transparent",
                                color: job.imported ? scoreColor : "var(--muted-foreground)",
                                fontWeight: 700, fontSize: 11,
                                border: job.imported ? `1px solid ${scoreColor}40` : "none"
                              }}>
                                {job.score}%
                              </span>
                            ) : <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>—</span>}
                          </td>
                          <td style={{ padding: "11px 4px", textAlign: "center" }}>
                            {job.imported ? (
                              <span style={{ color: "#22c55e", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                                <CheckCircle2 style={{ width: 11, height: 11 }} /> Saved
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)", fontSize: 11 }} title={job.reason}>
                                Skipped
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "11px 4px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {job.url && (
                                <a href={job.url} target="_blank" rel="noreferrer" title="View on LinkedIn"
                                  style={{ padding: "5px 7px", borderRadius: 6, background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", display: "inline-flex", cursor: "pointer" }}>
                                  <ExternalLink style={{ width: 11, height: 11 }} />
                                </a>
                              )}
                              {job.imported && (
                                <Link href={job.dbId ? `/dashboard/workspace?job=${job.dbId}` : "/dashboard/workspace"}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  Pitch <ArrowRight style={{ width: 10, height: 10 }} />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Idle placeholder */}
          {step === "idle" && (
            <div style={{
              ...cardStyle, border: "1px dashed var(--border)", background: "transparent",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "52px 24px", textAlign: "center"
            }}>
              <Briefcase style={{ width: 32, height: 32, color: "var(--muted-foreground)", opacity: 0.5 }} />
              <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 14, color: "var(--foreground)" }}>Ready to Sync</h4>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6, maxWidth: 320, lineHeight: 1.6 }}>
                Select your desired job roles from the left panel and click <strong>Start LinkedIn Sync</strong>. Each keyword will be scraped in sequence and high-match jobs will be imported as workspace drafts.
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
