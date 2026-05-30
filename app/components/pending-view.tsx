"use client";

import React from "react";
import {
  Sparkles,
  Mail,
  CheckCircle2,
  Compass,
  Award,
  Zap,
  LogOut,
  Clock,
} from "lucide-react";

interface PendingViewProps {
  userEmail: string;
  userName: string;
  onApproved: () => void;
  onLogout: () => void;
}

export default function PendingView({ userEmail, userName, onLogout }: PendingViewProps) {
  const displayName = userName?.split(" ")[0] || userEmail?.split("@")[0] || "there";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 660, borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid #e8e8e8", boxShadow: "0 12px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex" }}>

          {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
          <div style={{ width: 200, padding: "32px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid #f0f0f0", background: "#fafafa" }}>
            <div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Sparkles style={{ width: 17, height: 17, color: "#fff" }} />
              </div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>Prop<span style={{ color: "#888" }}>AI</span></h1>
              <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#ccc", fontWeight: 600, marginTop: 2 }}>Outreach Platform</p>

              <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { icon: Compass, label: "Tailored proposals" },
                  { icon: Award, label: "Skill-matched scoring" },
                  { icon: Mail, label: "Cold email generator" },
                  { icon: Zap, label: "AI-powered templates" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon style={{ width: 12, height: 12, color: "#bbb", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#aaa" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onLogout}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#ccc", fontSize: 11, cursor: "pointer", marginTop: 24, transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
            >
              <LogOut style={{ width: 13, height: 13 }} />
              Sign Out
            </button>
          </div>

          {/* ── RIGHT CONTENT ─────────────────────────────────────── */}
          <div style={{ flex: 1, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Status badge */}
            <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 50, background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309", fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block", animation: "pulse 2s infinite" }} />
              Account Under Review
            </div>

            {/* Greeting */}
            <div>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: "#111", lineHeight: 1.3, marginBottom: 2 }}>Hey {displayName},</h2>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: "#aaa", lineHeight: 1.3 }}>your account is under review.</h2>
            </div>

            {/* Message */}
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fafafa", border: "1px solid #f0f0f0", color: "#777", fontSize: 13, lineHeight: 1.75 }}>
              We received your request and are currently setting up your workspace. This typically takes{" "}
              <strong style={{ color: "#111" }}>1–2 hours</strong>. Once ready, we will email{" "}
              <strong style={{ color: "#111" }}>{userEmail}</strong>{" "}with a confirmation link.
            </div>

            {/* Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#ccc", fontWeight: 700, marginBottom: 2 }}>Setup Progress</p>

              {[
                { icon: CheckCircle2, label: "Registration received", done: true, running: false },
                { icon: Clock, label: "Workspace configuration", done: false, running: true },
                { icon: Mail, label: "Confirmation email", done: false, running: false },
              ].map(({ icon: Icon, label, done, running }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: done ? "#f8fdf8" : running ? "#f8f8f8" : "#fafafa", border: `1px solid ${done ? "#d1fae5" : running ? "#e0e0e0" : "#f0f0f0"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon style={{ width: 14, height: 14, color: done ? "#22c55e" : running ? "#666" : "#ccc", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: done ? "#16a34a" : running ? "#444" : "#bbb" }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: done ? "#16a34a" : running ? "#888" : "#ccc" }}>
                    {done ? "Done" : running ? "In progress" : "Pending"}
                  </span>
                </div>
              ))}
            </div>

            {/* Email tip */}
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Mail style={{ width: 14, height: 14, color: "#0369a1", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#0369a1", margin: 0, lineHeight: 1.6 }}>
                Check your spam folder if you don&apos;t see the confirmation email. Add{" "}
                <strong>{process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@propai.com"}</strong>{" "}
                to your contacts to ensure delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </div>
  );
}
