"use client";

import React from "react";
import {
  X, AlertTriangle, ExternalLink, Sparkles, CheckCircle2, Loader2,
  ArrowRight, Copy, Check, ChevronRight, Bot, Zap, Globe, Mail,
  Link2, MessageCircle, FileText, BookOpen, RotateCcw, TrendingUp, User, Building2, Phone,
} from "lucide-react";
import { ALL_PLATFORMS, type PlatformKey, type AIModel, type DrawerStep, type DuplicateState } from "../../hooks/useJobScanner";

// ─── Props ──────────────────────────────────────────────────────────────────

interface JobDrawerProps {
  isOpen: boolean;
  step: DrawerStep;
  isDark: boolean;
  // AI candidacy data (shown in analysis step)
  aiCandidacy: {
    score: number; role: string; company: string;
    contactEmail: string; contactPhone: string;
    explanation: string; matchedSkills: string[]; missingSkills: string[];
  } | null;
  isCandidacyLoading: boolean;
  onContinueToTemplates: () => void;
  // duplicate
  duplicateState: DuplicateState | null;
  onGoToExisting: () => void;
  onContinueDespite: () => void;
  onClose: () => void;
  // platform selection
  selectedPlatforms: Set<PlatformKey>;
  onTogglePlatform: (key: PlatformKey) => void;
  // model selection
  selectedModel: AIModel;
  availableModels: string[];
  onSelectModel: (m: AIModel) => void;
  // generation
  generationError: string | null;
  onGenerateProposals: () => void;
  // results
  generatedProposals: Record<string, string>;
  parsedJobData: { role: string; company: string; contactName: string; contactEmail: string; matchScore: number; tags: string[]; parsedSummary: string; } | null;
  activeResultTab: string;
  onSetActiveTab: (tab: string) => void;
  onEditProposal: (tab: string, newText: string) => void;
  isSavingJob: boolean;
  onSaveAndClose: () => void;
  onRegenerate: () => void;
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
        background: copied
          ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4")
          : "var(--input)",
        color: copied ? (isDark ? "#4ade80" : "#16a34a") : "var(--muted-foreground)",
        fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
        letterSpacing: 0.3,
      }}
    >
      {copied
        ? <><Check style={{ width: 12, height: 12 }} /> Copied!</>
        : <><Copy style={{ width: 12, height: 12 }} /> Copy</>
      }
    </button>
  );
}

// ─── Platform icon helper ────────────────────────────────────────────────────

function PlatformIcon({ key, size = 14 }: { key: string; size?: number }) {
  const s = { width: size, height: size };
  switch (key) {
    case "proposal":    return <Globe      style={s} />;
    case "coldEmail":   return <Mail       style={s} />;
    case "linkedin":    return <Link2      style={s} />;
    case "whatsapp":    return <MessageCircle style={s} />;
    case "freelancer":  return <Zap        style={s} />;
    case "coverLetter": return <FileText   style={s} />;
    default:            return <FileText   style={s} />;
  }
}

// ─── Main Drawer ─────────────────────────────────────────────────────────────

export default function JobDrawer({
  isOpen, step, isDark,
  aiCandidacy, isCandidacyLoading, onContinueToTemplates,
  duplicateState, onGoToExisting, onContinueDespite, onClose,
  selectedPlatforms, onTogglePlatform,
  selectedModel, availableModels, onSelectModel,
  generationError, onGenerateProposals,
  generatedProposals, parsedJobData, activeResultTab, onSetActiveTab, onEditProposal,
  isSavingJob, onSaveAndClose, onRegenerate,
}: JobDrawerProps) {

  // Half-screen: 50vw, clamped between 520px and 860px
  const DRAWER_W = "clamp(520px, 50vw, 860px)";

  // ─── Overlay + Drawer shell ───────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Drawer panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: DRAWER_W, zIndex: 401,
          background: isDark
            ? "linear-gradient(160deg, rgba(15,15,25,0.98) 0%, rgba(10,10,20,0.99) 100%)"
            : "linear-gradient(160deg, #fafafa 0%, #ffffff 100%)",
          borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: "-8px 0 40px rgba(0,0,0,0.2)",
          transform: isOpen ? "translateX(0)" : "translateX(110%)",
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #818cf8, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            }}>
              <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                PropAI Generator
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
                {step === "checking"  && (isCandidacyLoading ? "Analyzing job & scoring candidacy..." : "Scanning for duplicates...")}
                {step === "analysis"  && "Job analysis complete"}
                {step === "duplicate" && "Potential duplicate found"}
                {step === "platforms" && "Select platforms & model"}
                {step === "generating" && "Generating proposals..."}
                {step === "results"   && "Your proposals are ready"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--input)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--input)"; }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Step Progress Dots ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "12px 24px",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          flexShrink: 0,
        }}>
          {(["checking", "analysis", "platforms", "generating", "results"] as DrawerStep[]).map((s) => {
            const steps: DrawerStep[] = ["checking", "analysis", "duplicate", "platforms", "generating", "results"];
            const currentIdx = steps.indexOf(step);
            const stepIdx = steps.indexOf(s);
            const done = currentIdx > stepIdx;
            const active = step === s || (s === "checking" && step === "duplicate");
            if (s === "duplicate") return null; // hidden from progress bar
            return (
              <React.Fragment key={s}>
                <div style={{
                  width: active ? 28 : 8, height: 8,
                  borderRadius: 4,
                  background: done
                    ? "#22c55e"
                    : active
                      ? "linear-gradient(90deg, #818cf8, #6366f1)"
                      : "var(--border)",
                  transition: "all 0.3s ease",
                }} />
              </React.Fragment>
            );
          })}
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 6, fontWeight: 500 }}>
            {step === "checking"   && "Step 1 of 5"}
            {step === "duplicate"  && "Step 1 of 5"}
            {step === "analysis"   && "Step 2 of 5"}
            {step === "platforms"  && "Step 3 of 5"}
            {step === "generating" && "Step 4 of 5"}
            {step === "results"    && "Step 5 of 5"}
          </span>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* ── STEP: CHECKING (analyzing) ── */}
          {step === "checking" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                border: "2px solid rgba(99,102,241,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Loader2 style={{ width: 32, height: 32, color: "#818cf8", animation: "spin 1s linear infinite" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  {isCandidacyLoading ? "Analyzing Job Post" : "Checking for duplicates"}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6 }}>
                  {isCandidacyLoading
                    ? "AI is scoring your candidacy, extracting contact info..."
                    : "Scanning your existing job posts for similar applications..."}
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: ANALYSIS ── */}
          {step === "analysis" && (() => {
            const score = aiCandidacy?.score ?? 0;
            const scoreColor = score >= 85 ? "#22c55e" : score >= 55 ? "#818cf8" : score >= 35 ? "#f59e0b" : "#ef4444";
            const scoreLabel = score >= 85 ? "Strong Fit" : score >= 55 ? "Moderate Fit" : score >= 35 ? "Weak Fit" : "Poor Fit";
            const circumference = 2 * Math.PI * 34;
            const dashOffset = circumference - (score / 100) * circumference;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Score hero */}
                <div style={{
                  padding: "24px", borderRadius: 16,
                  background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
                  border: "1px solid rgba(99,102,241,0.15)",
                  display: "flex", alignItems: "center", gap: 20,
                }}>
                  {/* SVG ring */}
                  <div style={{ flexShrink: 0, position: "relative" }}>
                    <svg width="84" height="84" viewBox="0 0 84 84">
                      <circle cx="42" cy="42" r="34" fill="none" stroke={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="7" />
                      <circle cx="42" cy="42" r="34" fill="none" stroke={scoreColor} strokeWidth="7"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        strokeLinecap="round" transform="rotate(-90 42 42)"
                        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: 0.5 }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
                        background: `${scoreColor}20`, color: scoreColor,
                        border: `1px solid ${scoreColor}40`,
                      }}>{scoreLabel}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.6 }}>
                      {aiCandidacy?.explanation || "AI analyzed your profile against this job post."}
                    </p>
                  </div>
                </div>

                {/* Job details */}
                <div style={{
                  padding: "16px", borderRadius: 14,
                  background: "var(--card)", border: "1px solid var(--border)",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: "var(--muted-foreground)", margin: 0 }}>Job Details</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {aiCandidacy?.role && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <TrendingUp style={{ width: 13, height: 13, color: "#818cf8", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 600 }}>{aiCandidacy.role}</span>
                      </div>
                    )}
                    {aiCandidacy?.company && aiCandidacy.company !== "Not specified" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Building2 style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{aiCandidacy.company}</span>
                      </div>
                    )}
                    {aiCandidacy?.contactEmail && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Mail style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{aiCandidacy.contactEmail}</span>
                      </div>
                    )}
                    {aiCandidacy?.contactPhone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Phone style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{aiCandidacy.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Matched */}
                  <div style={{
                    padding: "14px", borderRadius: 12,
                    background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                    border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: isDark ? "#4ade80" : "#16a34a", margin: "0 0 8px" }}>✅ Matched</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(aiCandidacy?.matchedSkills ?? []).slice(0, 6).map((s, i) => (
                        <span key={i} style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 600,
                          background: isDark ? "rgba(34,197,94,0.12)" : "#dcfce7",
                          color: isDark ? "#4ade80" : "#166534",
                        }}>{s}</span>
                      ))}
                      {!aiCandidacy?.matchedSkills?.length && <span style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6 }}>None detected</span>}
                    </div>
                  </div>
                  {/* Missing */}
                  <div style={{
                    padding: "14px", borderRadius: 12,
                    background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2",
                    border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#fecaca"}`,
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, color: isDark ? "#f87171" : "#dc2626", margin: "0 0 8px" }}>❌ Missing</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(aiCandidacy?.missingSkills ?? []).slice(0, 6).map((s, i) => (
                        <span key={i} style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 600,
                          background: isDark ? "rgba(239,68,68,0.12)" : "#fee2e2",
                          color: isDark ? "#f87171" : "#991b1b",
                        }}>{s}</span>
                      ))}
                      {!aiCandidacy?.missingSkills?.length && <span style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6 }}>None detected</span>}
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ── STEP: DUPLICATE ── */}
          {step === "duplicate" && duplicateState && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Warning banner */}
              <div style={{
                padding: "16px", borderRadius: 14,
                background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb",
                border: `1px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fde68a"}`,
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <AlertTriangle style={{ width: 20, height: 20, color: isDark ? "#fbbf24" : "#d97706", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fbbf24" : "#92400e", margin: 0 }}>
                    Potential Duplicate Detected
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, lineHeight: 1.6 }}>
                    {duplicateState.reason}
                  </p>
                </div>
              </div>

              {/* Existing job card */}
              <div style={{
                padding: 18, borderRadius: 14,
                background: "var(--card)", border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)" }}>
                    Existing Application
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 10px", borderRadius: 50, fontWeight: 700,
                    background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb",
                    color: isDark ? "#fbbf24" : "#b45309",
                    border: `1px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fde68a"}`,
                  }}>
                    {duplicateState.confidence}% match
                  </span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>
                  {duplicateState.existingJob.role}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 10px" }}>
                  at <strong style={{ color: "var(--foreground)" }}>{duplicateState.existingJob.company}</strong>
                  {duplicateState.existingJob.contactEmail && (
                    <> · <span style={{ fontFamily: "monospace", fontSize: 11 }}>{duplicateState.existingJob.contactEmail}</span></>
                  )}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {duplicateState.existingJob.tags.slice(0, 5).map((tag, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 600,
                      background: "var(--input)", color: "var(--muted-foreground)", border: "1px solid var(--border)",
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={onGoToExisting}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #818cf8, #6366f1)",
                    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <ExternalLink style={{ width: 15, height: 15 }} />
                  View Existing Application
                </button>
                <button
                  onClick={onContinueDespite}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12,
                    border: "1px solid var(--border)", background: "var(--input)",
                    color: "var(--foreground)", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--input)"; }}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  Create New Anyway
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PLATFORMS ── */}
          {step === "platforms" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Platform selector */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", marginBottom: 12 }}>
                  Select Platforms to Generate
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {ALL_PLATFORMS.map(p => {
                    const active = selectedPlatforms.has(p.key as PlatformKey);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => onTogglePlatform(p.key as PlatformKey)}
                        style={{
                          padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                          border: `2px solid ${active ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                          background: active
                            ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)")
                            : "var(--card)",
                          textAlign: "left", transition: "all 0.18s",
                          display: "flex", flexDirection: "column", gap: 4,
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 14 }}>{p.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#818cf8" : "var(--foreground)" }}>
                            {p.label}
                          </span>
                          {active && (
                            <CheckCircle2 style={{ width: 13, height: 13, color: "#818cf8", marginLeft: "auto" }} />
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500, paddingLeft: 21 }}>
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model selector */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", marginBottom: 12 }}>
                  AI Model
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { key: "auto"   as AIModel, label: "Auto (Best Available)", icon: <Bot style={{ width: 14, height: 14 }} />, desc: "Uses whichever key is configured" },
                    { key: "gemini" as AIModel, label: "Gemini 2.5 Flash",       icon: <span style={{ fontSize: 13 }}>✨</span>,  desc: "Google · Fast & accurate" },
                    { key: "claude" as AIModel, label: "Claude Sonnet",           icon: <span style={{ fontSize: 13 }}>🤖</span>,  desc: "Anthropic · Great for writing" },
                  ].map(model => {
                    const isAvailable = model.key === "auto" || availableModels.includes(model.key);
                    const isSelected  = selectedModel === model.key;
                    return (
                      <button
                        key={model.key}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => { if (isAvailable) onSelectModel(model.key); }}
                        style={{
                          padding: "11px 14px", borderRadius: 11, cursor: isAvailable ? "pointer" : "not-allowed",
                          border: `2px solid ${isSelected ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                          background: isSelected
                            ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)")
                            : "var(--card)",
                          opacity: isAvailable ? 1 : 0.45,
                          display: "flex", alignItems: "center", gap: 10, transition: "all 0.18s",
                        }}
                        onMouseEnter={e => { if (isAvailable && !isSelected) e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: isSelected
                            ? "linear-gradient(135deg, #818cf8, #6366f1)"
                            : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isSelected ? "#fff" : "var(--muted-foreground)",
                        }}>
                          {model.icon}
                        </div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#818cf8" : "var(--foreground)" }}>
                            {model.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{model.desc}</div>
                        </div>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 700,
                          background: isAvailable
                            ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4")
                            : (isDark ? "rgba(239,68,68,0.1)" : "#fef2f2"),
                          color: isAvailable
                            ? (isDark ? "#4ade80" : "#16a34a")
                            : (isDark ? "#f87171" : "#dc2626"),
                          border: `1px solid ${isAvailable
                            ? (isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0")
                            : (isDark ? "rgba(239,68,68,0.2)" : "#fecaca")}`,
                        }}>
                          {isAvailable ? "Available" : "No Key"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {generationError && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444", fontSize: 12, fontWeight: 500,
                }}>
                  {generationError}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === "generating" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))",
                border: "2px solid rgba(99,102,241,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "pulse 2s ease-in-out infinite",
              }}>
                <Sparkles style={{ width: 32, height: 32, color: "#818cf8", animation: "spin 3s linear infinite" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
                  Crafting your proposals...
                </p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  PropAI is analyzing the job, matching your skills,<br />
                  and writing personalized outreach for each platform.
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {Array.from(selectedPlatforms).map(p => {
                  const info = ALL_PLATFORMS.find(pl => pl.key === p);
                  return (
                    <span key={p} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                      background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)",
                      color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)",
                    }}>
                      <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                      {info?.label || p}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP: RESULTS ── */}
          {step === "results" && Object.keys(generatedProposals).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Parsed job info */}
              {parsedJobData && (
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                      {parsedJobData.role}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                      {parsedJobData.company}
                      {parsedJobData.contactEmail && <> · <span style={{ fontFamily: "monospace" }}>{parsedJobData.contactEmail}</span></>}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    color: parsedJobData.matchScore >= 90 ? "#22c55e" : parsedJobData.matchScore >= 75 ? "#818cf8" : "#f59e0b",
                  }}>
                    {parsedJobData.matchScore}%
                  </span>
                </div>
              )}

              {/* Platform tabs */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {Object.keys(generatedProposals).map(p => {
                  const info = ALL_PLATFORMS.find(pl => pl.key === p);
                  const active = activeResultTab === p;
                  const failed = generatedProposals[p]?.startsWith("[Generation failed");
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSetActiveTab(p)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                        border: `1.5px solid ${active ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                        background: active
                          ? (isDark ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.08)")
                          : "var(--card)",
                        color: active ? "#818cf8" : (failed ? "#ef4444" : "var(--foreground)"),
                        fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 12 }}>{info?.icon || "📄"}</span>
                      {info?.label || p}
                    </button>
                  );
                })}
              </div>

              {/* Active platform content — editable */}
              {activeResultTab && generatedProposals[activeResultTab] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
                  {/* Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
                      color: "var(--muted-foreground)", opacity: 0.6,
                    }}>
                      ✏️ Editable — click to modify
                    </span>
                    <CopyButton text={generatedProposals[activeResultTab]} isDark={isDark} />
                  </div>
                  {/* Editable textarea */}
                  <textarea
                    value={generatedProposals[activeResultTab]}
                    onChange={e => onEditProposal(activeResultTab, e.target.value)}
                    spellCheck={false}
                    style={{
                      flex: 1,
                      minHeight: 340,
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "var(--input)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: "var(--foreground)",
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)"; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"; }}
                  />
                  {/* Character count */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.5, fontFamily: "monospace" }}>
                      {generatedProposals[activeResultTab].length} chars
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "16px 24px",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          flexShrink: 0,
        }}>
          {/* Analysis step footer: Continue button */}
          {step === "analysis" && (
            <button
              onClick={onContinueToTemplates}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 18px rgba(99,102,241,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Sparkles style={{ width: 15, height: 15 }} />
              Continue to Templates
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          )}

          {step === "platforms" && (
            <button
              onClick={onGenerateProposals}
              disabled={selectedPlatforms.size === 0}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: selectedPlatforms.size > 0
                  ? "linear-gradient(135deg, #818cf8, #6366f1)"
                  : "var(--border)",
                color: selectedPlatforms.size > 0 ? "#fff" : "var(--muted-foreground)",
                fontSize: 14, fontWeight: 700, cursor: selectedPlatforms.size > 0 ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: selectedPlatforms.size > 0 ? "0 4px 18px rgba(99,102,241,0.35)" : "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (selectedPlatforms.size > 0) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Sparkles style={{ width: 15, height: 15 }} />
              Generate {selectedPlatforms.size} Proposal{selectedPlatforms.size !== 1 ? "s" : ""}
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          )}

          {step === "results" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onRegenerate}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--input)",
                  color: "var(--foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--input)"; }}
              >
                <RotateCcw style={{ width: 13, height: 13 }} />
                Regenerate
              </button>
              <button
                onClick={onSaveAndClose}
                disabled={isSavingJob}
                style={{
                  flex: 2, padding: "12px", borderRadius: 12, border: "none",
                  background: isSavingJob ? "var(--border)" : "linear-gradient(135deg, #818cf8, #6366f1)",
                  color: isSavingJob ? "var(--muted-foreground)" : "#fff",
                  fontSize: 14, fontWeight: 700, cursor: isSavingJob ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: isSavingJob ? "none" : "0 4px 16px rgba(99,102,241,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { if (!isSavingJob) e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                {isSavingJob
                  ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Saving...</>
                  : <><CheckCircle2 style={{ width: 14, height: 14 }} /> Save & View Job</>
                }
              </button>
            </div>
          )}

          {(step === "checking" || step === "duplicate") && (
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "11px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--input)",
                color: "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </>
  );
}
