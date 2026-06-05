"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FilePlus2, LogOut, Sparkles, User, Sun, Moon, BarChart3, Mail } from "lucide-react";
import { useTheme } from "./theme-provider";

interface SidebarProps {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
}

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: "/dashboard",         label: "Dashboard",        icon: LayoutDashboard, exact: true },
  { href: "/dashboard/new",     label: "New Scan / Paste", icon: FilePlus2 },
  { href: "/dashboard/profile", label: "Candidate Profile", icon: User },
  { href: "/dashboard/mail",    label: "Mail Account",     icon: Mail },
  { href: "/dashboard/expense", label: "AI Expense",        icon: BarChart3 },
];

export default function Sidebar({
  onLogout,
  userName = "Your Profile",
  userRole = "Proposal Specialist",
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark   = theme === "dark";
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PA";

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
      }}
    >
      {/* ── Top Section ── */}
      <div>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px", marginBottom: 32 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
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
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  position: "relative",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "var(--input)";
                    (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
                  }
                }}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute", left: 0, top: "25%", bottom: "25%",
                      width: 3, borderRadius: "0 4px 4px 0",
                      background: "var(--primary)",
                    }}
                  />
                )}
                <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom Section ── */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            border: "none", background: "transparent",
            color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", width: "100%", textAlign: "left",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; e.currentTarget.style.color = "var(--foreground)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
        >
          {theme === "light"
            ? <Moon style={{ width: 18, height: 18, flexShrink: 0 }} />
            : <Sun  style={{ width: 18, height: 18, flexShrink: 0 }} />}
          <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>

        {/* User Card → links to profile */}
        <Link
          href="/dashboard/profile"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 10, textDecoration: "none",
            background: isActive("/dashboard/profile") ? "var(--accent)" : "var(--input)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive("/dashboard/profile") ? "var(--accent)" : "var(--input)"; }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--primary)", color: "var(--primary-foreground)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0, position: "relative",
            }}
          >
            {initials}
            <span
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 10, height: 10, borderRadius: "50%",
                background: "#22c55e", border: "2px solid var(--card)",
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </p>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userRole}
            </p>
          </div>
        </Link>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px", borderRadius: 10,
            border: "none", background: "transparent",
            color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", width: "100%", textAlign: "left",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
