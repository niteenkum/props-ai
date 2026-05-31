"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Eye, EyeOff, Lock, Mail, Loader2, User, Briefcase, Globe,
  ArrowRight, ArrowLeft, Search, X, ChevronDown, ShieldCheck, RotateCcw, Check, Sun, Moon,
} from "lucide-react";
import { useSignupForm } from "../../hooks/useSignupForm";
import { useTheme } from "../../components/theme-provider";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const catColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Frontend:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" },
  Backend:   { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" },
  Mobile:    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  Database:  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  DevOps:    { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", dot: "#0ea5e9" },
  "AI/ML":   { bg: "#fef3c7", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
  Design:    { bg: "#fdf2f8", border: "#fbcfe8", text: "#9d174d", dot: "#ec4899" },
  Testing:   { bg: "#f7fee7", border: "#d9f99d", text: "#3f6212", dot: "#84cc16" },
  General:   { bg: "#f5f5f5", border: "#e0e0e0", text: "#555",    dot: "#999"    },
};

const getCatColor = (category: string, isDark: boolean) => {
  const defaults = catColors[category] || catColors.General;
  if (!isDark) return defaults;
  
  const darkVariants: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    Frontend:  { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa", dot: "#3b82f6" },
    Backend:   { bg: "rgba(34, 197, 94, 0.15)",  border: "rgba(34, 197, 94, 0.3)",  text: "#4ade80", dot: "#22c55e" },
    Mobile:    { bg: "rgba(249, 115, 22, 0.15)",  border: "rgba(249, 115, 22, 0.3)",  text: "#fb923c", dot: "#f97316" },
    Database:  { bg: "rgba(168, 85, 247, 0.15)",  border: "rgba(168, 85, 247, 0.3)",  text: "#c084fc", dot: "#a855f7" },
    DevOps:    { bg: "rgba(14, 165, 233, 0.15)",  border: "rgba(14, 165, 233, 0.3)",  text: "#38bdf8", dot: "#0ea5e9" },
    "AI/ML":   { bg: "rgba(245, 158, 11, 0.15)",  border: "rgba(245, 158, 11, 0.3)",  text: "#fbbf24", dot: "#f59e0b" },
    Design:    { bg: "rgba(236, 72, 153, 0.15)",  border: "rgba(236, 72, 153, 0.3)",  text: "#f472b6", dot: "#ec4899" },
    Testing:   { bg: "rgba(132, 204, 22, 0.15)",  border: "rgba(132, 204, 22, 0.3)",  text: "#a3e635", dot: "#84cc16" },
    General:   { bg: "rgba(255, 255, 255, 0.05)", border: "rgba(255, 255, 255, 0.1)", text: "#ccc",    dot: "#999"    },
  };
  return darkVariants[category] || darkVariants.General;
};

export default function SignupPage() {
  const router = useRouter();
  const f = useSignupForm();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const isOtp = f.step === "otp";

  return (
    <>
      <style>{`
        .sp-page {
          min-height: 100vh; display: flex; align-items: flex-start; justify-content: center;
          background: var(--background); padding: 48px 16px 32px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          transition: background 0.3s ease, color 0.3s ease;
        }
        @media (min-width: 640px) { .sp-page { align-items: center; padding: 40px 24px; } }
        .sp-back {
          position: fixed; top: 20px; left: 20px; display: flex; align-items: center; gap: 5px;
          color: var(--muted-foreground); font-size: 13px; font-weight: 500; background: none; border: none;
          cursor: pointer; z-index: 50; transition: color 0.2s;
        }
        .sp-back:hover { color: var(--foreground); }
        .sp-card {
          width: 100%; background: var(--card); border-radius: 20px;
          border: 1px solid var(--border); box-shadow: var(--card-shadow);
          padding: 32px 24px; max-width: 440px; transition: all 0.3s ease;
        }
        @media (min-width: 640px) { .sp-card { padding: 36px 32px; } }
        .sp-card.wide { max-width: 440px; }
        @media (min-width: 768px) { .sp-card.wide { max-width: 720px; } }
        .sp-brand { text-align: center; margin-bottom: 24px; }
        .sp-logo {
          width: 44px; height: 44px; border-radius: 12px; background: var(--primary);
          display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;
        }
        .sp-brand h1 { font-size: 22px; font-weight: 700; color: var(--foreground); margin: 0; }
        .sp-brand p  { font-size: 13px; color: var(--muted-foreground); margin: 4px 0 0; }
        .sp-error {
          margin-bottom: 16px; padding: 10px 14px; border-radius: 10px;
          background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
          font-size: 12px; text-align: center; font-weight: 500;
        }
        .sp-field { display: flex; flex-direction: column; gap: 5px; }
        .sp-field label { font-size: 12px; font-weight: 600; color: var(--muted-foreground); }
        .sp-fw { position: relative; }
        .sp-fi {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; color: var(--muted-foreground); opacity: 0.6; pointer-events: none;
        }
        .sp-input {
          width: 100%; box-sizing: border-box; padding: 12px 12px 12px 38px;
          border-radius: 10px; border: 1.5px solid var(--border); background: var(--input);
          color: var(--foreground); font-size: 14px; outline: none; transition: all 0.2s;
          font-family: inherit; -webkit-appearance: none;
        }
        .sp-input:focus { border-color: var(--foreground); background: var(--card); box-shadow: 0 0 0 3px var(--border); }
        .sp-input::placeholder { color: var(--muted-foreground); opacity: 0.5; }
        .sp-input.pr { padding-right: 40px; }
        .sp-pwtoggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--muted-foreground); opacity: 0.6; padding: 4px; display: flex;
        }
        .sp-pwtoggle:hover { opacity: 1; color: var(--foreground); }
        .sp-btn {
          width: 100%; padding: 13px 0; border-radius: 11px; border: none;
          background: var(--primary); color: var(--primary-foreground); font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 7px; transition: all 0.2s; font-family: inherit; -webkit-appearance: none;
        }
        .sp-btn:hover:not(:disabled) { opacity: 0.85; }
        .sp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sp-cols {
          display: flex; flex-direction: column; gap: 14px;
        }
        @media (min-width: 640px) { .sp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; } }
        .sp-col { display: flex; flex-direction: column; gap: 14px; }
        /* Skills */
        .sp-skills-trigger {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--border);
          background: var(--input); cursor: pointer; transition: all 0.2s; user-select: none;
        }
        .sp-skills-trigger:hover { border-color: var(--muted-foreground); background: var(--accent); }
        .sp-skills-trigger.open { border-color: var(--foreground); background: var(--card); box-shadow: 0 0 0 3px var(--border); }
        .sp-chip {
          display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px;
          border-radius: 8px; font-size: 12px; font-weight: 500; border: 1.5px solid;
        }
        /* OTP */
        .sp-otp-grid { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
        @media (min-width: 400px) { .sp-otp-grid { gap: 10px; } }
        .sp-otp-box {
          width: 44px; height: 54px; text-align: center; font-size: 22px; font-weight: 800;
          border-radius: 12px; border: 2px solid var(--border); background: var(--input);
          color: var(--foreground); outline: none; transition: all 0.15s; -webkit-appearance: none;
          font-family: inherit;
        }
        .sp-otp-box:focus { border-color: var(--foreground); background: var(--card); box-shadow: 0 0 0 3px var(--border); }
        @media (min-width: 400px) { .sp-otp-box { width: 52px; height: 60px; font-size: 24px; } }
        .sp-switch { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted-foreground); }
        .sp-switch button {
          background: none; border: none; color: var(--foreground); font-weight: 700;
          cursor: pointer; font-size: 13px; text-decoration: underline; text-underline-offset: 3px;
        }
        @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sp-spin { animation: sp-spin 0.8s linear infinite; }
      `}</style>

      <div className="sp-page">
        <button onClick={() => router.push("/")} className="sp-back">
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back
        </button>

        {/* Floating Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 50,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon style={{ width: 16, height: 16 }} />
          ) : (
            <Sun style={{ width: 16, height: 16 }} />
          )}
        </button>

        <div className={`sp-card ${!isOtp ? "wide" : ""}`}>
          {/* Brand */}
          <div className="sp-brand">
            <div className="sp-logo">
              <Sparkles style={{ width: 20, height: 20, color: "var(--primary-foreground)" }} />
            </div>
            <h1>Prop<span style={{ color: "var(--muted-foreground)" }}>AI</span></h1>
            <p>{isOtp ? "Check your inbox" : "Create your account"}</p>
          </div>

          {/* Error */}
          {f.error && <div className="sp-error">{f.error}</div>}

          {/* ── SIGNUP FORM ─────────────────────────────────────────────────── */}
          {!isOtp && (
            <form onSubmit={f.handleFormSubmit}>
              <div className="sp-cols">
                {/* Col 1 */}
                <div className="sp-col">
                  <div className="sp-field">
                    <label>Full Name</label>
                    <div className="sp-fw">
                      <User className="sp-fi" />
                      <input className="sp-input" type="text" required value={f.name}
                        onChange={e => f.setName(e.target.value)} placeholder="Your full name" />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label>Email Address</label>
                    <div className="sp-fw">
                      <Mail className="sp-fi" />
                      <input className="sp-input" type="email" required value={f.email}
                        onChange={e => f.setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label>Password</label>
                    <div className="sp-fw">
                      <Lock className="sp-fi" />
                      <input className="sp-input pr" type={f.showPassword ? "text" : "password"} required
                        value={f.password} onChange={e => f.setPassword(e.target.value)} placeholder="Min. 6 characters" />
                      <button type="button" className="sp-pwtoggle" onClick={() => f.setShowPassword(!f.showPassword)}>
                        {f.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                  </div>
                  <div className="sp-field">
                    <label>Professional Role</label>
                    <div className="sp-fw">
                      <Briefcase className="sp-fi" />
                      <input className="sp-input" type="text" value={f.role}
                        onChange={e => f.setRole(e.target.value)} placeholder="e.g. Frontend Developer" />
                    </div>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="sp-col">
                  <div className="sp-field">
                    <label>GitHub URL</label>
                    <div className="sp-fw">
                      <GithubIcon className="sp-fi" />
                      <input className="sp-input" type="url" value={f.githubUrl}
                        onChange={e => f.setGithubUrl(e.target.value)} placeholder="https://github.com/username" />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label>LinkedIn URL</label>
                    <div className="sp-fw">
                      <LinkedinIcon className="sp-fi" />
                      <input className="sp-input" type="url" value={f.linkedinUrl}
                        onChange={e => f.setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/user" />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label>Portfolio URL</label>
                    <div className="sp-fw">
                      <Globe className="sp-fi" />
                      <input className="sp-input" type="url" value={f.portfolioUrl}
                        onChange={e => f.setPortfolioUrl(e.target.value)} placeholder="https://yoursite.com" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Skills Picker ─────────────────────────────────────────── */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Your IT Skills</span>
                  {f.selectedIds.size > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 500, background: "var(--input)", color: "var(--muted-foreground)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 20 }}>
                      {f.selectedIds.size} selected
                    </span>
                  )}
                </div>

                {/* Selected chips */}
                {f.selectedSkills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {f.selectedSkills.map(s => {
                      const c = getCatColor(s.category, isDark);
                      return (
                        <span key={s.id} className="sp-chip" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
                          {s.name}
                          <button type="button" onClick={() => f.toggleSkill(s.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: c.text, opacity: 0.5 }}>
                            <X style={{ width: 11, height: 11 }} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown trigger */}
                <div ref={f.triggerRef} style={{ position: "relative" }}>
                  <div
                    className={`sp-skills-trigger ${f.showDropdown ? "open" : ""}`}
                    onClick={() => f.showDropdown ? f.setShowDropdown(false) : f.openDropdown()}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Search style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.8 }}>
                        {f.skillsLoading ? "Loading skills..." : f.selectedIds.size > 0 ? "Add more skills..." : "Search and select your skills..."}
                      </span>
                    </div>
                    <ChevronDown style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6, flexShrink: 0, transition: "transform 0.2s", transform: f.showDropdown ? "rotate(180deg)" : "none" }} />
                  </div>

                  {f.showDropdown && f.triggerRect && (
                    <>
                      {/* Backdrop */}
                      <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "transparent" }} onClick={() => f.setShowDropdown(false)} />
                      {/* Dropdown */}
                      <div
                        ref={f.dropdownRef}
                        style={{
                          position: "fixed", zIndex: 200,
                          width: f.triggerRect.width, left: f.triggerRect.left,
                          ...(f.dropUp ? { bottom: window.innerHeight - f.triggerRect.top + 6 } : { top: f.triggerRect.bottom + 6 }),
                          background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14,
                          boxShadow: "var(--card-shadow)",
                          display: "flex", flexDirection: "column", maxHeight: 340, overflow: "hidden",
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Search */}
                        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ position: "relative" }}>
                            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.6 }} />
                            <input
                              autoFocus type="text"
                              value={f.skillSearch} onChange={e => f.setSkillSearch(e.target.value)}
                              placeholder="Search skills..."
                              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: 9, fontSize: 13, outline: "none", background: "var(--input)", color: "var(--foreground)", fontFamily: "inherit" }}
                              onFocus={e => { e.target.style.borderColor = "var(--foreground)"; e.target.style.background = "var(--card)"; }}
                              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--input)"; }}
                            />
                          </div>
                        </div>

                        {/* Category pills */}
                        <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--border)", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
                          {[null, ...f.categories].map(cat => {
                            const active = f.activeCategory === cat;
                            return (
                              <button key={cat ?? "all"} type="button" onClick={() => f.setActiveCategory(cat)}
                                style={{ flexShrink: 0, padding: "4px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${active ? "var(--foreground)" : "var(--border)"}`, background: active ? "var(--foreground)" : "var(--card)", color: active ? "var(--card)" : "var(--muted-foreground)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                                {cat ?? "All"}
                              </button>
                            );
                          })}
                        </div>

                        {/* Skills list */}
                        <div style={{ overflowY: "auto", flex: 1, padding: 6 }}>
                          {f.filteredSkills.length === 0 && (
                            <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, padding: 20, margin: 0 }}>
                              {f.skillSearch ? `No results for "${f.skillSearch}"` : "All skills selected!"}
                            </p>
                          )}
                          {f.filteredSkills.map(skill => {
                            const c = getCatColor(skill.category, isDark);
                            return (
                              <button key={skill.id} type="button" onClick={() => f.toggleSkill(skill.id)}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />
                                  <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>{skill.name}</span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.3px", flexShrink: 0, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                                  {skill.category}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className="sp-btn" disabled={f.loading} style={{ marginTop: 22 }}>
                {f.loading
                  ? <><Loader2 className="sp-spin" style={{ width: 15, height: 15 }} /><span>Sending code...</span></>
                  : <><span>Continue — Verify Email</span><ArrowRight style={{ width: 15, height: 15 }} /></>}
              </button>

              <div className="sp-switch">
                Already have an account?{" "}
                <button type="button" onClick={() => router.push("/login")}>Sign In</button>
              </div>
            </form>
          )}

          {/* ── OTP VERIFICATION ────────────────────────────────────────────── */}
          {isOtp && (
            <form onSubmit={f.handleOtpSubmit}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--input)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <ShieldCheck style={{ width: 28, height: 28, color: "var(--foreground)" }} />
                </div>
                <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>
                  We emailed a 6-digit code to
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: "2px 0 0" }}>{f.email}</p>
              </div>

              <div className="sp-otp-grid">
                {f.otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { f.otpRefs.current[idx] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit} className="sp-otp-box"
                    onChange={e => f.handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => { if (e.key === "Backspace" && !f.otp[idx] && idx > 0) f.otpRefs.current[idx - 1]?.focus(); }}
                    onPaste={idx === 0 ? f.handleOtpPaste : undefined}
                    style={{ borderColor: digit ? "var(--foreground)" : undefined, background: digit ? "var(--input)" : undefined }}
                  />
                ))}
              </div>

              <button type="submit" className="sp-btn" disabled={f.otpLoading || f.otp.join("").length < 6}>
                {f.otpLoading
                  ? <><Loader2 className="sp-spin" style={{ width: 15, height: 15 }} /><span>Verifying...</span></>
                  : <><Check style={{ width: 16, height: 16 }} /><span>Verify & Create Account</span></>}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                <button type="button"
                  onClick={() => { f.setStep("form"); f.setError(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  <ArrowLeft style={{ width: 13, height: 13 }} /> Edit details
                </button>
                <button type="button" onClick={f.handleResend} disabled={f.resendCooldown > 0}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: f.resendCooldown > 0 ? "var(--border)" : "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: f.resendCooldown > 0 ? "not-allowed" : "pointer", textDecoration: f.resendCooldown > 0 ? "none" : "underline", textUnderlineOffset: 3 }}>
                  <RotateCcw style={{ width: 12, height: 12 }} />
                  {f.resendCooldown > 0 ? `Resend in ${f.resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
