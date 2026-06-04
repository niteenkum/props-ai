"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase, Sparkles, Mail, Calendar, Plus, Search, ChevronRight,
  TrendingUp, Users, Check, Copy, Trash2, BookOpen, Edit3, Loader2, AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../hooks/useDashboard";
import { useTheme } from "../components/theme-provider";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "../components/ui/drawer";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "./styles";

// ─── Suspense wrapper (required by useSearchParams) ───────────────────────────
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <OverviewContent />
    </Suspense>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function OverviewContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pendingJobId = searchParams.get("job") ?? undefined;

  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const db                     = useDashboard(userEmail, pendingJobId);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  if (!isReady) return null;

  return (
    <>
      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Outreach Workspace
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            Organize outreach, manage parsed channels, and customize templates.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/new")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "var(--primary)", color: "var(--primary-foreground)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "var(--card-shadow)",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          <span>New Job Scan</span>
        </button>
      </header>

      {/* ── Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { icon: Briefcase,  label: "Total Scans",    value: db.stats.total },
          { icon: TrendingUp, label: "Avg Match",      value: `${db.stats.avgMatch}%` },
          { icon: Users,      label: "Active Apps",    value: db.stats.active },
          { icon: Sparkles,   label: "Outreach Ready", value: db.stats.generated },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: "var(--accent)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: 20, height: 20, color: "var(--foreground)" }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: 0 }}>{label}</p>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: "4px 0 0" }}>{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", background: "var(--card)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
        <div style={{ position: "relative", width: 320 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
          <input
            type="text"
            value={db.searchQuery}
            onChange={e => db.setSearchQuery(e.target.value)}
            placeholder="Search role, company, skills..."
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--input)", border: "1px solid var(--border)" }}>
          {["All", "Draft", "Generated", "Sent", "Interviewing"].map(s => (
            <button
              key={s}
              onClick={() => db.setStatusFilter(s.toLowerCase())}
              style={{
                padding: "6px 14px", borderRadius: 7, border: "none",
                background: db.statusFilter === s.toLowerCase() ? "var(--primary)" : "transparent",
                color: db.statusFilter === s.toLowerCase() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Job List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {db.filteredJobs.length === 0 ? (
          <div style={{ ...cardStyle, padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderStyle: "dashed" }}>
            <Briefcase style={{ width: 36, height: 36, color: "var(--border)", marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)" }}>No job postings match your filters.</p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.7, marginTop: 4 }}>Try expanding your search or paste a new post.</p>
          </div>
        ) : db.filteredJobs.map(job => (
          <div
            key={job.id}
            onClick={() => db.openJobDrawer(job)}
            style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
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

      {/* ── Drawer ── */}
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
                    style={{
                      flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: 7,
                      border: "none", cursor: "pointer",
                      background: db.drawerActiveTab === t ? "var(--primary)" : "transparent",
                      color: db.drawerActiveTab === t ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}
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
                {/* Template tabs — dynamic based on what was actually generated */}
                {(() => {
                  const PLATFORM_META: Record<string, { label: string; icon: string }> = {
                    coldEmail:   { label: "Cold Email",         icon: "✉️" },
                    proposal:    { label: "Upwork Proposal",    icon: "🔵" },
                    linkedin:    { label: "LinkedIn Message",   icon: "🔗" },
                    coverLetter: { label: "Cover Letter",       icon: "📄" },
                    whatsapp:    { label: "WhatsApp Message",   icon: "💬" },
                    freelancer:  { label: "Freelancer Bid",     icon: "⚡" },
                  };
                  const templates = db.selectedJob.generatedTemplates || {};
                  const availableTabs = Object.entries(templates)
                    .filter(([, v]) => v && !v.startsWith("[Generation failed"))
                    .map(([key]) => ({
                      key,
                      label: PLATFORM_META[key]?.label || key,
                      icon:  PLATFORM_META[key]?.icon  || "📄",
                    }));
                  return (
                    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 8, flexWrap: "wrap" }}>
                      {availableTabs.map(t => (
                        <button
                          key={t.key}
                          onClick={() => db.setTemplateActiveTab(t.key as typeof db.templateActiveTab)}
                          style={{
                            padding: "8px 14px 10px", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", background: "none", border: "none",
                            borderBottom: db.templateActiveTab === t.key ? "2px solid var(--foreground)" : "2px solid transparent",
                            color: db.templateActiveTab === t.key ? "var(--foreground)" : "var(--muted-foreground)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                      {availableTabs.length === 0 && (
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>
                          No templates generated yet
                        </span>
                      )}
                    </div>
                  );
                })()}

                  {db.selectedJob.generatedTemplates?.[db.templateActiveTab] ? (
                    <div style={{ flex: 1, minHeight: 320, background: "var(--input)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <pre style={{ fontSize: 13, color: "var(--foreground)", fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 380, overflowY: "auto", margin: 0 }}>
                        {db.selectedJob.generatedTemplates[db.templateActiveTab]}
                      </pre>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid var(--border)", marginTop: 14 }}>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, fontFamily: "monospace" }}>Ready for outreach</span>
                        <button
                          onClick={() => db.handleCopyToClipboard(db.selectedJob!.generatedTemplates?.[db.templateActiveTab] || "", db.templateActiveTab)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                            background: db.copiedStates[db.templateActiveTab] ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : "var(--primary)",
                            color: db.copiedStates[db.templateActiveTab] ? (isDark ? "#4ade80" : "#16a34a") : "var(--primary-foreground)",
                            border: db.copiedStates[db.templateActiveTab] ? `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}` : "none",
                          }}
                        >
                          {db.copiedStates[db.templateActiveTab]
                            ? <><Check style={{ width: 14, height: 14 }} /><span>Copied!</span></>
                            : <><Copy  style={{ width: 14, height: 14 }} /><span>Copy Template</span></>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 12, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minHeight: 300, justifyContent: "center" }}>
                      <Sparkles style={{ width: 28, height: 28, color: "var(--border)" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", margin: 0 }}>Template Not Found</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.8, margin: 0 }}>This template is missing. Tap regenerate to rebuild outreach scripts.</p>
                      <button
                        onClick={db.handleRegenerateJob}
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
                      <span style={{ ...labelStyle, marginBottom: 6, display: "block" }}>Original Posting Text</span>
                      <div style={{ background: "var(--input)", border: "1px solid var(--border)", padding: 16, borderRadius: 10, maxHeight: 300, overflowY: "auto" }}>
                        <pre style={{ fontSize: 12, color: "var(--foreground)", opacity: 0.8, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{db.selectedJob.originalText}</pre>
                      </div>
                    </div>
                    <div>
                      <span style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Edit3 style={{ width: 12, height: 12 }} /> Workspace Notes
                      </span>
                      <textarea
                        rows={4}
                        value={db.notesText}
                        onChange={e => db.setNotesText(e.target.value)}
                        placeholder="Write tags, salary ranges, or follow-up strategies..."
                        style={{ ...inputStyle, resize: "none" }}
                        onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = "var(--border)"; }}
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
                      <span style={labelStyle}>Extracted Tech Tags</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {db.selectedJob.tags.map((tag, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <span style={labelStyle}>Outreach State</span>
                      <select
                        value={db.selectedJob.status}
                        onChange={e => db.handleStatusChange(e.target.value as any)}
                        style={{ ...inputStyle, marginTop: 6, cursor: "pointer" }}
                      >
                        {["Draft", "Generated", "Sent", "Interviewing", "Declined"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                      <button
                        onClick={() => db.handleDeleteJob(db.selectedJob!.id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.1)" : "#fef2f2"; }}
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
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
              >
                Close Panel
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
