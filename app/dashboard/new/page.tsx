"use client";

import React from "react";
import {
  Sparkles, AlertCircle, BookOpen, X, ArrowRight,
  Globe, Mail, Link2, FileText, Zap, Loader2, CheckCircle2,
  RotateCcw, Copy, Check, Bot, AlertTriangle, ExternalLink,
  TrendingUp, Building2, Phone, ChevronRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useJobScanner } from "../../hooks/useJobScanner";
import { useProfile } from "../../hooks/useProfile";
import { useTheme } from "../../components/theme-provider";
import { platformLabel } from "../../utils/platform-detector";
import { ALL_PLATFORMS, type PlatformKey, type AIModel } from "../../hooks/useJobScanner";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "../styles";

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

export default function NewScanPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { profile }            = useProfile(userEmail);
  const scanner                = useJobScanner(userEmail, profile);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [scanner.generatedProposals, scanner.activeResultTab]);

  if (!isReady) return null;

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

  return (
    <>
      {/* ── Header ── */}
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Deep Scan Job Analyzer</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Paste any job post — Upwork, LinkedIn, WhatsApp, email — and generate tailored proposals with AI.
        </p>
      </header>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: Paste area ── */}
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

        {/* ── Right: Dynamic analysis panel ── */}
        <div style={{ ...cardStyle, minHeight: 430, maxHeight: "calc(100vh - 130px)", display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>

          {/* ── EMPTY: no paste ── */}
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

          {/* ── READY: pasted but not analyzed ── */}
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



          {/* ── ANALYZING spinner ── */}
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

          {/* ── DUPLICATE warning ── */}
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

          {/* ── ANALYSIS results + platform selection ── */}
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
                  {ai.contactPhone && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Phone style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} /><span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{ai.contactPhone}</span></div>}
                </div>

                {/* Skills */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <div style={{ padding: "10px", borderRadius: 10, background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4", border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: isDark ? "#4ade80" : "#16a34a", margin: "0 0 6px" }}>✅ Matched</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {ai.matchedSkills.slice(0, 5).map((s, i) => <span key={i} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 50, fontWeight: 600, background: isDark ? "rgba(34,197,94,0.12)" : "#dcfce7", color: isDark ? "#4ade80" : "#166534" }}>{s}</span>)}
                      {!ai.matchedSkills.length && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>None detected</span>}
                    </div>
                  </div>
                  <div style={{ padding: "10px", borderRadius: 10, background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2", border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#fecaca"}` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: isDark ? "#f87171" : "#dc2626", margin: "0 0 6px" }}>❌ Missing</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {ai.missingSkills.slice(0, 5).map((s, i) => <span key={i} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 50, fontWeight: 600, background: isDark ? "rgba(239,68,68,0.12)" : "#fee2e2", color: isDark ? "#f87171" : "#991b1b" }}>{s}</span>)}
                      {!ai.missingSkills.length && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>None detected</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform selector */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: "var(--muted-foreground)", margin: "0 0 10px" }}>Select Templates</p>
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
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: "var(--muted-foreground)", margin: "0 0 8px" }}>AI Model</p>
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

          {/* ── GENERATING spinner ── */}
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

          {/* ── AI Status bottom bar — only on idle/ready states ── */}
          {(step === "idle" || (!scanner.pasteText.trim())) && (
            <div style={{ padding: "16px 20px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, borderTop: scanner.pasteText.trim() && step !== "checking" ? `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` : "none" }}>
              <div style={{ padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: scanner.aiAvailable ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : (isDark ? "rgba(245,158,11,0.1)" : "#fffbeb"), border: `1px solid ${scanner.aiAvailable ? (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0") : (isDark ? "rgba(245,158,11,0.3)" : "#fde68a")}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: scanner.aiAvailable ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: scanner.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                    {scanner.aiAvailable ? `${providerLabel} Active` : "Heuristic Mode"}
                  </span>
                </div>
                <span style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: 1.5, fontWeight: 700, color: scanner.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                  {scanner.aiAvailable ? "LIVE" : "BASIC"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RESULTS: full-width proposals below ── */}
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
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.5, color: "var(--muted-foreground)", opacity: 0.6 }}>
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
    </>
  );
}
