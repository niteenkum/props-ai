"use client";

import React from "react";
import {
  Sparkles, AlertCircle, BookOpen, X, ArrowRight,
  Globe, Mail, Link2, FileText, Zap,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useJobScanner } from "../../hooks/useJobScanner";
import { useProfile } from "../../hooks/useProfile";
import { useTheme } from "../../components/theme-provider";
import { platformLabel } from "../../utils/platform-detector";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "../styles";
import JobDrawer from "./JobDrawer";

export default function NewScanPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { profile }            = useProfile(userEmail);
  const scanner                = useJobScanner(userEmail, profile);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  if (!isReady) return null;

  const providerLabel = (scanner.aiProvider || "AI").charAt(0).toUpperCase() + (scanner.aiProvider || "ai").slice(1);

  // ─── Platform icon ────────────────────────────────────────────────────────
  const PlatformIcon = () => {
    switch (scanner.platform) {
      case "upwork":      return <Globe         style={{ width: 13, height: 13 }} />;
      case "email":       return <Mail          style={{ width: 13, height: 13 }} />;
      case "linkedin":    return <Link2         style={{ width: 13, height: 13 }} />;
      case "freelancer":  return <Zap           style={{ width: 13, height: 13 }} />;
      default:            return <FileText      style={{ width: 13, height: 13 }} />;
    }
  };

  // ─── Platform color helpers ───────────────────────────────────────────────
  const pColors = (() => {
    switch (scanner.platform) {
      case "upwork":    return { bg: isDark ? "rgba(34,197,94,0.1)"  : "#f0fdf4",  border: isDark ? "rgba(34,197,94,0.3)"  : "#bbf7d0", text: isDark ? "#4ade80" : "#16a34a" };
      case "email":     return { bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff",  border: isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe", text: isDark ? "#60a5fa" : "#2563eb" };
      case "linkedin":  return { bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff",  border: isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe", text: isDark ? "#60a5fa" : "#0a66c2" };
      case "whatsapp":  return { bg: isDark ? "rgba(34,197,94,0.1)"  : "#f0fdf4",  border: isDark ? "rgba(34,197,94,0.3)"  : "#bbf7d0", text: isDark ? "#4ade80" : "#16a34a" };
      case "freelancer":return { bg: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb",  border: isDark ? "rgba(245,158,11,0.3)" : "#fde68a", text: isDark ? "#fbbf24" : "#b45309" };
      default:          return { bg: "var(--input)", border: "var(--border)", text: "var(--muted-foreground)" };
    }
  })();

  const canAnalyze = scanner.pasteText.trim().length > 0 && !scanner.isDrawerOpen;

  return (
    <>
      {/* ── Header ── */}
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          Deep Scan Job Analyzer
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Paste any job post — Upwork, LinkedIn, WhatsApp, email — and generate tailored proposals with AI.
        </p>
      </header>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: Paste area ── */}
        <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>

          {/* Error banner */}
          {scanner.generationError && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10,
            }}>
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
                onClick={() => scanner.setPasteText(
                  "View Zvart Manukyan's profile\nZvart Manukyan\n\n • 3rd+\n\nTechnical Project & Product Manager | AI-Driven Product Development | Ex-Software Engineer\n\n1h • \n\n\nFollow\nHey there :)\n\nLooking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.\nSomeone who feels confident with frontend, cares about reusable code, and can also support a Flutter app when needed.\nPing me if this sounds like you, or share it with someone who might be a good fit.\ncontact: zvart@example.com"
                )}
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

            {/* ── Platform badge + actions ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {scanner.pasteText.trim() && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                    background: pColors.bg, color: pColors.text, border: `1px solid ${pColors.border}`,
                  }}>
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
                  disabled={!canAnalyze}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 22px", borderRadius: 10, border: "none",
                    background: canAnalyze
                      ? "linear-gradient(135deg, #818cf8, #6366f1)"
                      : "var(--border)",
                    color: canAnalyze ? "#fff" : "var(--muted-foreground)",
                    fontSize: 13, fontWeight: 700,
                    cursor: canAnalyze ? "pointer" : "not-allowed",
                    boxShadow: canAnalyze ? "0 4px 14px rgba(99,102,241,0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (canAnalyze) e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  <span>Analyze Job</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── Right: Live analysis panel ── */}
        <div style={{ ...cardStyle, minHeight: 430, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={sectionTitleStyle}>
              <BookOpen style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
              Live Analysis Engine
              {scanner.isCandidacyLoading && (
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "#818cf8",
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 50,
                  background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}>
                  <Sparkles style={{ width: 10, height: 10 }} />
                  AI Analyzing...
                </span>
              )}
              {scanner.aiCandidacy && !scanner.isCandidacyLoading && (
                <span style={{
                  marginLeft: "auto", fontSize: 9, fontWeight: 700, color: isDark ? "#4ade80" : "#16a34a",
                  textTransform: "uppercase" as const, letterSpacing: 1.2,
                  padding: "2px 7px", borderRadius: 50,
                  background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
                  border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
                }}>
                  AI Scored
                </span>
              )}
            </h3>

            {!scanner.liveHeuristics ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220, textAlign: "center", gap: 8 }}>
                <AlertCircle style={{ width: 30, height: 30, color: "var(--border)" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Waiting for inputs</p>
                <p style={{ fontSize: 10, maxWidth: 180, lineHeight: 1.6, color: "var(--muted-foreground)", opacity: 0.8 }}>
                  Paste a job post. AI will auto-analyze in 1.2s.
                </p>
              </div>
            ) : (() => {
              // Use AI data if available, else fall back to heuristics
              const ai    = scanner.aiCandidacy;
              const h     = scanner.liveHeuristics;
              const score = ai ? ai.score : h.score;
              const role  = ai ? ai.role  : h.role;
              const company = ai ? ai.company : h.company;
              const scoreColor =
                score >= 80 ? "#22c55e" :
                score >= 55 ? "#818cf8" :
                score >= 35 ? "#f59e0b" : "#ef4444";
              const fitLabel =
                score >= 80 ? "Strong Fit" :
                score >= 55 ? "Moderate Fit" :
                score >= 35 ? "Weak Fit"   : "Poor Fit";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14 }}>
                  <div>
                    <span style={labelStyle}>Identified Role</span>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: "3px 0 0" }}>{role}</p>
                  </div>
                  <div>
                    <span style={labelStyle}>Target Company</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", opacity: 0.9, margin: "3px 0 0" }}>{company}</p>
                  </div>

                  {/* Contact details */}
                  <div style={{ display: "flex", gap: 12 }}>
                    {(ai?.contactEmail || h.email !== "Not found") && (
                      <div style={{ flex: 1 }}>
                        <span style={labelStyle}>Email</span>
                        <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)", margin: "3px 0 0", wordBreak: "break-all" }}>
                          {ai?.contactEmail || h.email}
                        </p>
                      </div>
                    )}
                    {ai?.contactPhone && (
                      <div style={{ flex: 1 }}>
                        <span style={labelStyle}>Phone / WhatsApp</span>
                        <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)", margin: "3px 0 0" }}>
                          {ai.contactPhone}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Platform */}
                  <div>
                    <span style={labelStyle}>Detected Platform</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                        background: pColors.bg, color: pColors.text, border: `1px solid ${pColors.border}`,
                      }}>
                        <PlatformIcon />
                        {platformLabel(scanner.platform)}
                      </span>
                      <ArrowRight style={{ width: 12, height: 12, color: "var(--muted-foreground)", opacity: 0.4 }} />
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>6 templates available</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ paddingTop: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={labelStyle}>Candidacy Score</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1,
                          padding: "2px 7px", borderRadius: 50,
                          background: score >= 80 ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4") :
                                      score >= 55 ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)") :
                                      score >= 35 ? (isDark ? "rgba(245,158,11,0.12)" : "#fffbeb") :
                                                   (isDark ? "rgba(239,68,68,0.12)" : "#fef2f2"),
                          color: score >= 80 ? (isDark ? "#4ade80" : "#16a34a") :
                                 score >= 55 ? "#818cf8" :
                                 score >= 35 ? (isDark ? "#fbbf24" : "#b45309") :
                                              (isDark ? "#f87171" : "#dc2626"),
                          border: `1px solid ${
                            score >= 80 ? (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0") :
                            score >= 55 ? "rgba(99,102,241,0.3)" :
                            score >= 35 ? (isDark ? "rgba(245,158,11,0.3)" : "#fde68a") :
                                         (isDark ? "rgba(239,68,68,0.3)" : "#fecaca")
                          }`,
                        }}>
                          {fitLabel}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor }}>{score}%</span>
                      </div>
                    </div>
                    <div style={{ width: "100%", height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                      <div style={{
                        height: "100%", background: scoreColor,
                        width: scanner.isCandidacyLoading ? "0%" : `${score}%`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>

                    {/* AI explanation */}
                    {ai?.explanation && (
                      <p style={{
                        fontSize: 11, color: "var(--muted-foreground)", marginTop: 7,
                        lineHeight: 1.6, fontStyle: "italic",
                        padding: "6px 10px", borderRadius: 7,
                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                        border: "1px solid var(--border)",
                      }}>
                        "{ai.explanation}"
                      </p>
                    )}

                    {/* Matched skills */}
                    {ai && ai.matchedSkills.length > 0 && (
                      <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                        ✅ <strong style={{ color: "var(--foreground)" }}>{ai.matchedSkills.slice(0, 4).join(", ")}</strong> matched
                        {ai.missingSkills.length > 0 && (
                          <span style={{ color: isDark ? "#f87171" : "#dc2626" }}>
                            {" · "}⚠️ Missing: {ai.missingSkills.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Heuristic fallback: no AI yet, no matches */}
                    {!ai && !scanner.isCandidacyLoading && h.matchedSkills && h.matchedSkills.length === 0 && (
                      <p style={{ fontSize: 10, color: isDark ? "#f87171" : "#dc2626", marginTop: 5 }}>
                        ⚠️ No exact skill keywords found — AI will analyze deeper
                      </p>
                    )}
                    {!ai && !scanner.isCandidacyLoading && h.matchedSkills && h.matchedSkills.length > 0 && (
                      <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 5, lineHeight: 1.5 }}>
                        ✅ <strong style={{ color: "var(--foreground)" }}>{h.matchedSkills.slice(0, 4).join(", ")}</strong> matched
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* AI status */}
            <div style={{
              padding: "8px 12px", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: scanner.aiAvailable ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : (isDark ? "rgba(245,158,11,0.1)" : "#fffbeb"),
              border: `1px solid ${scanner.aiAvailable ? (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0") : (isDark ? "rgba(245,158,11,0.3)" : "#fde68a")}`,
            }}>
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
            {/* Available models */}
            <div style={{ padding: "8px 12px", background: "var(--input)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              {scanner.availableModels.length > 0
                ? <>Models available: <strong style={{ color: "var(--foreground)" }}>{scanner.availableModels.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}</strong>. Select in the drawer after analyzing.</>
                : <>Add a <strong style={{ color: "var(--foreground)" }}>GEMINI_API_KEY</strong> or <strong style={{ color: "var(--foreground)" }}>ANTHROPIC_API_KEY</strong> to unlock AI generation.</>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Smart Drawer ── */}
      <JobDrawer
        isOpen={scanner.isDrawerOpen}
        step={scanner.drawerStep}
        isDark={isDark}
        // duplicate
        duplicateState={scanner.duplicateState}
        onGoToExisting={scanner.handleGoToExistingJob}
        onContinueDespite={scanner.handleContinueDespiteDuplicate}
        onClose={scanner.handleCloseDrawer}
        // platforms
        selectedPlatforms={scanner.selectedPlatforms}
        onTogglePlatform={scanner.togglePlatform}
        // model
        selectedModel={scanner.selectedModel}
        availableModels={scanner.availableModels}
        onSelectModel={scanner.setSelectedModel}
        // generation
        generationError={scanner.generationError}
        onGenerateProposals={scanner.handleGenerateProposals}
        // results
        generatedProposals={scanner.generatedProposals}
        parsedJobData={scanner.parsedJobData}
        activeResultTab={scanner.activeResultTab}
        onSetActiveTab={scanner.setActiveResultTab}
        isSavingJob={scanner.isSavingJob}
        onSaveAndClose={scanner.handleSaveAndClose}
        onRegenerate={() => scanner.handleCloseDrawer()}
      />
    </>
  );
}
