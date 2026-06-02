"use client";

import React from "react";
import {
  Sparkles, AlertCircle, BookOpen, Loader2, X, ArrowRight,
  ExternalLink, Globe, Mail, Link2, FileText, Search,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useJobScanner } from "../../hooks/useJobScanner";
import { useProfile } from "../../hooks/useProfile";
import { useTheme } from "../../components/theme-provider";
import { platformLabel, platformTemplates } from "../../utils/platform-detector";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "../styles";

export default function NewScanPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { profile }            = useProfile(userEmail);
  const scanner                = useJobScanner(userEmail, profile);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  if (!isReady) return null;

  const providerLabel = (scanner.aiProvider || "AI").charAt(0).toUpperCase() + (scanner.aiProvider || "ai").slice(1);
  const relevantTemplates = platformTemplates(scanner.platform);

  // ─── Platform icon ────────────────────────────────────────────────────────
  const PlatformIcon = () => {
    switch (scanner.platform) {
      case "upwork":   return <Globe    style={{ width: 13, height: 13 }} />;
      case "email":    return <Mail     style={{ width: 13, height: 13 }} />;
      case "linkedin": return <Link2    style={{ width: 13, height: 13 }} />;
      default:         return <FileText style={{ width: 13, height: 13 }} />;
    }
  };

  // ─── Platform color helpers ───────────────────────────────────────────────
  const platformColors = () => {
    switch (scanner.platform) {
      case "upwork":   return { bg: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",  border: isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0",  text: isDark ? "#4ade80" : "#16a34a" };
      case "email":    return { bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff", border: isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe", text: isDark ? "#60a5fa" : "#2563eb" };
      case "linkedin": return { bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff", border: isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe", text: isDark ? "#60a5fa" : "#0a66c2" };
      default:         return { bg: "var(--input)", border: "var(--border)", text: "var(--muted-foreground)" };
    }
  };
  const pColors = platformColors();

  return (
    <>
      {/* ── Header ── */}
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          Deep Scan Job Analyzer
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Paste raw job postings to run smart heuristic parser extraction.
        </p>
      </header>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: Paste area ── */}
        <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>

          {/* ── DUPLICATE ALERT OVERLAY ── */}
          {scanner.duplicateState && (
            <div style={{
              position: "absolute", inset: 0,
              background: "var(--card)", opacity: 0.98,
              backdropFilter: "blur(12px)", zIndex: 30,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 16, padding: 32,
            }}>
              {/* Warning icon */}
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: isDark ? "rgba(245,158,11,0.15)" : "#fffbeb",
                border: `2px solid ${isDark ? "rgba(245,158,11,0.4)" : "#fde68a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertCircle style={{ width: 28, height: 28, color: isDark ? "#fbbf24" : "#d97706" }} />
              </div>

              {/* Title */}
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Potential Duplicate Detected
                </h3>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, maxWidth: 380, lineHeight: 1.6 }}>
                  {scanner.duplicateState.reason}
                </p>
              </div>

              {/* Existing job card */}
              <div style={{
                width: "100%", maxWidth: 420,
                padding: 16, borderRadius: 12,
                background: "var(--input)", border: "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)" }}>
                    Existing Job Post
                  </span>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 700,
                    background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb",
                    color: isDark ? "#fbbf24" : "#b45309",
                    border: `1px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fde68a"}`,
                  }}>
                    {scanner.duplicateState.confidence}% Match
                  </span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                  {scanner.duplicateState.existingJob.role}
                </h4>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                  at <strong style={{ color: "var(--foreground)" }}>{scanner.duplicateState.existingJob.company}</strong>
                  {scanner.duplicateState.existingJob.contactEmail && (
                    <> · {scanner.duplicateState.existingJob.contactEmail}</>
                  )}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                  {scanner.duplicateState.existingJob.tags.slice(0, 4).map((tag, i) => (
                    <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 50, background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 4, width: "100%", maxWidth: 420 }}>
                <button
                  onClick={scanner.handleGoToExistingJob}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 0", borderRadius: 10,
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <ExternalLink style={{ width: 14, height: 14 }} />
                  <span>Go to Existing Job</span>
                </button>
                <button
                  onClick={scanner.handleIgnoreDuplicate}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 0", borderRadius: 10,
                    background: "transparent", color: "var(--foreground)",
                    border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Sparkles style={{ width: 14, height: 14 }} />
                  <span>Create New Anyway</span>
                </button>
              </div>

              {/* Dismiss */}
              <button
                onClick={scanner.handleDismissDuplicate}
                style={{
                  fontSize: 11, color: "var(--muted-foreground)", background: "none",
                  border: "none", cursor: "pointer", marginTop: 4, opacity: 0.7,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; }}
              >
                Cancel and edit paste
              </button>
            </div>
          )}

          {/* ── CHECKING DUPLICATE OVERLAY ── */}
          {scanner.isCheckingDuplicate && (
            <div style={{
              position: "absolute", inset: 0,
              background: "var(--card)", opacity: 0.96,
              backdropFilter: "blur(8px)", zIndex: 25,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <Search style={{ width: 32, height: 32, color: "var(--foreground)", animation: "spin 2s linear infinite" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                Scanning for duplicates...
              </p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, fontFamily: "monospace" }}>
                Checking existing outreach records
              </p>
            </div>
          )}

          {/* ── GENERATING OVERLAY ── */}
          {scanner.isGenerating && (
            <div style={{
              position: "absolute", inset: 0,
              background: "var(--card)", opacity: 0.96,
              backdropFilter: "blur(8px)", zIndex: 20,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            }}>
              <Loader2 style={{ width: 36, height: 36, color: "var(--foreground)", animation: "spin 1s linear infinite" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                  {scanner.aiAvailable ? `Generating via ${providerLabel}...` : "Synthesizing Proposal Models..."}
                </p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 4 }}>
                  {[
                    "Deconstructing job specifications...",
                    "Extracting role, company & contact data...",
                    "Calculating candidacy match vector...",
                    scanner.aiAvailable ? "AI is crafting your cold email..." : "Engineering professional cold email draft...",
                    scanner.aiAvailable ? "AI is drafting your proposal..."  : "Drafting contextual Upwork bid proposal...",
                    scanner.aiAvailable ? "Finalizing all outreach templates..." : "Synthesizing high-impact templates...",
                  ][scanner.generationStep]}
                </p>
                {scanner.aiAvailable && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
                    padding: "3px 10px", borderRadius: 50,
                    background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
                    border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
                    fontSize: 10, fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    {providerLabel} Connected
                  </span>
                )}
              </div>
              <div style={{ width: 200, height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: scanner.aiAvailable ? "#22c55e" : "var(--primary)",
                  width: `${((scanner.generationStep + 1) / 6) * 100}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}

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
                  "View Zvart Manukyan's profile\nZvart Manukyan\n\n • 3rd+\n\nTechnical Project & Product Manager | AI-Driven Product Development | Ex-Software Engineer\n\n1h • \n\n\nFollow\nHey there :)\n\nLooking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.\nSomeone who feels confident with frontend, cares about reusable code, and can also support a Flutter app when needed.\nPing me if this sounds like you, or share it with someone who might be a good fit."
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
              placeholder="Paste the full job post, LinkedIn listing, Upwork description, or email request here..."
              style={{ ...inputStyle, resize: "none", lineHeight: 1.7, fontFamily: "inherit" }}
            />

            {/* ── Platform badge + AI status ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Platform badge */}
                {scanner.pasteText.trim() && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                    background: pColors.bg, color: pColors.text,
                    border: `1px solid ${pColors.border}`,
                  }}>
                    <PlatformIcon />
                    {platformLabel(scanner.platform)}
                  </span>
                )}
                {/* Template count */}
                {scanner.pasteText.trim() && (
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    → {relevantTemplates.length === 1
                      ? `${relevantTemplates[0] === "proposal" ? "Proposal" : relevantTemplates[0] === "coldEmail" ? "Cold Email" : "LinkedIn"} only`
                      : `${relevantTemplates.length} templates`}
                  </span>
                )}
                {/* AI status dot */}
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
                  onMouseEnter={e => e.currentTarget.style.background = "var(--input)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                >
                  Clear Text
                </button>
                <button
                  type="submit"
                  disabled={!scanner.pasteText.trim() || scanner.isGenerating || scanner.isCheckingDuplicate}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 22px", borderRadius: 10, border: "none",
                    background: scanner.pasteText.trim() && !scanner.isGenerating && !scanner.isCheckingDuplicate ? "var(--primary)" : "var(--border)",
                    color: scanner.pasteText.trim() && !scanner.isGenerating && !scanner.isCheckingDuplicate ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    fontSize: 13, fontWeight: 600,
                    cursor: scanner.pasteText.trim() && !scanner.isGenerating && !scanner.isCheckingDuplicate ? "pointer" : "not-allowed",
                  }}
                  onMouseEnter={e => { if (scanner.pasteText.trim() && !scanner.isGenerating) e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  <span>{scanner.aiAvailable ? "Generate with AI" : "Parse & Generate Outreach"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── Right: Live heuristics panel ── */}
        <div style={{ ...cardStyle, height: 430, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={sectionTitleStyle}>
              <BookOpen style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
              Live Analysis Engine
            </h3>

            {!scanner.liveHeuristics ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220, textAlign: "center", gap: 8 }}>
                <AlertCircle style={{ width: 30, height: 30, color: "var(--border)" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Waiting for inputs</p>
                <p style={{ fontSize: 10, maxWidth: 180, lineHeight: 1.6, color: "var(--muted-foreground)", opacity: 0.8 }}>
                  Paste a job post to see live parsing.{" "}
                  {scanner.aiAvailable ? "AI will generate personalized outreach." : "Add an API key to enable AI generation."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
                <div>
                  <span style={labelStyle}>Identified Role</span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: "4px 0 0" }}>{scanner.liveHeuristics.role}</p>
                </div>
                <div>
                  <span style={labelStyle}>Target Company</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", opacity: 0.9, margin: "4px 0 0" }}>{scanner.liveHeuristics.company}</p>
                </div>
                <div>
                  <span style={labelStyle}>Contact E-Mail</span>
                  <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)", margin: "4px 0 0" }}>{scanner.liveHeuristics.email}</p>
                </div>

                {/* Platform detection */}
                <div>
                  <span style={labelStyle}>Detected Platform</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                      background: pColors.bg, color: pColors.text,
                      border: `1px solid ${pColors.border}`,
                    }}>
                      <PlatformIcon />
                      {platformLabel(scanner.platform)}
                    </span>
                    <ArrowRight style={{ width: 12, height: 12, color: "var(--muted-foreground)", opacity: 0.4 }} />
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      {relevantTemplates.length === 1
                        ? `${relevantTemplates[0] === "proposal" ? "Proposal" : relevantTemplates[0] === "coldEmail" ? "Cold Email" : "LinkedIn Message"}`
                        : `${relevantTemplates.length} templates`}
                    </span>
                  </div>
                </div>

                <div style={{ paddingTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={labelStyle}>Candidacy Score</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: scanner.liveHeuristics.score >= 90 ? "#22c55e" : scanner.liveHeuristics.score >= 80 ? (isDark ? "var(--foreground)" : "#111") : "#f59e0b" }}>
                      {scanner.liveHeuristics.score}%
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                    <div style={{ height: "100%", background: scanner.liveHeuristics.score >= 90 ? "#22c55e" : scanner.liveHeuristics.score >= 80 ? (isDark ? "var(--foreground)" : "#111") : "#f59e0b", width: `${scanner.liveHeuristics.score}%`, transition: "width 0.3s ease" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, color: scanner.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                {scanner.aiAvailable ? "LIVE" : "BASIC"}
              </span>
            </div>
            <div style={{ padding: "8px 12px", background: "var(--input)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              {scanner.aiAvailable
                ? <><strong style={{ color: "var(--foreground)" }}>AI-generated</strong> templates using <strong style={{ color: "var(--foreground)" }}>{profile?.name || "your profile"}</strong> for maximum personalization.</>
                : <>Add a <strong style={{ color: "var(--foreground)" }}>GEMINI_API_KEY</strong> to <strong style={{ color: "var(--foreground)" }}>.env</strong> to unlock AI-powered outreach generation.</>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
