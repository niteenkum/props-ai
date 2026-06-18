"use client";

/**
 * ThePitchly — Sidebar Navigation
 * - Toggle icon always stays at the top
 * - Smooth slide animation via CSS width transition + overflow clip
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, User, Sun, Moon, Search, Settings,
  BookOpen, ChevronLeft, ChevronRight, MessageCircle, Mail,
  FilePlus2, CalendarDays, BarChart3, Sparkles
} from "lucide-react";
import { useTheme } from "./theme-provider";

interface SidebarProps {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
}

const QUICK_PROMPTS = [
  { label: "Draft a cold email", query: "Help me draft a cold email to a potential client for a React developer role" },
  { label: "Search my inbox", query: "Search my Gmail inbox for recent recruiter and job opportunity emails" },
  { label: "Show outreach stats", query: "Show me my job outreach statistics and application summary" },
  { label: "Latest job matches", query: "List my most recent job applications and their current status" }
] as const;

const COLLAPSED_W = 72;
const EXPANDED_W = 265;

export default function Sidebar({
  onLogout,
  userName = "Your Profile",
  userRole = "IT Freelancer",
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PA";

  const w = collapsed ? COLLAPSED_W : EXPANDED_W;

  const handleRecentItemClick = (queryText: string) => {
    router.push(`/dashboard/your-bot?q=${encodeURIComponent(queryText)}`);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard/workspace" || href === "/dashboard/mail") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavLink = (href: string, label: string, Icon: React.ComponentType<any>, color?: string) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "12px 0" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 10,
          background: active
            ? (isDark ? "rgba(249, 250, 251, 0.08)" : "rgba(10, 10, 10, 0.06)")
            : "transparent",
          color: active
            ? (isDark ? "#F9FAFB" : "#0A0A0A")
            : "var(--muted-foreground)",
          fontWeight: active ? 700 : 500,
          fontSize: 13,
          textDecoration: "none",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          border: active
            ? (isDark ? "1px solid rgba(249, 250, 251, 0.12)" : "1px solid rgba(10, 10, 10, 0.12)")
            : "1px solid transparent",
          boxShadow: "none",
          position: "relative",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
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
        {active && !collapsed && (
          <div style={{
            position: "absolute", left: 0, top: "25%", bottom: "25%",
            width: 3.5, borderRadius: 2,
            background: isDark ? "#F9FAFB" : "#0A0A0A",
          }} />
        )}
        <Icon size={15.5} style={{ color: active ? (color || (isDark ? "#F9FAFB" : "#0A0A0A")) : "inherit", transition: "color 0.25s", flexShrink: 0 }} />
        {/* Label: uses max-width + opacity for smooth slide */}
        <span style={{
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          overflow: "hidden",
          display: "inline-block",
          transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: collapsed ? "16px 10px" : "22px 18px",
        background: isDark
          ? "#000000"
          : "linear-gradient(180deg, #FFFFFF 0%, #F4F7FF 100%)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: isDark
          ? "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
          : "0 8px 24px rgba(0, 0, 0, 0.05)",
        backdropFilter: "blur(20px)",
        transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* ── TOP SECTION ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Brand row — toggle button ALWAYS lives here at the top */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: collapsed ? 0 : 8,
          padding: "0 2px",
          minHeight: 30,
        }}>
          {/* Brand text / monogram — transitions in place */}
          <span style={{
            fontSize: 17,
            fontWeight: 800,
            color: isDark ? "#F9FAFB" : "#0A0A0A",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: -0.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            maxWidth: collapsed ? 0 : 180,
            opacity: collapsed ? 0 : 1,
            transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
          }}>
            The Pitchly
          </span>

          {/* ✔ Toggle button — always at top-right, never moves */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              flexShrink: 0,
              width: 26,
              height: 26,
              borderRadius: 8,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
              e.currentTarget.style.color = "var(--muted-foreground)";
            }}
          >
            {/* Chevron rotates: points right (expand) when collapsed, left (collapse) when expanded */}
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <ChevronRight size={13} />
            </span>
          </button>
        </div>

        {/* User Profile Area — clickable card → /dashboard/profile */}
        <Link
          href="/dashboard/profile"
          title="View your profile"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: collapsed ? "8px" : "10px 12px",
              background: isActive("/dashboard/profile")
                ? (isDark ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.06)")
                : (isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)"),
              borderRadius: 14,
              border: isActive("/dashboard/profile")
                ? (isDark ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(99,102,241,0.2)")
                : (isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid var(--border)"),
              boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.15)" : "none",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)";
              e.currentTarget.style.borderColor = isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isActive("/dashboard/profile")
                ? (isDark ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.06)")
                : (isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)");
              e.currentTarget.style.borderColor = isActive("/dashboard/profile")
                ? (isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)")
                : (isDark ? "rgba(255, 255, 255, 0.05)" : "var(--border)");
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {/* Avatar — always visible */}
              <div style={{
                width: 32, height: 32,
                borderRadius: "50%",
                background: isDark ? "linear-gradient(135deg, #374151, #1F2937)" : "linear-gradient(135deg, #1F2937, #0A0A0A)",
                color: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                flexShrink: 0, position: "relative",
              }}>
                {initials}
                <span style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#22c55e", border: "2px solid var(--card)",
                }} />
              </div>

              {/* Name/role: slide in/out */}
              <div style={{
                maxWidth: collapsed ? 0 : 140,
                opacity: collapsed ? 0 : 1,
                overflow: "hidden",
                minWidth: 0,
                transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
              }}>
                <p style={{
                  fontSize: 12.5, fontWeight: 700, color: "var(--foreground)",
                  margin: 0, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", letterSpacing: -0.2,
                }}>
                  {userName}
                </p>
                <p style={{
                  fontSize: 9.5, color: "var(--muted-foreground)",
                  margin: 0, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", fontWeight: 500,
                }}>
                  {userRole}
                </p>
              </div>
            </div>

            {/* Arrow hint — fades in when expanded */}
            <div style={{
              maxWidth: collapsed ? 0 : 20,
              opacity: collapsed ? 0 : 0.5,
              overflow: "hidden",
              transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
              display: "flex", alignItems: "center",
            }}>
              <ChevronRight size={13} />
            </div>
          </div>
        </Link>

        {/* Search Input: slides out */}
        <div style={{
          maxHeight: collapsed ? 0 : 50,
          opacity: collapsed ? 0 : 1,
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
        }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} style={{
              position: "absolute", left: 12,
              color: "var(--muted-foreground)", pointerEvents: "none", opacity: 0.6,
            }} />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "9px 32px 9px 32px",
                fontSize: 12, borderRadius: 10,
                border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid var(--border)",
                background: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                color: "var(--foreground)", outline: "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = isDark ? "rgba(249,250,251,0.3)" : "rgba(0,0,0,0.3)";
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF";
                e.currentTarget.style.boxShadow = isDark ? "0 0 0 3px rgba(249,250,251,0.08)" : "0 0 0 3px rgba(0,0,0,0.06)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.05)" : "var(--border)";
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        {/* Navigation Categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Main Workspace Pages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[
              { href: "/dashboard/your-bot", label: "ThePitchly AI", icon: Sparkles },
              { href: "/dashboard/workspace", label: "Workspace Library", icon: BookOpen },
            ].map(({ href, label, icon }) => renderNavLink(href, label, icon))}
          </div>

          {/* Connections Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              maxHeight: collapsed ? 0 : 20,
              opacity: collapsed ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 0.3s ease, opacity 0.18s ease",
            }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                paddingLeft: 10, marginBottom: 2, opacity: 0.6, display: "block",
              }}>
                Connections
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#22c55e" },
              ].map(({ href, label, icon, color }) => renderNavLink(href, label, icon, color))}
            </div>
          </div>

          {/* Tools & Outreach Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              maxHeight: collapsed ? 0 : 20,
              opacity: collapsed ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 0.3s ease, opacity 0.18s ease",
            }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                paddingLeft: 10, marginBottom: 2, opacity: 0.6, display: "block",
              }}>
                Tools & Outreach
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { href: "/dashboard/mail", label: "Smart Inbox", icon: Mail },
                { href: "/dashboard/new", label: "New Scan", icon: FilePlus2 },
                { href: "/dashboard/followups", label: "Calls & Follow-ups", icon: CalendarDays },
                { href: "/dashboard/expense", label: "AI Expense", icon: BarChart3 },
              ].map(({ href, label, icon }) => renderNavLink(href, label, icon))}
            </div>
          </div>

          {/* Quick Prompts — slides out entirely */}
          <div style={{
            maxHeight: collapsed ? 0 : 200,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: "max-height 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                paddingLeft: 10, marginBottom: 2, opacity: 0.6, display: "block",
              }}>
                Quick Prompts
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentItemClick(item.query)}
                    style={{
                      background: "transparent", border: "none",
                      textAlign: "left", padding: "6px 10px",
                      borderRadius: 8, fontSize: 12, fontWeight: 500,
                      color: "var(--muted-foreground)", cursor: "pointer",
                      whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis", width: "100%",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM SECTION ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10, padding: "9px 12px",
            background: "transparent", border: "none", borderRadius: 10,
            color: "var(--muted-foreground)", cursor: "pointer",
            fontSize: 12.5, fontWeight: 500, transition: "all 0.2s",
            overflow: "hidden", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          {isDark ? (
            <>
              <Sun size={14.5} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span style={{
                maxWidth: collapsed ? 0 : 100, opacity: collapsed ? 0 : 1,
                overflow: "hidden", display: "inline-block",
                transition: "max-width 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
                whiteSpace: "nowrap",
              }}>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={14.5} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span style={{
                maxWidth: collapsed ? 0 : 100, opacity: collapsed ? 0 : 1,
                overflow: "hidden", display: "inline-block",
                transition: "max-width 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
                whiteSpace: "nowrap",
              }}>Dark Mode</span>
            </>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10, padding: "9px 12px",
            background: "transparent", border: "none", borderRadius: 10,
            color: "var(--muted-foreground)", cursor: "pointer",
            fontSize: 12.5, fontWeight: 500, transition: "all 0.2s",
            overflow: "hidden", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          <LogOut size={14.5} style={{ flexShrink: 0 }} />
          <span style={{
            maxWidth: collapsed ? 0 : 100, opacity: collapsed ? 0 : 1,
            overflow: "hidden", display: "inline-block",
            transition: "max-width 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
            whiteSpace: "nowrap",
          }}>Sign Out</span>
        </button>

      </div>
    </aside>
  );
}
