"use client";

import React, { useState } from "react";
import { useAuth }    from "../../hooks/useAuth";
import { useTheme }   from "../../components/theme-provider";
import { useProfile } from "../../hooks/useProfile";
import MailAccountPanel from "../../components/mail/MailAccountPanel";
import {
  Mail, Zap, ShieldCheck, Link2, Clock, Inbox, Send, ExternalLink,
} from "lucide-react";
import { cardStyle } from "../styles";

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, accent, isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  isDark: boolean;
}) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: isDark ? `${accent}08` : `${accent}06`,
      border: `1px solid ${isDark ? `${accent}20` : `${accent}15`}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isDark ? `${accent}15` : `${accent}10`,
        border: `1px solid ${isDark ? `${accent}30` : `${accent}20`}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: "3px 0 0", fontWeight: 500 }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function Step({ n, title, desc, isDark }: { n: string; title: string; desc: string; isDark: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isDark ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.09)",
        border: "1.5px solid rgba(99,102,241,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: "#818cf8",
      }}>
        {n}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 2px" }}>{title}</p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Provider row ─────────────────────────────────────────────────────────────

function ProviderRow({
  name, status, isDark,
}: {
  name: string; status: "available" | "soon"; isDark: boolean;
}) {
  const isAvailable = status === "available";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", borderRadius: 10,
      border: `1px solid ${
        isAvailable
          ? (isDark ? "rgba(99,102,241,0.22)" : "rgba(99,102,241,0.14)")
          : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)")
      }`,
      background: isAvailable
        ? (isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.03)")
        : "transparent",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: isAvailable
            ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)")
            : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Mail size={12} style={{
            color: isAvailable ? (isDark ? "#818cf8" : "#6366f1") : "var(--muted-foreground)",
          }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: isAvailable ? 700 : 500, color: "var(--foreground)" }}>
          {name}
        </span>
      </div>
      <span style={{
        fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
        padding: "3px 9px", borderRadius: 50,
        background: isAvailable
          ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)")
          : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
        color: isAvailable
          ? (isDark ? "#818cf8" : "#6366f1")
          : "var(--muted-foreground)",
        border: isAvailable
          ? `1px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"}`
          : "1px solid transparent",
      }}>
        {isAvailable ? "Active" : "Coming soon"}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MailPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { profile }            = useProfile(userEmail);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  if (!isReady) return null;

  return (
    <>
      {/* ── Page header ── */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99,102,241,0.32)", flexShrink: 0,
          }}>
            <Mail size={19} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: -0.5 }}>
              Mail Integration
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
              Link your mailbox to read leads and send outreach directly from PropAI.
            </p>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 18 }}>
          <StatCard icon={<Inbox size={16} />}      label="Inbox"       value="Smart" accent="#6366f1" isDark={isDark} />
          <StatCard icon={<Send size={16} />}       label="Outreach"    value="1-Click" accent="#14b8a6" isDark={isDark} />
          <StatCard icon={<ShieldCheck size={16} />} label="Privacy"    value="Secure" accent="#22c55e" isDark={isDark} />
        </div>
      </header>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 22, alignItems: "start" }}>

        {/* ── Left — Mail panel ── */}
        <div style={{
          ...cardStyle,
          padding: "22px 22px",
          borderRadius: 18,
          boxShadow: isDark
            ? "0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.5)"
            : "0 0 0 1px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.06)",
        }}>
          <MailAccountPanel userEmail={userEmail ?? ""} isDark={isDark} />
        </div>

        {/* ── Right — Info column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* How it works */}
          <div style={{
            ...cardStyle,
            borderRadius: 16,
            padding: "20px",
            boxShadow: isDark
              ? "0 0 0 1px rgba(255,255,255,0.04)"
              : "0 0 0 1px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <Zap size={13} style={{ color: "#818cf8" }} />
              <p style={{
                fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2,
                color: "var(--muted-foreground)", margin: 0,
              }}>
                How it works
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Step n="1" title="Click 'Link Zoho Mail'" desc="You'll be redirected to Zoho's secure authorization page." isDark={isDark} />
              <Step n="2" title="Grant access" desc="Allow PropAI to read and send emails on your behalf." isDark={isDark} />
              <Step n="3" title="Smart Inbox" desc="Emails auto-sorted by category — Jobs, People, Updates." isDark={isDark} />
            </div>
          </div>

          {/* Inbox categories explainer */}
          <div style={{
            ...cardStyle,
            borderRadius: 16,
            padding: "20px",
            boxShadow: isDark
              ? "0 0 0 1px rgba(255,255,255,0.04)"
              : "0 0 0 1px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <Clock size={13} style={{ color: "#818cf8" }} />
              <p style={{
                fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2,
                color: "var(--muted-foreground)", margin: 0,
              }}>
                Inbox Categories
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "📥 All Mail",  desc: "Every message in your inbox" },
                { label: "👁️ Unread",    desc: "Messages you haven't opened yet" },
                { label: "⭐ Starred",   desc: "Messages you've marked important" },
                { label: "💼 Jobs",      desc: "Job opportunities & recruiters" },
                { label: "👥 People",    desc: "Personal & direct messages" },
                { label: "🏷️ Updates",  desc: "Notifications & newsletters" },
              ].map(({ label, desc }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap" }}>{label}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "right", lineHeight: 1.4 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mail providers */}
          <div style={{
            ...cardStyle,
            borderRadius: 16,
            padding: "20px",
            boxShadow: isDark
              ? "0 0 0 1px rgba(255,255,255,0.04)"
              : "0 0 0 1px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <Link2 size={13} style={{ color: "#818cf8" }} />
              <p style={{
                fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2,
                color: "var(--muted-foreground)", margin: 0,
              }}>
                Mail Providers
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <ProviderRow name="Zoho Mail" status="available" isDark={isDark} />
              <ProviderRow name="Gmail"     status="soon"      isDark={isDark} />
              <ProviderRow name="Outlook"   status="soon"      isDark={isDark} />
            </div>
          </div>

          {/* Privacy note */}
          <div style={{
            padding: "14px 16px", borderRadius: 14,
            background: isDark ? "rgba(245,158,11,0.05)" : "#fffbeb",
            border: `1px solid ${isDark ? "rgba(245,158,11,0.18)" : "#fde68a"}`,
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <ShieldCheck size={14} style={{ color: isDark ? "#fbbf24" : "#92400e", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: isDark ? "#fbbf24" : "#92400e", margin: 0, lineHeight: 1.65 }}>
                <strong>Your tokens never leave your server.</strong>{" "}
                Access is scoped to read &amp; send only — PropAI cannot delete emails or access attachments.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
