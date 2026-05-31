"use client";

import React from "react";
import {
  Briefcase, Sparkles, Mail, Calendar, Plus, Search, ChevronRight,
  TrendingUp, Users, Check, Copy, Trash2, BookOpen, Edit3, Loader2,
  AlertCircle, UploadCloud, FileText, Award, Terminal, GraduationCap, Save, X,
} from "lucide-react";
import Sidebar from "../components/sidebar";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "../components/ui/drawer";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../hooks/useDashboard";
import { analyzeAndGenerateAction } from "../actions/ai-actions";
import { updateJobPostAction } from "../actions/db-actions";
import { useTheme } from "../components/theme-provider";

// ─── Shared Styles ────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
  transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--foreground)",
  outline: "none",
  transition: "all 0.15s ease",
};
const label: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase" as const,
  fontWeight: 700,
  color: "var(--muted-foreground)",
  opacity: 0.8,
  letterSpacing: 1.2,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--foreground)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingBottom: 12,
  borderBottom: "1px solid var(--border)",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { userEmail, isReady, logout } = useAuth({ requiredStatus: "ACTIVE" });
  const db = useDashboard(userEmail);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!isReady) return null;

  const providerLabel = (db.aiProvider || "AI").charAt(0).toUpperCase() + (db.aiProvider || "ai").slice(1);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--background)",
        padding: 16,
        gap: 24,
        transition: "background 0.3s ease",
      }}
    >
      
      {/* ── Sidebar ── */}
      <Sidebar
        activeTab={db.activeTab}
        setActiveTab={db.setActiveTab}
        onLogout={logout}
        userName={db.profile?.name}
        userRole={db.profile?.role}
      />

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, maxHeight: "100vh", overflowY: "auto", paddingRight: 8 }}>

        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              {db.activeTab === "dashboard" && "Outreach Workspace"}
              {db.activeTab === "new"       && "Deep Scan Job Analyzer"}
              {db.activeTab === "profile"   && "Candidate Profile"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              {db.activeTab === "dashboard" && "Organize outreach, manage parsed channels, and customize templates."}
              {db.activeTab === "new"       && "Paste raw job postings to run smart heuristic parser extraction."}
              {db.activeTab === "profile"   && "Configure the custom parameters and resume points the AI uses to customize outreach cover letters."}
            </p>
          </div>

          {db.activeTab === "dashboard" && (
            <button
              onClick={() => db.setActiveTab("new")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "var(--card-shadow)", transition: "opacity 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>New Job Scan</span>
            </button>
          )}

          {db.activeTab === "profile" && (
            <button
              onClick={() => db.handleSaveProfile()}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "var(--card-shadow)", transition: "opacity 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Save style={{ width: 15, height: 15 }} />
              <span>{db.profileSaving ? "Saving..." : "Save Profile"}</span>
            </button>
          )}
        </header>

        {/* Profile saved banner */}
        {db.profileSaveSuccess && (
          <div style={{ padding: "10px 16px", borderRadius: 10, background: isDark ? "rgba(34, 197, 94, 0.1)" : "#f0fdf4", border: `1px solid ${isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0"}`, color: isDark ? "#4ade80" : "#16a34a", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Check style={{ width: 15, height: 15 }} />
            <span>Profile updated! All subsequent proposals will use your updated settings.</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 1 · DASHBOARD
        ══════════════════════════════════════════════════════════════════ */}
        {db.activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { icon: Briefcase,  label: "Total Scans",     value: db.stats.total },
                { icon: TrendingUp, label: "Avg Match",        value: `${db.stats.avgMatch}%` },
                { icon: Users,      label: "Active Apps",      value: db.stats.active },
                { icon: Sparkles,   label: "Outreach Ready",   value: db.stats.generated },
              ].map(({ icon: Icon, label: lbl, value }) => (
                <div key={lbl} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon style={{ width: 20, height: 20, color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: 0 }}>{lbl}</p>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: "4px 0 0" }}>{value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Search & Filters */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", background: "var(--card)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ position: "relative", width: 320 }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                <input
                  type="text"
                  value={db.searchQuery}
                  onChange={e => db.setSearchQuery(e.target.value)}
                  placeholder="Search role, company, skills..."
                  style={{ ...input, paddingLeft: 36 }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--input)", border: "1px solid var(--border)" }}>
                {["All", "Draft", "Generated", "Sent", "Interviewing"].map(s => (
                  <button
                    key={s}
                    onClick={() => db.setStatusFilter(s.toLowerCase())}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 7,
                      border: "none",
                      background: db.statusFilter === s.toLowerCase() ? "var(--primary)" : "transparent",
                      color: db.statusFilter === s.toLowerCase() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Job List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {db.filteredJobs.length === 0 ? (
                <div style={{ ...card, padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderStyle: "dashed" }}>
                  <Briefcase style={{ width: 36, height: 36, color: "var(--border)", marginBottom: 12 }} />
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)" }}>No job postings match your filters.</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.7, marginTop: 4 }}>Try expanding your search or paste a new post.</p>
                </div>
              ) : db.filteredJobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => db.openJobDrawer(job)}
                  style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--card-shadow)"; e.currentTarget.style.borderColor = "var(--muted-foreground)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{job.role}</h4>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.8 }}>at</span>
                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontWeight: 500 }}>{job.company}</span>
                      <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 700, background: db.getScoreBg(job.matchScore), color: db.getScoreColor(job.matchScore), border: `1px solid ${db.getScoreColor(job.matchScore)}22` }}>
                        {job.matchScore}% Match
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--muted-foreground)", opacity: 0.8, flexWrap: "wrap" }}>
                      {job.contactEmail && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Mail style={{ width: 13, height: 13, color: "var(--muted-foreground)", opacity: 0.6 }} />
                          <span>{job.contactEmail}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Calendar style={{ width: 13, height: 13, color: "var(--muted-foreground)", opacity: 0.6 }} />
                        <span>{new Date(job.postedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {job.tags.slice(0, 4).map((tag, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, background: "var(--input)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{tag}</span>
                      ))}
                      {job.tags.length > 4 && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>+{job.tags.length - 4} more</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ ...db.getStatusStyle(job.status), padding: "4px 12px", borderRadius: 50, fontSize: 11, fontWeight: 600 }}>{job.status}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--input)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.6 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 2 · PASTE & SCAN
        ══════════════════════════════════════════════════════════════════ */}
        {db.activeTab === "new" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

            {/* Left: Paste area */}
            <div style={{ ...card, position: "relative", overflow: "hidden" }}>
              
              {/* Generating overlay */}
              {db.isGenerating && (
                <div style={{ position: "absolute", inset: 0, background: "var(--card)", opacity: 0.96, backdropFilter: "blur(8px)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <Loader2 style={{ width: 36, height: 36, color: "var(--foreground)", animation: "spin 1s linear infinite" }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                      {db.aiAvailable ? `Generating via ${providerLabel}...` : "Synthesizing Proposal Models..."}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 4 }}>
                      {["Deconstructing job specifications...", "Extracting role, company & contact data...", "Calculating candidacy match vector...", db.aiAvailable ? "AI is crafting your cold email..." : "Engineering professional cold email draft...", db.aiAvailable ? "AI is drafting your proposal..." : "Drafting contextual Upwork bid proposal...", db.aiAvailable ? "Finalizing all 4 outreach templates..." : "Synthesizing high-impact templates..."][db.generationStep]}
                    </p>
                    {db.aiAvailable && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "3px 10px", borderRadius: 50, background: isDark ? "rgba(34, 197, 94, 0.1)" : "#f0fdf4", border: `1px solid ${isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0"}`, fontSize: 10, fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                        {providerLabel} Connected
                      </span>
                    )}
                  </div>
                  <div style={{ width: 200, height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: db.aiAvailable ? "#22c55e" : "var(--primary)", transition: "width 0.5s ease", width: `${((db.generationStep + 1) / 6) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Error banner */}
              {db.generationError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span>{db.generationError}</span>
                  </div>
                  <button onClick={() => db.setGenerationError(null)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", padding: 2 }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}

              <form onSubmit={db.handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Raw Job Post Content</label>
                  <button
                    type="button"
                    onClick={() => db.setPasteText("View Zvart Manukyan's profile\nZvart Manukyan\n\n • 3rd+\n\nTechnical Project & Product Manager | AI-Driven Product Development | Ex-Software Engineer\n\n1h • \n\n\nFollow\nHey there :)\n\nLooking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.\nSomeone who feels confident with frontend, cares about reusable code, and can also support a Flutter app when needed.\nPing me if this sounds like you, or share it with someone who might be a good fit.")}
                    style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  >
                    Insert Demo Post
                  </button>
                </div>
                <textarea
                  rows={12}
                  value={db.pasteText}
                  onChange={e => { db.setPasteText(e.target.value); db.setGenerationError(null); }}
                  placeholder="Paste the full job post, LinkedIn listing, Upwork description, or email request here..."
                  style={{ ...input, resize: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: db.aiAvailable ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
                      {db.aiAvailable ? `${providerLabel} Ready` : "Heuristic Mode (no API key)"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => { db.setPasteText(""); db.setGenerationError(null); }} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--input)"} onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}>
                      Clear Text
                    </button>
                    <button
                      type="submit"
                      disabled={!db.pasteText.trim() || db.isGenerating}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, border: "none", background: db.pasteText.trim() && !db.isGenerating ? "var(--primary)" : "var(--border)", color: db.pasteText.trim() && !db.isGenerating ? "var(--primary-foreground)" : "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: db.pasteText.trim() && !db.isGenerating ? "pointer" : "not-allowed", transition: "opacity 0.2s" }}
                      onMouseEnter={e => { if (db.pasteText.trim() && !db.isGenerating) e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                    >
                      <Sparkles style={{ width: 15, height: 15 }} />
                      <span>{db.aiAvailable ? "Generate with AI" : "Parse & Generate Outreach"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right: Live heuristics panel */}
            <div style={{ ...card, height: 430, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={sectionTitle}>
                  <BookOpen style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                  Live Analysis Engine
                </h3>
                {!db.liveHeuristics ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220, textAlign: "center", color: "var(--border)", gap: 8 }}>
                    <AlertCircle style={{ width: 30, height: 30, color: "var(--border)" }} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Waiting for inputs</p>
                    <p style={{ fontSize: 10, maxWidth: 180, lineHeight: 1.6, color: "var(--muted-foreground)", opacity: 0.8 }}>
                      Paste a job post to see live parsing.{" "}
                      {db.aiAvailable ? "AI will generate personalized outreach." : "Add an API key to enable AI generation."}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
                    <div><span style={label}>Identified Role</span><p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: "4px 0 0" }}>{db.liveHeuristics.role}</p></div>
                    <div><span style={label}>Target Company</span><p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", opacity: 0.9, margin: "4px 0 0" }}>{db.liveHeuristics.company}</p></div>
                    <div><span style={label}>Contact E-Mail</span><p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)", margin: "4px 0 0" }}>{db.liveHeuristics.email}</p></div>
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={label}>Candidacy Score</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: db.getScoreColor(db.liveHeuristics.score) }}>{db.liveHeuristics.score}%</span>
                      </div>
                      <div style={{ width: "100%", height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                        <div style={{ height: "100%", background: db.getScoreColor(db.liveHeuristics.score), transition: "width 0.3s", width: `${db.liveHeuristics.score}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: db.aiAvailable ? (isDark ? "rgba(34, 197, 94, 0.1)" : "#f0fdf4") : (isDark ? "rgba(245, 158, 11, 0.1)" : "#fffbeb"), border: `1px solid ${db.aiAvailable ? (isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0") : (isDark ? "rgba(245, 158, 11, 0.3)" : "#fde68a")}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: db.aiAvailable ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: db.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                      {db.aiAvailable ? `${providerLabel} Active` : "Heuristic Mode"}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, color: db.aiAvailable ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#fbbf24" : "#b45309") }}>
                    {db.aiAvailable ? "LIVE" : "BASIC"}
                  </span>
                </div>
                <div style={{ padding: "8px 12px", background: "var(--input)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                  {db.aiAvailable
                    ? <>Templates will be <strong style={{ color: "var(--foreground)" }}>AI-generated</strong> using <strong style={{ color: "var(--foreground)" }}>{db.profile?.name}</strong>&apos;s profile for maximum personalization.</>
                    : <>Add a <strong style={{ color: "var(--foreground)" }}>GEMINI_API_KEY</strong> to <strong style={{ color: "var(--foreground)" }}>.env</strong> to unlock AI-powered outreach generation.</>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 3 · PROFILE EDITOR
        ══════════════════════════════════════════════════════════════════ */}
        {db.activeTab === "profile" && db.profile && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start", paddingBottom: 48 }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Resume upload */}
              <div style={{ ...card, position: "relative", overflow: "hidden" }}>
                {db.isUploadingResume && (
                  <div style={{ position: "absolute", inset: 0, background: "var(--card)", opacity: 0.96, backdropFilter: "blur(8px)", zIndex: 15, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, textAlign: "center" }}>
                    <Loader2 style={{ width: 28, height: 28, color: "var(--foreground)", animation: "spin 1s linear infinite" }} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Parsing Resume Index...</p>
                    <p style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted-foreground)", margin: 0 }}>{db.resumeUploadStep}</p>
                  </div>
                )}
                <h3 style={sectionTitle}>
                  <FileText style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                  Primary Candidate Resume
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
                  <div
                    onClick={db.handleTriggerFileInput}
                    style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--muted-foreground)"; e.currentTarget.style.background = "var(--input)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <input type="file" ref={db.fileInputRef} onChange={db.handleResumeFileSelected} accept=".pdf,.docx,.doc" style={{ display: "none" }} />
                    <UploadCloud style={{ width: 28, height: 28, color: "var(--muted-foreground)", opacity: 0.4 }} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", opacity: 0.8, margin: 0 }}>Upload New Resume</p>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: 0 }}>Supports PDF, DOCX up to 10MB</p>
                  </div>
                  <div style={{ padding: "10px 14px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <FileText style={{ width: 15, height: 15, color: db.profile.resumeFileName ? "#22c55e" : "var(--muted-foreground)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {db.profile.resumeFileName || "No active resume file"}
                      </span>
                    </div>
                    {db.profile.resumeFileName && <span style={{ fontSize: 9, color: "#22c55e", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>ACTIVE</span>}
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div style={card}>
                <h3 style={sectionTitle}>
                  <Users style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                  General Credentials
                </h3>
                <form style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
                  {[
                    { lbl: "Candidate Name",  val: db.profile.name,         key: "name",         type: "text" },
                    { lbl: "Expertise Role",  val: db.profile.role,         key: "role",         type: "text" },
                    { lbl: "Email Address",   val: db.profile.email,        key: "email",        type: "email" },
                    { lbl: "Portfolio URL",   val: db.profile.portfolioUrl, key: "portfolioUrl", type: "url" },
                    { lbl: "GitHub URL",      val: db.profile.githubUrl,    key: "githubUrl",    type: "url" },
                    { lbl: "LinkedIn",        val: db.profile.linkedinUrl,  key: "linkedinUrl",  type: "url" },
                  ].map(({ lbl, val, key, type }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={label}>{lbl}</label>
                      <input
                        type={type}
                        value={val}
                        onChange={e => db.setProfile({ ...db.profile!, [key]: e.target.value })}
                        style={input}
                        onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  ))}
                </form>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Skills */}
              <div style={card}>
                <h3 style={sectionTitle}>
                  <Award style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                  Technical Skills Index
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 14, background: "var(--input)", border: "1px solid var(--border)", borderRadius: 10, minHeight: 80 }}>
                    {db.profile.skills.map(skill => (
                      <span key={skill} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "var(--accent)", color: "var(--foreground)", fontWeight: 500, border: "1px solid var(--border)" }}>
                        {skill}
                        <button type="button" onClick={() => db.handleDeleteSkill(skill)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", opacity: 0.6, cursor: "pointer", padding: 0, display: "flex" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.opacity = "1"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.opacity = "0.6"; }}>
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <form onSubmit={db.handleAddSkill} style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={db.newSkillText}
                      onChange={e => db.setNewSkillText(e.target.value)}
                      placeholder="Add technical capability (e.g. Docker, Webpack)..."
                      style={{ ...input, flex: 1 }}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                    <button type="submit" disabled={!db.newSkillText.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: db.newSkillText.trim() ? "var(--primary)" : "var(--border)", color: db.newSkillText.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)", fontSize: 12, fontWeight: 600, cursor: db.newSkillText.trim() ? "pointer" : "not-allowed", transition: "opacity 0.2s" }} onMouseEnter={e => { if (db.newSkillText.trim()) e.currentTarget.style.opacity = "0.85"; }} onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                      Add Skill
                    </button>
                  </form>
                </div>
              </div>

              {/* Projects */}
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <Terminal style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                    Featured Projects
                  </h3>
                  <button onClick={db.handleAddBlankProject} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--input)", color: "var(--muted-foreground)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"} onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}>
                    <Plus style={{ width: 11, height: 11 }} /> Add Project
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
                  {db.profile.projects.map((proj, idx) => (
                    <div key={idx} style={{ padding: 16, background: "var(--input)", border: "1px solid var(--border)", borderRadius: 10, position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
                      <button onClick={() => db.handleDeleteProject(idx)} style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", color: "var(--muted-foreground)", opacity: 0.6, cursor: "pointer", padding: 4 }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.opacity = "0.6"; }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Project Name</label>
                          <input type="text" value={proj.name} onChange={e => db.handleProjectDetailChange(idx, "name", e.target.value)} style={input} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Tech Stack</label>
                          <input type="text" value={proj.tech.join(", ")} onChange={e => db.handleProjectDetailChange(idx, "tech", e.target.value)} style={input} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Description</label>
                        <textarea rows={2} value={proj.description} onChange={e => db.handleProjectDetailChange(idx, "description", e.target.value)} style={{ ...input, resize: "none" }} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div style={card}>
                <h3 style={sectionTitle}>
                  <GraduationCap style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                  Education History
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
                  {db.profile.education.map((edu, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {(["degree", "school", "year"] as const).map(field => (
                        <div key={field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>{field === "school" ? "Institution" : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                          <input type="text" value={edu[field]} onChange={e => db.handleEducationChange(idx, field, e.target.value)} style={input} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ─── Drawer · JOB DETAILS & TEMPLATES ─── */}
      {db.selectedJob && (
        <Drawer open={db.isDrawerOpen} onOpenChange={db.setIsDrawerOpen}>
          <DrawerContent style={{ background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
            <DrawerHeader style={{ borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: db.getScoreBg(db.selectedJob.matchScore), color: db.getScoreColor(db.selectedJob.matchScore), border: `1px solid ${db.getScoreColor(db.selectedJob.matchScore)}22`, fontWeight: 600 }}>
                  {db.selectedJob.matchScore}% Fit
                </span>
                <span style={{ ...db.getStatusStyle(db.selectedJob.status), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  {db.selectedJob.status}
                </span>
              </div>
              <DrawerTitle style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginTop: 12 }}>
                {db.selectedJob.role}
              </DrawerTitle>
              <DrawerDescription style={{ color: "var(--muted-foreground)" }}>
                Company: <strong style={{ color: "var(--foreground)" }}>{db.selectedJob.company}</strong>
                {db.selectedJob.contactName && ` • Recruiter: ${db.selectedJob.contactName}`}
                {db.selectedJob.contactEmail && ` • Email: ${db.selectedJob.contactEmail}`}
              </DrawerDescription>

              {/* Drawer tab switcher */}
              <div style={{ display: "flex", gap: 6, marginTop: 20, padding: 4, borderRadius: 10, background: "var(--input)", border: "1px solid var(--border)", width: 240 }}>
                {(["templates", "details"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => db.setDrawerActiveTab(t)}
                    style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", background: db.drawerActiveTab === t ? "var(--primary)" : "transparent", color: db.drawerActiveTab === t ? "var(--primary-foreground)" : "var(--muted-foreground)", transition: "all 0.2s" }}
                  >
                    {t === "templates" ? "AI Templates" : "Job Details"}
                  </button>
                ))}
              </div>
            </DrawerHeader>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 0", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Templates tab */}
              {db.drawerActiveTab === "templates" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                  <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                    {[
                      { key: "coldEmail",   label: "✉️ Cold Email" },
                      { key: "proposal",    label: "💼 Freelance" },
                      { key: "linkedin",    label: "🔗 LinkedIn" },
                      { key: "coverLetter", label: "📄 Cover Letter" },
                    ].map(t => (
                      <button
                        key={t.key}
                        onClick={() => db.setTemplateActiveTab(t.key as typeof db.templateActiveTab)}
                        style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "none", border: "none", borderBottom: db.templateActiveTab === t.key ? "2px solid var(--foreground)" : "2px solid transparent", color: db.templateActiveTab === t.key ? "var(--foreground)" : "var(--muted-foreground)", paddingBottom: 10 }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {db.selectedJob.generatedTemplates?.[db.templateActiveTab] ? (
                    <div style={{ flex: 1, minHeight: 320, background: "var(--input)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <pre style={{ fontSize: 13, color: "var(--foreground)", fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 380, overflowY: "auto", margin: 0 }}>
                        {db.selectedJob.generatedTemplates[db.templateActiveTab]}
                      </pre>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid var(--border)", marginTop: 14 }}>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, fontFamily: "monospace" }}>Ready for outreach</span>
                        <button
                          onClick={() => db.handleCopyToClipboard(db.selectedJob!.generatedTemplates?.[db.templateActiveTab] || "", db.templateActiveTab)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: db.copiedStates[db.templateActiveTab] ? (isDark ? "rgba(34, 197, 94, 0.1)" : "#f0fdf4") : "var(--primary)", color: db.copiedStates[db.templateActiveTab] ? (isDark ? "#4ade80" : "#16a34a") : "var(--primary-foreground)", border: db.copiedStates[db.templateActiveTab] ? `1px solid ${isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0"}` : "none" }}
                        >
                          {db.copiedStates[db.templateActiveTab] ? <><Check style={{ width: 14, height: 14 }} /><span>Copied!</span></> : <><Copy style={{ width: 14, height: 14 }} /><span>Copy Template</span></>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 12, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minHeight: 300, justifyContent: "center" }}>
                      <Sparkles style={{ width: 28, height: 28, color: "var(--border)" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", margin: 0 }}>Template Not Found</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.8, margin: 0 }}>This template is missing. Tap regenerate to rebuild outreach scripts.</p>
                      <button
                        onClick={async () => {
                          try {
                            const result = await analyzeAndGenerateAction(db.selectedJob!.originalText, userEmail);
                            if (result.success && result.result) {
                              const updated = { ...db.selectedJob!, generatedTemplates: result.result.generatedTemplates };
                              db.setSelectedJob(updated);
                              await updateJobPostAction(updated);
                            }
                          } catch (err) { console.error("Regeneration failed:", err); }
                        }}
                        style={{ padding: "8px 18px", borderRadius: 8, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}
                      >
                        Regenerate All
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Details tab */}
              {db.drawerActiveTab === "details" && (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <span style={{ ...label, marginBottom: 6, display: "block" }}>Original Posting Text</span>
                      <div style={{ background: "var(--input)", border: "1px solid var(--border)", padding: 16, borderRadius: 10, maxHeight: 300, overflowY: "auto" }}>
                        <pre style={{ fontSize: 12, color: "var(--foreground)", opacity: 0.8, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{db.selectedJob.originalText}</pre>
                      </div>
                    </div>
                    <div>
                      <span style={{ ...label, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Edit3 style={{ width: 12, height: 12 }} /> Workspace Notes
                      </span>
                      <textarea
                        rows={4}
                        value={db.notesText}
                        onChange={e => db.setNotesText(e.target.value)}
                        placeholder="Write tags, salary ranges, or follow-up strategies..."
                        style={{ ...input, resize: "none" }}
                        onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <button onClick={db.handleSaveNotes} style={{ padding: "6px 14px", borderRadius: 7, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Save Notes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "var(--input)", border: "1px solid var(--border)", padding: 16, borderRadius: 10, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <span style={label}>Match Strategy</span>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Heuristics identified key tags in the candidacy index.</p>
                    </div>
                    <div>
                      <span style={label}>Extracted Tech Tags</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {db.selectedJob.tags.map((tag, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <span style={label}>Outreach State</span>
                      <select
                        value={db.selectedJob.status}
                        onChange={e => db.handleStatusChange(e.target.value as any)}
                        style={{ ...input, marginTop: 6, cursor: "pointer" }}
                      >
                        {["Draft", "Generated", "Sent", "Interviewing", "Declined"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                      <button
                        onClick={() => db.handleDeleteJob(db.selectedJob!.id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                        <span>Delete Scan File</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DrawerFooter style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => db.setIsDrawerOpen(false)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
              >
                Close Panel
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
