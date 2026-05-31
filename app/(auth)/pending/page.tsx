"use client";

import React from "react";
import {
  Sparkles, Mail, CheckCircle2, Compass, Award, Zap, LogOut, Clock, Sun, Moon,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../components/theme-provider";

export default function PendingPage() {
  const { userEmail, userName, isReady, logout } = useAuth({ requiredStatus: "PENDING" });
  const { theme, toggleTheme } = useTheme();

  if (!isReady) return null;

  const displayName = userName?.split(" ")[0] || userEmail?.split("@")[0] || "there";

  return (
    <>
      <style>{`
        @keyframes pp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          padding: "40px 16px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        <div style={{ width: "100%", maxWidth: 660, borderRadius: 16, overflow: "hidden", background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex" }}>

            {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
            <div style={{ width: 200, padding: "32px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--border)", background: "var(--input)" }}>
              <div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <Sparkles style={{ width: 17, height: 17, color: "var(--primary-foreground)" }} />
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Prop<span style={{ color: "var(--muted-foreground)" }}>AI</span>
                </h2>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "var(--muted-foreground)", opacity: 0.7, fontWeight: 600, marginTop: 2 }}>Outreach Platform</p>

                <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: Compass, label: "Tailored proposals" },
                    { icon: Award,   label: "Skill-matched scoring" },
                    { icon: Mail,    label: "Cold email generator" },
                    { icon: Zap,     label: "AI-powered templates" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon style={{ width: 12, height: 12, color: "var(--muted-foreground)", opacity: 0.5, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
                {/* Theme toggle in sidebar */}
                <button
                  onClick={toggleTheme}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "var(--muted-foreground)",
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "color 0.2s",
                    textAlign: "left",
                    padding: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
                >
                  {theme === "light" ? (
                    <Moon style={{ width: 13, height: 13 }} />
                  ) : (
                    <Sun style={{ width: 13, height: 13 }} />
                  )}
                  <span>Theme: {theme === "light" ? "Dark" : "Light"}</span>
                </button>

                <button
                  onClick={logout}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer", transition: "color 0.2s", padding: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
                >
                  <LogOut style={{ width: 13, height: 13 }} />
                  Sign Out
                </button>
              </div>
            </div>

            {/* ── RIGHT CONTENT ──────────────────────────────────── */}
            <div style={{ flex: 1, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Status badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 14px",
                  borderRadius: 50,
                  background: theme === "dark" ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
                  border: theme === "dark" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid #fde68a",
                  color: theme === "dark" ? "#fbbf24" : "#b45309",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme === "dark" ? "#f59e0b" : "#f59e0b", display: "inline-block", animation: "pp-pulse 2s infinite" }} />
                Account Under Review
              </div>

              {/* Greeting */}
              <div>
                <h1 style={{ fontSize: 21, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.3, marginBottom: 2 }}>Hey {displayName},</h1>
                <h2 style={{ fontSize: 21, fontWeight: 800, color: "var(--muted-foreground)", lineHeight: 1.3, margin: 0 }}>your account is under review.</h2>
              </div>

              {/* Message */}
              <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.75 }}>
                We received your request and are currently setting up your workspace. This typically takes{" "}
                <strong style={{ color: "var(--foreground)" }}>1–2 hours</strong>. Once ready, we will email{" "}
                <strong style={{ color: "var(--foreground)" }}>{userEmail}</strong> with a confirmation link.
              </div>

              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "var(--muted-foreground)", opacity: 0.6, fontWeight: 700, marginBottom: 2 }}>Setup Progress</p>
                {[
                  { icon: CheckCircle2, label: "Registration received",    done: true,  running: false },
                  { icon: Clock,        label: "Workspace configuration",  done: false, running: true  },
                  { icon: Mail,         label: "Confirmation email",       done: false, running: false },
                ].map(({ icon: Icon, label, done, running }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: done
                        ? (theme === "dark" ? "rgba(34, 197, 94, 0.08)" : "#f8fdf8")
                        : running ? "var(--input)" : "var(--input)",
                      border: done
                        ? `1px solid ${theme === "dark" ? "rgba(34, 197, 94, 0.25)" : "#d1fae5"}`
                        : `1px solid var(--border)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon style={{ width: 14, height: 14, color: done ? "#22c55e" : running ? "var(--foreground)" : "var(--muted-foreground)", opacity: done ? 1 : 0.6, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: done ? (theme === "dark" ? "#4ade80" : "#16a34a") : running ? "var(--foreground)" : "var(--muted-foreground)" }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: done ? (theme === "dark" ? "#4ade80" : "#16a34a") : running ? "var(--foreground)" : "var(--muted-foreground)", opacity: done ? 1 : 0.6 }}>
                      {done ? "Done" : running ? "In progress" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Email tip */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: theme === "dark" ? "rgba(14, 165, 233, 0.15)" : "#f0f9ff",
                  border: theme === "dark" ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Mail style={{ width: 14, height: 14, color: theme === "dark" ? "#38bdf8" : "#0369a1", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: theme === "dark" ? "#38bdf8" : "#0369a1", margin: 0, lineHeight: 1.6 }}>
                  Check your spam folder if you don&apos;t see the confirmation email. Add{" "}
                  <strong>{process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@propai.com"}</strong>{" "}
                  to your contacts to ensure delivery.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
