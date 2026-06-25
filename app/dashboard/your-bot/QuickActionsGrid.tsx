"use client";

/**
 * PropBot AI — Quick Action cards.
 * 6 focused, high-value actions for the freelancer outreach workflow.
 * Shown on the empty state / home screen of the chat page.
 */

import React from "react";

export interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  prompt: string;
  accentColor: string;
  bgColor: string;
}

// Icons as inline SVGs so we have zero extra deps
const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="12" y1="14" x2="12" y2="18"/>
    <line x1="10" y1="16" x2="14" y2="16"/>
  </svg>
);

const IconFileText = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconBriefcase = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconInbox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);

export const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <IconMail />,
    label: "Write & Send a Gmail",
    description: "Draft, preview and send an email via Corsair",
    prompt: "Help me write and send an email via Gmail. Who should I send it to?",
    accentColor: "#6366f1",
    bgColor: "rgba(99,102,241,0.08)",
  },
  {
    icon: <IconCalendar />,
    label: "Schedule a Call",
    description: "Book a Google Meet client call with a job",
    prompt: "Schedule a client call",
    accentColor: "#7c3aed",
    bgColor: "rgba(124,58,237,0.08)",
  },
  {
    icon: <IconFileText />,
    label: "Write a Proposal",
    description: "Generate a personalised client proposal",
    prompt: "Help me write a professional proposal for a potential client. What type of project is it?",
    accentColor: "#0ea5e9",
    bgColor: "rgba(14,165,233,0.08)",
  },
  {
    icon: <IconBriefcase />,
    label: "Unapplied Jobs",
    description: "View jobs you haven't applied to yet",
    prompt: "Show me all jobs I haven't applied to yet",
    accentColor: "#10b981",
    bgColor: "rgba(16,185,129,0.08)",
  },
  {
    icon: <IconStar />,
    label: "Know Your Match Score",
    description: "Check your AI match score for any job",
    prompt: "What is my match score for the jobs in my pipeline? Show me ranked from highest to lowest.",
    accentColor: "#f59e0b",
    bgColor: "rgba(245,158,11,0.08)",
  },
  {
    icon: <IconInbox />,
    label: "Priority Inbox",
    description: "AI-classified emails — offers, interviews, leads",
    prompt: "Show me my priority inbox with AI-classified emails",
    accentColor: "#ec4899",
    bgColor: "rgba(236,72,153,0.08)",
  },
];

interface QuickActionsGridProps {
  onSelect: (prompt: string) => void;
}

export default function QuickActionsGrid({ onSelect }: QuickActionsGridProps) {
  return (
    <>
      <style>{`
        .propbot-pill-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          width: 100%;
          max-width: 720px;
          margin-top: 24px;
        }

        .propbot-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 13px;
          font-weight: 550;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          position: relative;
          outline: none;
          animation: pill-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        [data-theme="dark"] .propbot-pill {
          background: #09090b;
          border-color: #27272a;
          color: #a1a1aa;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .propbot-pill:hover {
          transform: translateY(-2px);
          color: var(--accent-color) !important;
          border-color: var(--accent-color) !important;
          background: var(--bg-color) !important;
          box-shadow: 0 6px 20px var(--glow-color);
        }

        [data-theme="dark"] .propbot-pill:hover {
          color: #ffffff !important;
          background: var(--bg-color-dark) !important;
          border-color: var(--accent-color) !important;
        }

        .propbot-pill:active {
          transform: translateY(-0.5px);
        }

        .propbot-pill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease;
        }

        .propbot-pill:hover .propbot-pill-icon {
          transform: scale(1.1) rotate(4deg);
        }

        .propbot-pill-icon svg {
          width: 14px !important;
          height: 14px !important;
        }

        @keyframes pill-fade-in {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .propbot-pill:nth-child(1) { animation-delay: 0.04s; }
        .propbot-pill:nth-child(2) { animation-delay: 0.08s; }
        .propbot-pill:nth-child(3) { animation-delay: 0.12s; }
        .propbot-pill:nth-child(4) { animation-delay: 0.16s; }
        .propbot-pill:nth-child(5) { animation-delay: 0.20s; }
        .propbot-pill:nth-child(6) { animation-delay: 0.24s; }
      `}</style>
      <div className="propbot-pill-container">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            id={`propbot-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => onSelect(action.prompt)}
            className="propbot-pill"
            style={{
              "--accent-color": action.accentColor,
              "--bg-color": action.bgColor,
              "--bg-color-dark": `${action.accentColor}18`,
              "--glow-color": `${action.accentColor}15`,
            } as React.CSSProperties}
          >
            {/* Icon */}
            <span className="propbot-pill-icon" style={{ color: action.accentColor }}>
              {action.icon}
            </span>

            {/* Label */}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
