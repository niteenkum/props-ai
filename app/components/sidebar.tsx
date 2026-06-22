"use client";

/**
 * ThePitchly — Premium Sidebar Navigation
 * - Floating glassmorphic surface
 * - Modern typography hierarchy
 * - Hardware-accelerated hover translations
 * - Dynamic theme adaptations using Tailwind v4
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, Sun, Moon, Search, BookOpen, ChevronRight, 
  MessageCircle, Mail, FilePlus2, CalendarDays, BarChart3, 
  Sparkles, Keyboard, LogIn
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
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 select-none ${
          collapsed ? "justify-center" : "justify-start"
        } ${
          active
            ? "bg-primary text-primary-foreground font-bold shadow-[0_4px_12px_rgba(0,176,255,0.15)] border border-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-input/60 border border-transparent hover:translate-x-0.5"
        }`}
      >
        {/* Left vertical active bar */}
        {active && !collapsed && (
          <div className="absolute left-0 top-[25%] bottom-[25%] w-1 rounded-r bg-primary-foreground" />
        )}
        
        {/* Icon */}
        <Icon 
          size={16} 
          className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${
            active ? "text-primary-foreground" : ""
          }`}
          style={!active && color ? { color } : undefined}
        />
        
        {/* Label text */}
        <span
          className={`text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"
          }`}
        >
          {label}
        </span>

        {/* Outer highlight border on hover */}
        {!active && (
          <div className="absolute inset-0 rounded-xl border border-border/0 group-hover:border-border/60 transition-colors pointer-events-none" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`h-full flex flex-col justify-between p-4 transition-all duration-500 ease-out border shadow-lg backdrop-blur-xl shrink-0 z-20 ${
        collapsed ? "w-[76px] px-2.5" : "w-[260px]"
      } ${
        isDark
          ? "bg-black/35 border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          : "bg-white/60 border-black/5 shadow-[0_12px_32px_rgba(0,0,0,0.03)]"
      }`}
      style={{ borderRadius: "24px" }}
    >
      {/* ── TOP SECTION ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">

        {/* Brand header */}
        <div className="flex items-center justify-between min-h-[32px] px-1">
          {/* Logo & Text */}
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
              P
            </div>
            <span
              className={`font-black text-sm tracking-tight text-foreground transition-all duration-300 ${
                collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
              }`}
            >
              The Pitchly
            </span>
          </div>

          {/* Toggle Expand / Collapse button */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-7 h-7 rounded-lg border border-border bg-input/40 hover:bg-input hover:text-foreground text-muted-foreground flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-90 shrink-0"
          >
            <span
              className="flex items-center justify-center transition-transform duration-300"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
            >
              <ChevronRight size={13} />
            </span>
          </button>
        </div>

        {/* User Profile Card */}
        <Link href="/dashboard/profile" className="no-underline">
          <div
            className={`flex items-center justify-between transition-all duration-300 cursor-pointer border rounded-2xl group ${
              collapsed ? "p-1.5 justify-center" : "p-2.5"
            } ${
              isActive("/dashboard/profile")
                ? "bg-primary/5 border-primary/20 shadow-inner"
                : "bg-input/20 border-border/40 hover:bg-input/55 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 text-white flex items-center justify-center text-xs font-black shrink-0 relative shadow-sm">
                {initials}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
              </div>

              {/* Profile Details */}
              <div
                className={`flex flex-col min-w-0 transition-all duration-300 ${
                  collapsed ? "max-w-0 opacity-0" : "max-w-[130px] opacity-100"
                }`}
              >
                <p className="text-xs font-bold text-foreground truncate m-0 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground truncate m-0 mt-0.5 uppercase tracking-wide">
                  {userRole}
                </p>
              </div>
            </div>

            {/* Profile Arrow indicator */}
            <ChevronRight 
              size={13} 
              className={`text-muted-foreground/60 transition-all duration-300 shrink-0 group-hover:translate-x-0.5 ${
                collapsed ? "max-w-0 opacity-0" : "max-w-[16px] opacity-100"
              }`}
            />
          </div>
        </Link>

        {/* Sleek Search bar */}
        <div
          className={`relative flex items-center transition-all duration-300 ${
            collapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[40px] opacity-100"
          }`}
        >
          <Search size={13} className="absolute left-3.5 text-muted-foreground pointer-events-none opacity-50" />
          <input
            type="text"
            placeholder="Search dashboard..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-input/20 text-foreground placeholder-muted-foreground/60 outline-none transition-all focus:border-primary/40 focus:bg-card focus:shadow-inner"
          />
          <Keyboard size={12} className="absolute right-3.5 text-muted-foreground/40 pointer-events-none hidden sm:block" />
        </div>

        {/* Navigation links categories */}
        <div className="flex flex-col gap-4">

          {/* Main Bot Workspace */}
          <div className="flex flex-col gap-1">
            {[
              { href: "/dashboard/your-bot", label: "ThePitchly AI", icon: Sparkles },
              { href: "/dashboard/workspace", label: "Workspace Library", icon: BookOpen },
            ].map(({ href, label, icon }) => renderNavLink(href, label, icon))}
          </div>

          {/* Connections Section */}
          <div className="flex flex-col gap-1">
            <span
              className={`text-[9px] font-black text-muted-foreground/50 tracking-widest uppercase pl-3 mb-1 transition-all duration-300 ${
                collapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[16px] opacity-100"
              }`}
            >
              Connections
            </span>
            {[
              { href: "/dashboard/whatsapp", label: "WhatsApp Link", icon: MessageCircle, color: "#22c55e" },
            ].map(({ href, label, icon, color }) => renderNavLink(href, label, icon, color))}
          </div>

          {/* Tools & Outreach Section */}
          <div className="flex flex-col gap-1">
            <span
              className={`text-[9px] font-black text-muted-foreground/50 tracking-widest uppercase pl-3 mb-1 transition-all duration-300 ${
                collapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[16px] opacity-100"
              }`}
            >
              Outreach & Tools
            </span>
            {[
              { href: "/dashboard/mail", label: "Smart Inbox", icon: Mail },
              { href: "/dashboard/new", label: "New Scan", icon: FilePlus2 },
              { href: "/dashboard/followups", label: "Calls & Followups", icon: CalendarDays },
              { href: "/dashboard/expense", label: "AI Expense Logs", icon: BarChart3 },
            ].map(({ href, label, icon }) => renderNavLink(href, label, icon))}
          </div>

          {/* Quick Prompts list */}
          <div
            className={`flex flex-col gap-1.5 transition-all duration-500 overflow-hidden ${
              collapsed ? "max-h-0 opacity-0" : "max-h-[180px] opacity-100"
            }`}
          >
            <span className="text-[9px] font-black text-muted-foreground/50 tracking-widest uppercase pl-3 mb-1">
              Quick Prompts
            </span>
            <div className="flex flex-col gap-1.5 pl-1.5">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRecentItemClick(item.query)}
                  className="bg-transparent border-0 text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-input/40 cursor-pointer w-full truncate transition-all duration-200 hover:translate-x-0.5"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM SECTION ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 mt-auto pt-4 border-t border-border/40">

        {/* Theme Toggle switch */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-transparent border border-transparent text-muted-foreground hover:text-foreground hover:bg-input/60 cursor-pointer transition-all duration-200 select-none hover:translate-x-0.5 ${
            collapsed ? "justify-center" : "justify-start"
          }`}
        >
          {isDark ? (
            <>
              <Sun size={15} className="text-amber-500 shrink-0 animate-[spin_4s_linear_infinite]" />
              <span
                className={`text-xs font-semibold tracking-wide transition-all duration-300 ${
                  collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[100px] opacity-100"
                }`}
              >
                Light Mode
              </span>
            </>
          ) : (
            <>
              <Moon size={15} className="text-muted-foreground shrink-0" />
              <span
                className={`text-xs font-semibold tracking-wide transition-all duration-300 ${
                  collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[100px] opacity-100"
                }`}
              >
                Dark Mode
              </span>
            </>
          )}
        </button>

        {/* Log Out button */}
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-transparent border border-transparent text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-all duration-200 select-none hover:translate-x-0.5 ${
            collapsed ? "justify-center" : "justify-start"
          }`}
        >
          <LogOut size={15} className="shrink-0" />
          <span
            className={`text-xs font-semibold tracking-wide transition-all duration-300 ${
              collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[100px] opacity-100"
                }`}
          >
            Sign Out
          </span>
        </button>

      </div>
    </aside>
  );
}
