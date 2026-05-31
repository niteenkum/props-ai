"use client";

import React from "react";
import { LayoutDashboard, FilePlus2, LogOut, Sparkles, User } from "lucide-react";

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
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
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
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles style={{ width: 17, height: 17, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>
              Prop<span style={{ color: "#888" }}>AI</span>
            </h1>
            <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#ccc", fontWeight: 600, margin: 0 }}>
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
                  background: isActive ? "#f5f5f5" : "transparent",
                  color: isActive ? "#111" : "#888",
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
                    e.currentTarget.style.background = "#fafafa";
                    e.currentTarget.style.color = "#555";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#888";
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
                      background: "#111",
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
      <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
            background: activeTab === "profile" ? "#f5f5f5" : "#fafafa",
            cursor: "pointer",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = activeTab === "profile" ? "#f5f5f5" : "#fafafa"; }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#111",
              color: "#fff",
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
                border: "2px solid #fff",
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#111", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
            <p style={{ fontSize: 10, color: "#aaa", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRole}</p>
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
            color: "#ccc",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fef2f2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#ccc"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
