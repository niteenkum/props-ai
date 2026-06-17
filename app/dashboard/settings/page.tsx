"use client";

import React, { useState, useEffect } from "react";
import { useAuth }    from "../../hooks/useAuth";
import { useTheme }   from "../../components/theme-provider";
import { useProfile } from "../../hooks/useProfile";
import MailAccountPanel from "../../components/mail/MailAccountPanel";
import {
  Mail, Zap, ShieldCheck, Link2, Inbox, Send, Settings, User, Sliders,
  Check, Save, Loader2, MessageSquare, Laptop, Smartphone, Eye, Sun, Moon,
  HelpCircle, ChevronRight, CheckCircle2, AlertCircle, Sparkles, ExternalLink
} from "lucide-react";
import { cardStyle, inputStyle, labelStyle } from "../styles";

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  icon, label, active, onClick, isDark
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "12px 16px",
        borderRadius: 12,
        border: "none",
        background: active 
          ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)")
          : "transparent",
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        fontWeight: active ? 700 : 500,
        fontSize: 13.5,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
          e.currentTarget.style.color = "var(--foreground)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--muted-foreground)";
        }
      }}
    >
      {active && (
        <div style={{
          position: "absolute",
          left: 0,
          top: "20%",
          bottom: "20%",
          width: 3.5,
          borderRadius: 2,
          background: "#818cf8",
          boxShadow: "0 0 10px #818cf8",
        }} />
      )}
      <span style={{ color: active ? "#818cf8" : "inherit", display: "flex", alignItems: "center" }}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function SectionTitle({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(99,102,241,0.1)",
          color: "#818cf8",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <h2 style={{ fontSize: 16.5, fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: -0.3 }}>
          {title}
        </h2>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0 }}>{desc}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GeneralSettingsPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { theme, toggleTheme } = useTheme();
  const isDark                 = theme === "dark";

  // State hooks for unified profiles
  const p = useProfile(userEmail ?? "");

  // Settings states
  const [activeTab, setActiveTab] = useState<"integrations" | "profile" | "preferences">("integrations");
  const [waStatus, setWaStatus]   = useState<{ connected: boolean; phone: string | null; name: string | null } | null>(null);
  const [isDisconnectingWa, setIsDisconnectingWa] = useState(false);

  // App preferences state
  const [matchThreshold, setMatchThreshold] = useState<number>(55);
  const [autoScanWa, setAutoScanWa]         = useState<boolean>(true);
  const [chatbotGreeting, setChatbotGreeting] = useState<string>("Hi! I'm The Pitchly AI. How can I help you today?");
  const [chatbotTone, setChatbotTone]         = useState<string>("Professional");
  const [prefSaveSuccess, setPrefSaveSuccess] = useState(false);

  // Poll/Check WhatsApp status
  const checkWaStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWaStatus({
          connected: data.connected,
          phone: data.phone,
          name: data.name
        });
      }
    } catch (err) {
      console.error("[Settings] WhatsApp status check failed:", err);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 12000);
    return () => clearInterval(interval);
  }, [isReady]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedThreshold = localStorage.getItem("ai_matching_threshold");
      if (savedThreshold) setMatchThreshold(Number(savedThreshold));

      const savedAutoScan = localStorage.getItem("wa_auto_scan");
      if (savedAutoScan) setAutoScanWa(savedAutoScan === "true");

      const savedGreeting = localStorage.getItem("chatbot_greeting");
      if (savedGreeting) setChatbotGreeting(savedGreeting);

      const savedTone = localStorage.getItem("chatbot_tone");
      if (savedTone) setChatbotTone(savedTone);
    }
  }, []);

  const handleDisconnectWhatsApp = async () => {
    setIsDisconnectingWa(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect");
      if (res.ok) {
        setWaStatus({ connected: false, phone: null, name: null });
      }
    } catch (err) {
      console.error("Disconnecting WhatsApp failed:", err);
    } finally {
      setIsDisconnectingWa(false);
    }
  };

  const handleSavePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai_matching_threshold", String(matchThreshold));
      localStorage.setItem("wa_auto_scan", String(autoScanWa));
      localStorage.setItem("chatbot_greeting", chatbotGreeting);
      localStorage.setItem("chatbot_tone", chatbotTone);
      setPrefSaveSuccess(true);
      setTimeout(() => setPrefSaveSuccess(false), 3000);
    }
  };

  if (!isReady || !p.profile) return null;

  return (
    <>
      <style>{`
        /* Cool customized styles */
        .settings-tab-card {
          animation: settings-fadein 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes settings-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .settings-bento-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          box-shadow: ${isDark ? "0 4px 30px rgba(0,0,0,0.25)" : "0 4px 20px rgba(0,0,0,0.03)"};
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-bento-card:hover {
          border-color: ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)"};
        }
        .settings-input {
          width: 100%;
          padding: 10px 14px;
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 13.5px;
          color: var(--foreground);
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: var(--card);
        }
        .settings-textarea {
          width: 100%;
          padding: 10px 14px;
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 13.5px;
          color: var(--foreground);
          outline: none;
          resize: none;
          line-height: 1.5;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-textarea:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: var(--card);
        }
        .theme-select-card {
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .theme-select-card.active {
          border-color: #818cf8;
          background: ${isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.03)"};
        }
        .theme-select-card:hover {
          border-color: #818cf8aa;
        }
      `}</style>

      {/* ── Page header ── */}
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99,102,241,0.32)", flexShrink: 0,
          }}>
            <Settings size={19} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--foreground)", margin: 0, letterSpacing: -0.5 }}>
              Settings &amp; Preferences
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              Configure integrations, edit profile metadata, and customize chatbot preferences.
            </p>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 24, alignItems: "start", paddingBottom: 60 }}>
        
        {/* Left Side: Navigation Tabs Card */}
        <div className="settings-bento-card" style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2,
            color: "var(--muted-foreground)", paddingLeft: 16, marginBottom: 8, opacity: 0.6
          }}>
            SYSTEM SETTINGS
          </span>
          <TabButton icon={<Link2 size={16} />} label="Integrations" active={activeTab === "integrations"} onClick={() => setActiveTab("integrations")} isDark={isDark} />
          <TabButton icon={<User size={16} />} label="Developer Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} isDark={isDark} />
          <TabButton icon={<Sliders size={16} />} label="App Preferences" active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")} isDark={isDark} />
          
          <div style={{ borderTop: "1px solid var(--border)", margin: "16px 12px", paddingTop: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted-foreground)" }}>
              <ShieldCheck size={14} style={{ color: "#22c55e" }} />
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>All settings encrypted</span>
            </div>
          </div>
        </div>

        {/* Right Side: Settings Content Pane */}
        <div style={{ minHeight: 480 }}>
          
          {/* TAB 1: INTEGRATIONS PANEL */}
          {activeTab === "integrations" && (
            <div className="settings-tab-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Mail Accounts Integrations */}
              <div className="settings-bento-card">
                <SectionTitle icon={<Mail size={16} />} title="Email &amp; Calendar Credentials" desc="Authorize ThePitchly to check and send messages via Zoho Mail or Gmail." />
                <MailAccountPanel userEmail={userEmail ?? ""} isDark={isDark} mode="connections" />
              </div>

              {/* WhatsApp Account Integration */}
              <div className="settings-bento-card">
                <SectionTitle icon={<MessageSquare size={16} />} title="WhatsApp Outreach Status" desc="Synchronize WhatsApp conversation threads and scan active job proposals." />
                
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px", borderRadius: 12,
                  background: waStatus?.connected 
                    ? (isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.03)")
                    : (isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.03)"),
                  border: `1px solid ${waStatus?.connected 
                    ? (isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)")
                    : (isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.15)")
                  }`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: waStatus?.connected ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: waStatus?.connected ? "#22c55e" : "#f59e0b",
                    }}>
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                          WhatsApp Connection
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 800, textTransform: "uppercase", padding: "2px 6px", borderRadius: 6,
                          background: waStatus?.connected ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                          color: waStatus?.connected ? "#22c55e" : "#f59e0b",
                          border: `1px solid ${waStatus?.connected ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`
                        }}>
                          {waStatus?.connected ? "Connected" : "Not Linked"}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                        {waStatus?.connected 
                          ? `Linked to ${waStatus.name || "WhatsApp"} (${waStatus.phone})`
                          : "Connect your mobile device to start fetching leads automatically."
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    {waStatus?.connected ? (
                      <button
                        onClick={handleDisconnectWhatsApp}
                        disabled={isDisconnectingWa}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.25)",
                          background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                        }}
                      >
                        {isDisconnectingWa ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Disconnect"}
                      </button>
                    ) : (
                      <a
                        href="/dashboard/whatsapp"
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "1px solid #818cf8",
                          background: "rgba(99,102,241,0.08)", color: "#818cf8", fontSize: 12, fontWeight: 700,
                          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6
                        }}
                      >
                        Link WhatsApp <ChevronRight size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Informational guide rows */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                
                {/* How integrations work */}
                <div className="settings-bento-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, color: "#818cf8" }}>
                    <Zap size={13} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                      Setup Guide
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { step: "1", text: "Go to Mail or WhatsApp to connect your active communication channels." },
                      { step: "2", text: "Authenticate securely via OAuth (Google/Zoho) or QR scan (WhatsApp)." },
                      { step: "3", text: "ThePitchly parses incoming leads and aggregates follow-up items dynamically." }
                    ].map(item => (
                      <div key={item.step} style={{ display: "flex", gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#818cf8"
                        }}>{item.step}</div>
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.45 }}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Privacy summary */}
                <div className="settings-bento-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: "#22c55e" }}>
                      <ShieldCheck size={14} />
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                        Privacy Protection
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
                      Creds and session refresh tokens are encrypted on database records. Scopes are requested for reading and sending messages only — ThePitchly will never index private details or delete threads.
                    </p>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10, fontSize: 11, color: "var(--muted-foreground)" }}>
                    Google OAuth complies with standard security procedures.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: DEVELOPER PROFILE PANEL */}
          {activeTab === "profile" && (
            <div className="settings-tab-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              <div className="settings-bento-card">
                <SectionTitle icon={<User size={16} />} title="Developer Profile Information" desc="Configure your active professional details. This data is used directly by the AI engines when scanning positions and drafting email proposals." />
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* Name & Role Rows */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={labelStyle}>Full Name</span>
                      <input
                        type="text"
                        value={p.profile.name || ""}
                        onChange={e => p.setProfile({ ...p.profile!, name: e.target.value })}
                        placeholder="e.g. Niteen Kumar"
                        className="settings-input"
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={labelStyle}>Professional Title / Role</span>
                      <input
                        type="text"
                        value={p.profile.role || ""}
                        onChange={e => p.setProfile({ ...p.profile!, role: e.target.value })}
                        placeholder="e.g. React Frontend Architect"
                        className="settings-input"
                      />
                    </div>

                  </div>

                  {/* Email row */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={labelStyle}>Contact Email Address</span>
                    <input
                      type="email"
                      value={p.profile.email || ""}
                      onChange={e => p.setProfile({ ...p.profile!, email: e.target.value })}
                      placeholder="e.g. niteen@niteen.dev"
                      className="settings-input"
                    />
                  </div>

                  {/* Portfolio, GitHub, and LinkedIn links */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Professional URL Links
                    </span>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={labelStyle}>Portfolio website</span>
                        <input
                          type="text"
                          value={p.profile.portfolioUrl || ""}
                          onChange={e => p.setProfile({ ...p.profile!, portfolioUrl: e.target.value })}
                          placeholder="https://yourportfolio.com"
                          className="settings-input"
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={labelStyle}>GitHub profile</span>
                        <input
                          type="text"
                          value={p.profile.githubUrl || ""}
                          onChange={e => p.setProfile({ ...p.profile!, githubUrl: e.target.value })}
                          placeholder="https://github.com/profile"
                          className="settings-input"
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={labelStyle}>LinkedIn URL</span>
                        <input
                          type="text"
                          value={p.profile.linkedinUrl || ""}
                          onChange={e => p.setProfile({ ...p.profile!, linkedinUrl: e.target.value })}
                          placeholder="https://linkedin.com/in/profile"
                          className="settings-input"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Floating or fixed Action Bar */}
                <div style={{
                  display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14,
                  marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)"
                }}>
                  {p.profileSaveSuccess && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={14} /> Profile details saved!
                    </span>
                  )}
                  <button
                    onClick={() => p.handleSaveProfile()}
                    disabled={p.profileSaving || !p.hasChanges}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 18px", borderRadius: 10, border: "none",
                      background: !p.hasChanges
                        ? (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9")
                        : "linear-gradient(135deg, #818cf8, #6366f1)",
                      color: !p.hasChanges ? "var(--muted-foreground)" : "#fff",
                      fontSize: 13, fontWeight: 700,
                      cursor: !p.hasChanges || p.profileSaving ? "not-allowed" : "pointer",
                      boxShadow: !p.hasChanges ? "none" : "0 4px 12px rgba(99,102,241,0.25)",
                      transition: "all 0.2s"
                    }}
                  >
                    {p.profileSaving 
                      ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      : <Save size={14} />
                    }
                    <span>Save changes</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: APP PREFERENCES PANEL */}
          {activeTab === "preferences" && (
            <div className="settings-tab-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Theme Customization */}
              <div className="settings-bento-card">
                <SectionTitle icon={<Laptop size={16} />} title="Theme Appearance Mode" desc="Customize UI styling accents and toggle between active dark and light modes." />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  
                  {/* Light theme card */}
                  <div
                    onClick={() => { if (theme === "dark") toggleTheme(); }}
                    className={`theme-select-card settings-bento-card ${theme === "light" ? "active" : ""}`}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 16px" }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "rgba(245,158,11,0.1)", color: "#f59e0b",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Sun size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)", textAlign: "center" }}>
                        Light Appearance
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted-foreground)", textAlign: "center" }}>
                        Clean layouts with high contrast text.
                      </p>
                    </div>
                  </div>

                  {/* Dark theme card */}
                  <div
                    onClick={() => { if (theme === "light") toggleTheme(); }}
                    className={`theme-select-card settings-bento-card ${theme === "dark" ? "active" : ""}`}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 16px" }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "rgba(99,102,241,0.15)", color: "#818cf8",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Moon size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)", textAlign: "center" }}>
                        Midnight Theme
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted-foreground)", textAlign: "center" }}>
                        Premium layout with deep neon backdrops.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* AI matching settings */}
              <div className="settings-bento-card">
                <SectionTitle icon={<Sliders size={16} />} title="AI Scanner Controls" desc="Tweak lead analysis filters and matching confidence variables." />
                
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  
                  {/* Slider or discrete picker for Matching threshold */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={labelStyle}>Minimum Match Score Threshold</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#818cf8" }}>{matchThreshold}%</span>
                    </div>
                    
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={matchThreshold}
                      onChange={e => setMatchThreshold(Number(e.target.value))}
                      style={{
                        width: "100%", accentColor: "#818cf8", height: 5, borderRadius: 5,
                        background: "var(--border)", outline: "none", margin: "8px 0"
                      }}
                    />
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 4 }}>
                      {[
                        { limit: 40, label: "Lenient (40%)", desc: "Highest volume, higher noise" },
                        { limit: 55, label: "Balanced (55%)", desc: "Recommended ratio" },
                        { limit: 75, label: "Strict (75%)", desc: "High confidence results" },
                      ].map(cfg => (
                        <div
                          key={cfg.limit}
                          onClick={() => setMatchThreshold(cfg.limit)}
                          style={{
                            padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                            background: matchThreshold === cfg.limit ? "rgba(99,102,241,0.06)" : "transparent",
                            border: `1.5px solid ${matchThreshold === cfg.limit ? "#818cf8" : "var(--border)"}`,
                            transition: "all 0.15s"
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: matchThreshold === cfg.limit ? "#818cf8" : "var(--foreground)" }}>
                            {cfg.label}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--muted-foreground)" }}>
                            {cfg.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Toggle switches for automation */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", display: "block" }}>
                        Auto-scan WhatsApp Messages
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                        Process leads immediately upon WhatsApp background fetch syncs.
                      </span>
                    </div>
                    <button
                      onClick={() => setAutoScanWa(v => !v)}
                      style={{
                        width: 42, height: 22, borderRadius: 100, border: "none", cursor: "pointer",
                        position: "relative", background: autoScanWa ? "#22c55e" : "var(--border)",
                        transition: "background 0.25s ease",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2, left: autoScanWa ? 22 : 2,
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        transition: "left 0.2s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                      }} />
                    </button>
                  </div>

                </div>
              </div>

              {/* Bot greeting customizer */}
              <div className="settings-bento-card">
                <SectionTitle icon={<Sparkles size={16} />} title="The Pitchly AI preferences" desc="Customize chatbot greetings and personality responses." />
                
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  
                  {/* Greeting prompt */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={labelStyle}>Default greeting message</span>
                    <input
                      type="text"
                      value={chatbotGreeting}
                      onChange={e => setChatbotGreeting(e.target.value)}
                      placeholder="Hi! I'm The Pitchly AI. How can I help you today?"
                      className="settings-input"
                    />
                  </div>

                  {/* Tone presets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={labelStyle}>AI Agent Personality Tone</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Professional", "Friendly", "Technical"].map(tone => (
                        <button
                          key={tone}
                          onClick={() => setChatbotTone(tone)}
                          style={{
                            flex: 1, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                            background: chatbotTone === tone 
                              ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)")
                              : "transparent",
                            border: `1.5px solid ${chatbotTone === tone ? "#818cf8" : "var(--border)"}`,
                            color: chatbotTone === tone ? "#818cf8" : "var(--muted-foreground)",
                            fontWeight: chatbotTone === tone ? 700 : 500,
                            fontSize: 12, transition: "all 0.15s"
                          }}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Save block */}
                <div style={{
                  display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14,
                  marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)"
                }}>
                  {prefSaveSuccess && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={14} /> Preferences updated!
                    </span>
                  )}
                  <button
                    onClick={handleSavePreferences}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 18px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #818cf8, #6366f1)",
                      color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(99,102,241,0.25)", transition: "all 0.2s"
                    }}
                  >
                    <Save size={14} />
                    <span>Save preferences</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </>
  );
}
