"use client";

/**
 * PropBot AI — Quick Action cards.
 * Freelancer-specific options with premium glassmorphism styling.
 * Shown on the empty state / home screen of the chat page.
 */

import React from "react";
import { Mail, BarChart3, Search, FileText, Calendar, Sparkles } from "lucide-react";

export interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  prompt: string;
  accentColor: string;
  bgGradient: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Mail size={20} />,
    label: "Priority Inbox",
    description: "AI-sorted emails & alerts",
    prompt: "Show me my priority inbox with AI-classified emails",
    accentColor: "#6366f1",
    bgGradient: "rgba(99,102,241,0.06)",
  },
  {
    icon: <Mail size={20} />,
    label: "Cold Pitch Client",
    description: "Write personalised outreach",
    prompt: "Help me draft a personalized cold pitch to a potential client looking for a freelance web developer",
    accentColor: "#7c3aed",
    bgGradient: "rgba(124,58,237,0.06)",
  },
  {
    icon: <Search size={20} />,
    label: "Create Job from Lead",
    description: "Paste description & analyze",
    prompt: "Here is a job description. Please create a new job post and analyze it for me:\n\n[Paste job description here]",
    accentColor: "#3b82f6",
    bgGradient: "rgba(59,130,246,0.06)",
  },
  {
    icon: <BarChart3 size={20} />,
    label: "Proposal Tracker",
    description: "Track conversion & leads",
    prompt: "Show me my proposal statistics, active rates, and lead pipeline updates",
    accentColor: "#10b981",
    bgGradient: "rgba(16,185,129,0.06)",
  },
  {
    icon: <FileText size={20} />,
    label: "Negotiate Pricing",
    description: "Rate help & invoice drafts",
    prompt: "Help me calculate a project rate and draft a payment milestone negotiation message",
    accentColor: "#f59e0b",
    bgGradient: "rgba(245,158,11,0.06)",
  },
  {
    icon: <Calendar size={20} />,
    label: "Client Follow-up",
    description: "Polite proposal reminders",
    prompt: "Help me write a polite follow-up message to a client who hasn't responded to my proposal",
    accentColor: "#ec4899",
    bgGradient: "rgba(236,72,153,0.06)",
  },
  {
    icon: <Sparkles size={20} />,
    label: "Optimize Portfolio",
    description: "Refine profile & projects",
    prompt: "Give me suggestions to optimize my freelancer profile description and portfolio projects to attract more clients",
    accentColor: "#06b6d4",
    bgGradient: "rgba(6,182,212,0.06)",
  },
];

interface QuickActionsGridProps {
  onSelect: (prompt: string) => void;
}

export default function QuickActionsGrid({ onSelect }: QuickActionsGridProps) {
  return (
    <div style={styles.grid}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          id={`propbot-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => onSelect(action.prompt)}
          style={{
            ...styles.card,
            borderColor: `${action.accentColor}25`,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = `${action.accentColor}55`;
            el.style.background = `linear-gradient(135deg, rgba(255,255,255,0.85) 0%, ${action.bgGradient} 100%)`;
            el.style.transform = "translateY(-2.5px)";
            el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.03)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = `${action.accentColor}20`;
            el.style.background = "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)";
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.01), inset 0 0 0 1px rgba(255, 255, 255, 0.6)";
          }}
        >
          <div style={{ ...styles.iconBox, color: action.accentColor, background: `${action.accentColor}12` }}>
            {action.icon}
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>{action.label}</span>
            <span style={styles.cardDesc}>{action.description}</span>
          </div>
          <div style={{ ...styles.arrow, color: action.accentColor }}>›</div>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    width: "100%",
    maxWidth: 760,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
    background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.01), inset 0 0 0 1px rgba(255, 255, 255, 0.6)",
    outline: "none",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 650,
    color: "var(--foreground)",
    textAlign: "left",
  },
  cardDesc: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  arrow: {
    fontSize: 20,
    opacity: 0.6,
    flexShrink: 0,
    lineHeight: 1,
  },
};
