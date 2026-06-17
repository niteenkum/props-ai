"use client";

/**
 * PropAI — Ciphy-inspired Sidebar Navigation with Premium Aesthetic Redesign
 * Exposes all connections, tools, and profile links under organized sections.
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

const SIDEBAR_COLLAPSED_W = 72;
const SIDEBAR_EXPANDED_W  = 265;

export default function Sidebar({
  onLogout,
  userName = "Your Profile",
  userRole = "IT Freelancer",
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark   = theme === "dark";
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PA";

  const w = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  const handleRecentItemClick = (queryText: string) => {
    router.push(`/dashboard/your-bot?q=${encodeURIComponent(queryText)}`);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard/workspace" || href === "/dashboard/mail" || href === "/dashboard/settings") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Generic nav-link renderer for clean styling consistency
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
            ? (isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.05)") 
            : "transparent",
          color: active 
            ? (isDark ? "#a5b4fc" : "#4f46e5") 
            : "var(--muted-foreground)",
          fontWeight: active ? 700 : 500,
          fontSize: 13,
          textDecoration: "none",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          border: active
            ? (isDark ? "1px solid rgba(129, 140, 248, 0.2)" : "1px solid rgba(99, 102, 241, 0.15)")
            : "1px solid transparent",
          boxShadow: active && isDark ? "0 4px 14px rgba(99, 102, 241, 0.12)" : "none",
          position: "relative",
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(99, 102, 241, 0.03)";
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
            position: "absolute",
            left: 0,
            top: "25%",
            bottom: "25%",
            width: 3.5,
            borderRadius: 2,
            background: "#818cf8",
            boxShadow: "0 0 8px #818cf8",
          }} />
        )}
        <Icon size={15.5} style={{ color: active ? (color || "#818cf8") : "inherit", transition: "color 0.25s" }} />
        {!collapsed && <span>{label}</span>}
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
          ? "linear-gradient(180deg, rgba(19, 19, 31, 0.95) 0%, rgba(13, 13, 20, 0.98) 100%)" 
          : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: isDark
          ? "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
          : "0 8px 24px rgba(148, 163, 184, 0.08)",
        backdropFilter: "blur(20px)",
        transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s ease",
        overflowY: "auto",
        scrollbarWidth: "none",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* ── TOP SECTION: Brand + Profile + Search + Tabs ────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* App Title / Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
              }}
            >
              <Settings size={17} />
            </div>
            {!collapsed && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--foreground)",
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: -0.3,
                }}
              >
                PropAI
              </span>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                opacity: 0.7
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* User Profile Area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: collapsed ? "8px" : "10px 12px",
            background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(99, 102, 241, 0.04)",
            borderRadius: 14,
            border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(99, 102, 241, 0.08)",
            boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.15)" : "none",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(99, 102, 241, 0.07)";
            e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(99, 102, 241, 0.15)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(99, 102, 241, 0.04)";
            e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(99, 102, 241, 0.08)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
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
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22c55e",
                  border: "2px solid var(--card)",
                }}
              />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: -0.2
                  }}
                >
                  {userName}
                </p>
                <p
                  style={{
                    fontSize: 9.5,
                    color: "var(--muted-foreground)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500
                  }}
                >
                  {userRole}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <Link href="/dashboard/profile" title="View profile" style={{ display: "flex", alignItems: "center", color: "var(--muted-foreground)", opacity: 0.7 }}>
              <User size={14} style={{ cursor: "pointer" }} />
            </Link>
          )}
        </div>

        {/* Search Input */}
        {!collapsed && (
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 12,
                color: "var(--muted-foreground)",
                pointerEvents: "none",
                opacity: 0.6
              }}
            />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 32px 9px 32px",
                fontSize: 12,
                borderRadius: 10,
                border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid var(--border)",
                background: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                color: "var(--foreground)",
                outline: "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "#818cf8";
                e.currentTarget.style.background = isDark ? "rgba(99, 102, 241, 0.04)" : "#FFFFFF";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.05)" : "var(--border)";
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        )}

        {/* Navigation Categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* Main Workspace Pages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[
              { href: "/dashboard/your-bot", label: "PropBot AI", icon: Sparkles },
              { href: "/dashboard/workspace", label: "Workspace Library", icon: BookOpen },
            ].map(({ href, label, icon }) => renderNavLink(href, label, icon))}
          </div>

          {/* Connections Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {!collapsed && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  paddingLeft: 10,
                  marginBottom: 2,
                  opacity: 0.6
                }}
              >
                Connections
              </span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#22c55e" },
                { href: "/dashboard/settings", label: "Settings", icon: Settings, color: "#818cf8" },
              ].map(({ href, label, icon, color }) => renderNavLink(href, label, icon, color))}
            </div>
          </div>

          {/* Tools & Outreach Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {!collapsed && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  paddingLeft: 10,
                  marginBottom: 2,
                  opacity: 0.6
                }}
              >
                Tools & Outreach
              </span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { href: "/dashboard/mail", label: "Smart Inbox", icon: Mail },
                { href: "/dashboard/new", label: "New Scan", icon: FilePlus2 },
                { href: "/dashboard/followups", label: "Calls & Follow-ups", icon: CalendarDays },
                { href: "/dashboard/expense", label: "AI Expense", icon: BarChart3 },
              ].map(({ href, label, icon }) => renderNavLink(href, label, icon))}
            </div>
          </div>

          {/* Quick Prompts Shortcuts (Interactive Query Actions) */}
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  paddingLeft: 10,
                  marginBottom: 2,
                  opacity: 0.6
                }}
              >
                Quick Prompts
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentItemClick(item.query)}
                    style={{
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--muted-foreground)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
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
          )}

        </div>

      </div>

      {/* ── BOTTOM SECTION: Theme + Collapse ────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            padding: "9px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 10,
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#F1F5F9";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          {isDark ? (
            <>
              <Sun size={14.5} style={{ color: "#f59e0b" }} />
              {!collapsed && <span>Light Mode</span>}
            </>
          ) : (
            <>
              <Moon size={14.5} style={{ color: "#6366f1" }} />
              {!collapsed && <span>Dark Mode</span>}
            </>
          )}
        </button>

        {/* Log Out Button */}
        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            padding: "9px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 10,
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            transition: "all 0.2s",
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
          <LogOut size={14.5} />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Collapse Toggle Arrow at the bottom */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "6px 0",
              background: "transparent",
              border: "none",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              borderRadius: 6,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}

      </div>
    </aside>
  );
}
