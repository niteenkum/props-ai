"use client";

import React from "react";
import { LayoutDashboard, FilePlus2, LogOut, Sparkles, User, Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

interface SidebarProps {
  activeTab: "dashboard" | "new" | "profile";
  setActiveTab: (tab: "dashboard" | "new" | "profile") => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onLogout,
  userName = "Niteen Kumar",
  userRole = "React Specialist",
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NK";

  const navItems: { key: "dashboard" | "new" | "profile"; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "new", label: "New Scan / Paste", icon: FilePlus2 },
    { key: "profile", label: "Candidate Profile", icon: User },
  ];

  return (
    <aside
      style={{
        width: 240,
        minHeight: "calc(100vh - 32px)",
        position: "sticky",
        top: 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px 14px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "var(--card-shadow)",
        transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      {/* Top Section */}
      <div>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px", marginBottom: 32 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles style={{ width: 17, height: 17, color: "var(--primary-foreground)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>
              Prop<span style={{ color: "var(--muted-foreground)" }}>AI</span>
            </h1>
            <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "var(--muted-foreground)", opacity: 0.7, fontWeight: 600, margin: 0 }}>
              Proposal Organizer
            </p>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative",
                  width: "100%",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--input)";
                    e.currentTarget.style.color = "var(--foreground)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--muted-foreground)";
                  }
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "25%",
                      bottom: "25%",
                      width: 3,
                      borderRadius: "0 4px 4px 0",
                      background: "var(--primary)",
                    }}
                  />
                )}
                <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--input)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          {theme === "light" ? (
            <Moon style={{ width: 18, height: 18, flexShrink: 0 }} />
          ) : (
            <Sun style={{ width: 18, height: 18, flexShrink: 0 }} />
          )}
          <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>

        {/* User Card */}
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 10,
            border: "none",
            background: activeTab === "profile" ? "var(--accent)" : "var(--input)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = activeTab === "profile" ? "var(--accent)" : "var(--input)"; }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              position: "relative",
            }}
          >
            {initials}
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#22c55e",
                border: "2px solid var(--card)",
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRole}</p>
          </div>
        </button>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted-foreground)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
