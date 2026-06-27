"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, Sun, Moon, BookOpen, ChevronRight, 
  Plus, Settings, MessageSquare, Mail, 
  FilePlus2, CalendarDays, BarChart3, Link2, Search
} from "lucide-react";
import { useTheme } from "./theme-provider";

interface SidebarProps {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  systemRole?: string;
}

export default function Sidebar({
  onLogout,
  userName = "Your Profile",
  userRole = "IT Freelancer",
  systemRole = "USER",
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PA";

  const isActive = (href: string) => {
    if (href === "/dashboard/workspace" || href === "/dashboard/mail") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const MENU_ITEMS = [
    { label: "Workspace Library", icon: BookOpen, href: "/dashboard/workspace" },
    ...(systemRole === "SUPERADMIN" ? [
      { label: "WhatsApp Link", icon: MessageSquare, href: "/dashboard/whatsapp" },
      { label: "LinkedIn Scraper", icon: Link2, href: "/dashboard/linkedin" },
      { label: "New Scan", icon: FilePlus2, href: "/dashboard/new" },
    ] : [
      { label: "Admin Scans", icon: Search, href: "/dashboard/admin-jobs" },
    ]),
    { label: "Smart Inbox", icon: Mail, href: "/dashboard/mail" },
    { label: "Calls & Followups", icon: CalendarDays, href: "/dashboard/followups" },
    { label: "AI Expense Logs", icon: BarChart3, href: "/dashboard/expense" },
  ];

  const renderSidebarItem = (
    label: string, 
    Icon: React.ComponentType<any>, 
    active: boolean, 
    href: string
  ) => {
    const content = (
      <>
        {/* Active side indicator */}
        {active && (
          <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-primary rounded-r-md transition-all duration-200" />
        )}
        
        {/* Icon */}
        <Icon 
          size={14} 
          className="shrink-0 transition-transform duration-200 group-hover:scale-105" 
          style={{ color: active ? "var(--sidebar-item-icon-active)" : "var(--sidebar-item-icon)" }} 
        />
        
        {!collapsed && (
          <span 
            className={`text-[11.5px] font-medium tracking-wide truncate transition-colors duration-150 ${
              active 
                ? "font-bold text-current" 
                : "text-muted-foreground/80 group-hover:text-foreground"
            }`}
          >
            {label}
          </span>
        )}
      </>
    );

    const classes = `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 select-none cursor-pointer sidebar-item-container ${
      collapsed ? "justify-center" : "justify-start"
    } ${
      active ? "sidebar-item-active" : ""
    }`;

    return (
      <Link 
        key={href} 
        href={href} 
        className={classes} 
        title={collapsed ? label : undefined}
      >
        {content}
      </Link>
    );
  };

  return (
    <aside
      className={`pitchly-sidebar h-full flex flex-col justify-between p-4 shrink-0 z-20 ${
        collapsed ? "w-[76px] px-2.5" : "w-[260px]"
      }`}
    >
      <style>{`
        .pitchly-sidebar {
          border-radius: 20px;
          border: 1px solid var(--sidebar-border-color);
          background: var(--sidebar-background-gradient);
          box-shadow: var(--sidebar-box-shadow);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        :root {
          --sidebar-border-color: rgba(0, 0, 0, 0.05);
          --sidebar-background-gradient: rgba(255, 255, 255, 0.45);
          --sidebar-box-shadow: 0 8px 32px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.5);
          
          --sidebar-btn-bg: rgba(255, 255, 255, 0.4);
          --sidebar-btn-hover-bg: rgba(255, 255, 255, 0.7);
          --sidebar-btn-border: rgba(0, 0, 0, 0.05);
          --sidebar-btn-text: var(--foreground);
          --sidebar-btn-text-hover: var(--foreground);

          --sidebar-item-active-bg: rgba(0, 0, 0, 0.04);
          --sidebar-item-active-text: var(--foreground);
          --sidebar-item-active-border: rgba(0, 0, 0, 0.02);
          --sidebar-item-active-shadow: none;

          --sidebar-item-text: var(--muted-foreground);
          --sidebar-item-text-hover: var(--foreground);
          --sidebar-item-icon: var(--muted-foreground);
          --sidebar-item-icon-active: var(--foreground);

          --sidebar-new-chat-bg: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          --sidebar-new-chat-border: transparent;
          --sidebar-new-chat-text: #ffffff;
          --sidebar-new-chat-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
          
          --sidebar-new-chat-hover-bg: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
          --sidebar-new-chat-hover-text: #ffffff;
          --sidebar-new-chat-hover-border: transparent;
          --sidebar-new-chat-hover-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
        }

        [data-theme="dark"] {
          --sidebar-border-color: rgba(255, 255, 255, 0.06);
          --sidebar-background-gradient: rgba(9, 9, 11, 0.55);
          --sidebar-box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          
          --sidebar-btn-bg: rgba(255, 255, 255, 0.02);
          --sidebar-btn-hover-bg: rgba(255, 255, 255, 0.06);
          --sidebar-btn-border: rgba(255, 255, 255, 0.06);
          --sidebar-btn-text: var(--muted-foreground);
          --sidebar-btn-text-hover: var(--foreground);

          --sidebar-item-active-bg: rgba(255, 255, 255, 0.06);
          --sidebar-item-active-text: var(--foreground);
          --sidebar-item-active-border: rgba(255, 255, 255, 0.04);
          --sidebar-item-active-shadow: none;

          --sidebar-item-text: var(--muted-foreground);
          --sidebar-item-text-hover: var(--foreground);
          --sidebar-item-icon: var(--muted-foreground);
          --sidebar-item-icon-active: var(--foreground);

          --sidebar-new-chat-bg: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          --sidebar-new-chat-border: transparent;
          --sidebar-new-chat-text: #ffffff;
          --sidebar-new-chat-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          
          --sidebar-new-chat-hover-bg: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
          --sidebar-new-chat-hover-text: #ffffff;
          --sidebar-new-chat-hover-border: transparent;
          --sidebar-new-chat-hover-shadow: 0 6px 25px rgba(99, 102, 241, 0.35);
        }

        .sidebar-item-container {
          position: relative;
          color: var(--sidebar-item-text);
          transition: all 0.2s ease !important;
        }
        .sidebar-item-container:hover {
          color: var(--sidebar-item-text-hover) !important;
          background: var(--sidebar-btn-hover-bg) !important;
        }

        .sidebar-item-container:not(.sidebar-item-active)::before {
          display: none;
        }

        .sidebar-item-active {
          background: var(--sidebar-item-active-bg) !important;
          color: var(--sidebar-item-active-text) !important;
          border: 1px solid var(--sidebar-item-active-border) !important;
          box-shadow: var(--sidebar-item-active-shadow) !important;
        }

        .sidebar-new-chat-btn {
          position: relative;
          z-index: 1;
          background: var(--sidebar-new-chat-bg) !important;
          border: 1px solid var(--sidebar-new-chat-border) !important;
          color: var(--sidebar-new-chat-text) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          overflow: hidden;
          box-shadow: var(--sidebar-new-chat-shadow) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .sidebar-new-chat-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transform: skewX(-25deg);
          transition: none;
          z-index: 2;
        }

        .sidebar-new-chat-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          background: var(--sidebar-new-chat-hover-bg);
          opacity: 0;
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: inherit;
        }

        .sidebar-new-chat-btn:hover::before {
          left: 150%;
          transition: all 0.75s ease-in-out;
        }

        .sidebar-new-chat-btn:hover::after {
          opacity: 1;
        }

        .sidebar-new-chat-btn:hover {
          color: var(--sidebar-new-chat-hover-text) !important;
          border-color: var(--sidebar-new-chat-hover-border) !important;
          transform: translateY(-1px);
          box-shadow: var(--sidebar-new-chat-hover-shadow) !important;
        }

        .sidebar-new-chat-btn:active {
          transform: translateY(-0.5px) scale(0.97);
        }

        .sidebar-new-chat-btn .btn-icon {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar-new-chat-btn:hover .btn-icon {
          transform: rotate(90deg) scale(1.1);
        }
        
        .sidebar-profile-pill {
          background: var(--sidebar-btn-bg) !important;
          border: 1px solid var(--sidebar-btn-border) !important;
          color: var(--sidebar-btn-text) !important;
          transition: all 0.2s ease;
        }
        .sidebar-profile-pill:hover {
          background: var(--sidebar-btn-hover-bg) !important;
          color: var(--sidebar-btn-text-hover) !important;
          transform: translateY(-1px);
          border-color: var(--sidebar-btn-border) !important;
        }
      `}</style>

      {/* ── TOP SECTION ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 overflow-hidden h-[82%]">

        {/* Brand header */}
        <div className="flex items-center justify-between min-h-[36px] px-1 shrink-0">
          {/* Logo & Text */}
          <div className="flex items-center gap-2 overflow-hidden">
            {!collapsed ? (
              <div className="flex items-center gap-2 pl-1 py-1 select-none">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-extrabold shadow-md shrink-0">
                  P
                </div>
                <span className="font-extrabold text-[18px] tracking-tight text-foreground font-sans">
                  Pitchly
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                  Pro
                </span>
              </div>
            ) : (
              <div 
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-sm shadow-md select-none cursor-pointer hover:opacity-90 shrink-0"
                onClick={() => setCollapsed(false)}
              >
                P
              </div>
            )}
          </div>

          {/* Toggle Expand / Collapse button */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-7 h-7 rounded-full bg-slate-200/40 dark:bg-slate-800/40 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-90 shrink-0 border-0"
          >
            <span
              className="flex items-center justify-center transition-transform duration-300"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
            >
              <ChevronRight size={13} />
            </span>
          </button>
        </div>

        {/* Pitchly Chat row */}
        <div className="shrink-0">
          {!collapsed ? (
            <div className="flex px-1">
              <button
                onClick={() => router.push("/dashboard/your-bot?new=true")}
                className="sidebar-new-chat-btn w-full py-2.5 px-4 rounded-full font-sans font-semibold text-[13px] tracking-wide cursor-pointer"
              >
                <Plus size={14} className="btn-icon shrink-0" strokeWidth={2.5} />
                <span>Pitchly</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                onClick={() => router.push("/dashboard/your-bot?new=true")}
                className="sidebar-new-chat-btn w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
                title="Pitchly"
              >
                <Plus size={14} className="btn-icon shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable list of items */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-2 scrollbar-none">
          {/* Main Navigation Links */}
          <div className="flex flex-col gap-1">
            {!collapsed && (
              <span className="text-[9px] font-black text-muted-foreground/45 tracking-widest uppercase pl-3 mb-1">
                Workspace
              </span>
            )}
            
            {MENU_ITEMS.map((item) => {
              const active = isActive(item.href);
              return renderSidebarItem(
                item.label,
                item.icon,
                active,
                item.href
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
        
        {/* Toggle Theme / Settings / Sign Out row */}
        {!collapsed ? (
          <>
            <div className="flex items-center justify-around px-2 py-1 text-muted-foreground border-b border-slate-200/30 dark:border-slate-800/30 pb-2.5 mb-1.5">
              <button 
                onClick={toggleTheme} 
                className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-foreground cursor-pointer transition-colors" 
                title="Toggle Theme"
              >
                {theme === "light" ? <Moon size={13.5} /> : <Sun size={13.5} />}
              </button>
              
              <Link 
                href="/dashboard/settings" 
                className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-foreground cursor-pointer transition-colors" 
                title="Settings"
              >
                <Settings size={13.5} />
              </Link>
              
              <button 
                onClick={onLogout} 
                className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-red-500 cursor-pointer transition-colors" 
                title="Sign Out"
              >
                <LogOut size={13.5} />
              </button>
            </div>

            {/* Profile Pill */}
            <div
              onClick={() => router.push("/dashboard/profile")}
              className="sidebar-profile-pill flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar circle */}
                <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 relative shadow-sm">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11px] font-bold text-foreground truncate">
                    {userName}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate">
                    {userRole || "Freelancer"}
                  </span>
                </div>
              </div>
              <ChevronRight size={11} className="text-muted-foreground/60 shrink-0" />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2.5 items-center py-1 text-muted-foreground border-b border-slate-200/30 dark:border-slate-800/30 pb-2 mb-1">
            <button 
              onClick={toggleTheme} 
              className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-foreground cursor-pointer transition-colors" 
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon size={13.5} /> : <Sun size={13.5} />}
            </button>
            
            <Link 
              href="/dashboard/settings" 
              className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-foreground cursor-pointer transition-colors" 
              title="Settings"
            >
              <Settings size={13.5} />
            </Link>
            
            <button 
              onClick={onLogout} 
              className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-red-500 cursor-pointer transition-colors" 
              title="Sign Out"
            >
              <LogOut size={13.5} />
            </button>

            <div className="w-full border-t border-slate-200/20 dark:border-slate-800/20 my-1" />

            <div
              onClick={() => router.push("/dashboard/profile")}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold cursor-pointer hover:opacity-90 transition-opacity"
              title={userName}
            >
              {initials}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
