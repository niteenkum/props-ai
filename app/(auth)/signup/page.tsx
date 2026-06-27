"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Eye, EyeOff, Lock, Mail, Loader2, User, Briefcase, Globe,
  ArrowRight, ArrowLeft, Search, X, ChevronDown, ShieldCheck, RotateCcw, Check, Sun, Moon,
} from "lucide-react";
import { useSignupForm } from "../../hooks/useSignupForm";
import { useLoginForm } from "../../hooks/useLoginForm";
import { useTheme } from "../../components/theme-provider";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const catColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Frontend:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" },
  Backend:   { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" },
  Mobile:    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  Database:  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  DevOps:    { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", dot: "#0ea5e9" },
  "AI/ML":   { bg: "#fef3c7", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
  Design:    { bg: "#fdf2f8", border: "#fbcfe8", text: "#9d174d", dot: "#ec4899" },
  Testing:   { bg: "#f7fee7", border: "#d9f99d", text: "#3f6212", dot: "#84cc16" },
  General:   { bg: "#f5f5f5", border: "#e0e0e0", text: "#555",    dot: "#999"    },
};

const getCatColor = (category: string, isDark: boolean) => {
  const defaults = catColors[category] || catColors.General;
  if (!isDark) return defaults;
  
  const darkVariants: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    Frontend:  { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa", dot: "#3b82f6" },
    Backend:   { bg: "rgba(34, 197, 94, 0.15)",  border: "rgba(34, 197, 94, 0.3)",  text: "#4ade80", dot: "#22c55e" },
    Mobile:    { bg: "rgba(249, 115, 22, 0.15)",  border: "rgba(249, 115, 22, 0.3)",  text: "#fb923c", dot: "#f97316" },
    Database:  { bg: "rgba(168, 85, 247, 0.15)",  border: "rgba(168, 85, 247, 0.3)",  text: "#c084fc", dot: "#a855f7" },
    DevOps:    { bg: "rgba(14, 165, 233, 0.15)",  border: "rgba(14, 165, 233, 0.3)",  text: "#38bdf8", dot: "#0ea5e9" },
    "AI/ML":   { bg: "rgba(245, 158, 11, 0.15)",  border: "rgba(245, 158, 11, 0.3)",  text: "#fbbf24", dot: "#f59e0b" },
    Design:    { bg: "rgba(236, 72, 153, 0.15)",  border: "rgba(236, 72, 153, 0.3)",  text: "#f472b6", dot: "#ec4899" },
    Testing:   { bg: "rgba(132, 204, 22, 0.15)",  border: "rgba(132, 204, 22, 0.3)",  text: "#a3e635", dot: "#84cc16" },
    General:   { bg: "rgba(255, 255, 255, 0.05)", border: "rgba(255, 255, 255, 0.1)", text: "#ccc",    dot: "#999"    },
  };
  return darkVariants[category] || darkVariants.General;
};

const RoughRect = ({ x, y, width, height, stroke = "currentColor", fill = "none", className = "" }: any) => {
  const offset = 1.5;
  const p1 = `M ${x - offset} ${y + offset} L ${x + width + offset} ${y - offset/2}`;
  const p2 = `M ${x + width - offset/2} ${y - offset} L ${x + width + offset} ${y + height + offset}`;
  const p3 = `M ${x + width + offset} ${y + height - offset/2} L ${x - offset} ${y + height + offset/2}`;
  const p4 = `M ${x - offset/2} ${y + height + offset} L ${x + offset/2} ${y - offset}`;
  
  return (
    <g className={className}>
      <path d={p1} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d={p2} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d={p3} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d={p4} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      {fill !== "none" && (
        <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} stroke="none" />
      )}
    </g>
  );
};

const RoughArrow = ({ x1, y1, x2, y2, stroke = "var(--muted-foreground)", label = "", className = "" }: any) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 10;
  const pathData = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  
  const angle = Math.atan2(y2 - my, x2 - mx);
  const headLength = 10;
  const arrowHead1X = x2 - headLength * Math.cos(angle - Math.PI / 6);
  const arrowHead1Y = y2 - headLength * Math.sin(angle - Math.PI / 6);
  const arrowHead2X = x2 - headLength * Math.cos(angle + Math.PI / 6);
  const arrowHead2Y = y2 - headLength * Math.sin(angle + Math.PI / 6);
  
  return (
    <g className={className}>
      <path d={pathData} stroke={stroke} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="3 3" opacity="0.75" />
      <path d={`M ${arrowHead1X} ${arrowHead1Y} L ${x2} ${y2} L ${arrowHead2X} ${arrowHead2Y}`} stroke={stroke} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      {label && (
        <text x={mx} y={my - 6} fill="var(--muted-foreground)" fontSize="11" fontFamily="var(--handwriting-font)" textAnchor="middle" style={{ letterSpacing: "0.5px" }}>
          {label}
        </text>
      )}
    </g>
  );
};

const SparkleStar = ({ x, y, size, color, className = "" }: any) => {
  const path = `M ${x} ${y - size} Q ${x} ${y} ${x + size} ${y} Q ${x} ${y} ${x} ${y + size} Q ${x} ${y} ${x - size} ${y} Q ${x} ${y} ${x} ${y - size} Z`;
  return (
    <path d={path} fill={color} stroke="none" className={className} />
  );
};

function ExcalidrawDiagram() {
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
      <svg
        viewBox="0 0 600 700"
        style={{
          width: "100%",
          maxHeight: "85vh",
          color: "var(--foreground)",
          overflow: "visible",
        }}
      >
        {/* Header */}
        <text
          x="300"
          y="45"
          textAnchor="middle"
          style={{
            fontFamily: "var(--handwriting-font)",
            fontSize: "26px",
            fontWeight: "bold",
            fill: "var(--foreground)",
          }}
        >
          How PropAI Automates Outreach
        </text>
        {/* Double underline under header */}
        <path
          d="M 120 60 Q 300 68 480 60"
          stroke="var(--foreground)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 140 68 Q 300 74 460 68"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* 1. Job Card (Top Left) */}
        <g
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredNode("job")}
          onMouseLeave={() => setHoveredNode(null)}
          transform="translate(50, 110)"
        >
          <g className={hoveredNode === "job" ? "wiggle" : "float-slow"}>
            <RoughRect
              x={0}
              y={0}
              width={220}
              height={130}
              fill="var(--blue-fill)"
              stroke={hoveredNode === "job" ? "#3b82f6" : "var(--foreground)"}
            />
            <g transform="translate(15, 20)" style={{ fontFamily: "var(--handwriting-font)", fontSize: "13px" }}>
              <text x="0" y="10" fontWeight="bold" fontSize="15" fill="#3b82f6">💼 Scraped Job</text>
              <text x="0" y="32">Role: React Dev</text>
              <text x="0" y="52">Company: Stripe</text>
              <text x="0" y="72">Match: Calculating...</text>
              <rect x="110" y="60" width="30" height="15" rx="4" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1" />
              <text x="125" y="71" fontSize="9" textAnchor="middle" fontWeight="bold" fill="#3b82f6">HOT</text>
            </g>
          </g>
        </g>

        {/* Arrow 1: Job to AI */}
        <RoughArrow
          x1={250}
          y1={245}
          x2={340}
          y2={270}
          label="Analyze Fit"
          className="float-medium"
        />

        {/* 2. AI Analyzer (Center Right) */}
        <g
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredNode("ai")}
          onMouseLeave={() => setHoveredNode(null)}
          transform="translate(330, 260)"
        >
          <g className={hoveredNode === "ai" ? "wiggle" : "float-medium"}>
            <RoughRect
              x={0}
              y={0}
              width={220}
              height={140}
              fill="var(--purple-fill)"
              stroke={hoveredNode === "ai" ? "#a855f7" : "var(--foreground)"}
            />
            <g transform="translate(15, 20)" style={{ fontFamily: "var(--handwriting-font)", fontSize: "13px" }}>
              <text x="0" y="12" fontWeight="bold" fontSize="15" fill="#a855f7">🧠 PropAI Gemini</text>
              <text x="0" y="34">✔ Role Match: 95%</text>
              <text x="0" y="54">✔ Found Skills: 8/9</text>
              <text x="0" y="74" fill="#ef4444" fontWeight="bold">⚠ Missing: Framer Motion</text>
              <text x="0" y="94" fontWeight="bold" fill="#22c55e">Candidacy Fit: 96%! 🚀</text>
            </g>
          </g>
          <SparkleStar x={-15} y={-10} size={10} color="#fbbf24" className="spin-slow" />
          <SparkleStar x={235} y={130} size={12} color="#a855f7" className="float-slow" />
        </g>

        {/* Arrow 2: AI to Outreach */}
        <RoughArrow
          x1={400}
          y1={410}
          x2={280}
          y2={470}
          label="Personalize"
          className="float-slow"
        />

        {/* 3. Outreach Card (Bottom Left) */}
        <g
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredNode("outreach")}
          onMouseLeave={() => setHoveredNode(null)}
          transform="translate(50, 430)"
        >
          <g className={hoveredNode === "outreach" ? "wiggle" : "float-slow"}>
            <RoughRect
              x={0}
              y={0}
              width={220}
              height={140}
              fill="var(--green-fill)"
              stroke={hoveredNode === "outreach" ? "#22c55e" : "var(--foreground)"}
            />
            <g transform="translate(15, 20)" style={{ fontFamily: "var(--handwriting-font)", fontSize: "13px" }}>
              <text x="0" y="12" fontWeight="bold" fontSize="15" fill="#22c55e">✉ Outreach Template</text>
              <text x="0" y="34">Subject: scaling stripe...</text>
              <text x="0" y="54">"Since I recently built</text>
              <text x="0" y="72">Pitchly with Next.js..."</text>
              <rect x="0" y="85" width="95" height="24" rx="6" fill="#22c55e" stroke="none" />
              <text x="47.5" y="101" fill="#fff" fontWeight="bold" fontSize="11" textAnchor="middle">Send with Gmail</text>
            </g>
          </g>
        </g>

        {/* 4. Sticky note (Bottom Right) */}
        <g transform="translate(330, 480)">
          <g className="float-medium">
            <RoughRect
              x={0}
              y={0}
              width={200}
              height={110}
              fill="var(--yellow-fill)"
              stroke="var(--foreground)"
            />
            <circle cx="100" cy="0" r="6" fill="#ef4444" stroke="var(--foreground)" strokeWidth="1.5" />
            <g transform="translate(15, 25)" style={{ fontFamily: "var(--handwriting-font)", fontSize: "13px", fill: "var(--foreground)" }}>
              <text x="0" y="10" fontWeight="bold">💡 Why use PropAI?</text>
              <text x="0" y="30">• 95% Match rating</text>
              <text x="0" y="50">• Zero manual typing</text>
              <text x="0" y="70">• Saves 10+ hours/week</text>
            </g>
          </g>
        </g>

        {/* Small decorations */}
        <path
          d="M 500 130 C 530 110, 560 140, 520 160 C 500 170, 480 150, 510 130"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
        <text
          x="535"
          y="180"
          textAnchor="middle"
          style={{
            fontFamily: "var(--handwriting-font)",
            fontSize: "11px",
            fill: "var(--muted-foreground)",
            opacity: 0.7,
          }}
        >
          Fully Automated
        </text>
      </svg>
    </div>
  );
}

export default function SignupPage() {
  return <UnifiedAuthPage initialMode="signup" />;
}

export function UnifiedAuthPage({ initialMode = "signup" }: { initialMode?: "signup" | "signin" }) {
  const router = useRouter();
  const signupForm = useSignupForm();
  const loginForm = useLoginForm();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [authMode, setAuthMode] = React.useState<"signup" | "signin">(initialMode);

  const isOtp = authMode === "signup" && signupForm.step === "otp";

  const handleSwitchMode = (mode: "signup" | "signin") => {
    setAuthMode(mode);
    signupForm.setError("");
    loginForm.setError("");
    window.history.pushState(null, "", mode === "signup" ? "/signup" : "/login");
  };

  const activeError = authMode === "signup" ? signupForm.error : loginForm.error;
  const activeLoading = authMode === "signup" ? signupForm.loading : loginForm.loading;

  return (
    <>
      {/* Import Hand-drawn / Sketch Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />

      <style>{`
        :root {
          --handwriting-font: 'Caveat', 'Architects Daughter', cursive;
          --blue-fill: rgba(59, 130, 246, 0.04);
          --purple-fill: rgba(168, 85, 247, 0.04);
          --green-fill: rgba(34, 197, 94, 0.04);
          --yellow-fill: rgba(234, 179, 8, 0.04);
        }
        .sp-container {
          display: flex; min-height: 100vh; background: var(--background);
          transition: background 0.3s ease, color 0.3s ease;
        }
        .sp-left {
          flex: 1; display: flex; align-items: center; justify-content: center;
          border-right: 2.5px dashed var(--foreground); padding: 40px; position: relative;
          background-image: radial-gradient(var(--border) 1.5px, transparent 1.5px);
          background-size: 24px 24px;
        }
        .sp-right {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 40px; position: relative;
        }
        @media (max-width: 968px) {
          .sp-container { flex-direction: column; }
          .sp-left { display: none; }
          .sp-right { width: 100%; min-height: 100vh; padding: 24px 16px; }
        }
        .sp-back {
          position: absolute; top: 24px; left: 24px; display: flex; align-items: center; gap: 6px;
          color: var(--foreground); font-size: 14px; font-weight: bold; background: var(--card);
          border: 2px solid var(--foreground); border-radius: 6px; padding: 6px 12px;
          cursor: pointer; transition: all 0.15s ease; box-shadow: 2px 2px 0px 0px var(--foreground);
          font-family: var(--handwriting-font);
        }
        .sp-back:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0px 0px var(--foreground); }
        .sp-back-mobile {
          display: none;
        }
        @media (max-width: 968px) {
          .sp-back-mobile {
            position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 6px;
            color: var(--foreground); font-size: 14px; font-weight: bold; background: var(--card);
            border: 2px solid var(--foreground); border-radius: 6px; padding: 6px 12px;
            cursor: pointer; transition: all 0.15s ease; box-shadow: 2px 2px 0px 0px var(--foreground);
            font-family: var(--handwriting-font);
          }
        }
        .sp-card {
          width: 100%; background: var(--card); border-radius: 8px;
          border: 2.5px solid var(--foreground); box-shadow: 6px 6px 0px 0px var(--foreground);
          padding: 32px 24px; max-width: 440px; transition: all 0.3s ease;
        }
        .sp-brand { text-align: center; margin-bottom: 24px; }
        .sp-logo {
          width: 44px; height: 44px; border-radius: 8px; background: var(--primary);
          display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;
          border: 2px solid var(--foreground); box-shadow: 3px 3px 0px 0px var(--foreground);
        }
        .sp-error {
          margin-bottom: 16px; padding: 10px 14px; border-radius: 6px;
          background: #fef2f2; border: 2px solid #dc2626; color: #dc2626;
          font-size: 13px; text-align: center; font-weight: 600; font-family: var(--handwriting-font);
        }
        .sp-field { display: flex; flex-direction: column; gap: 5px; }
        .sp-field label { font-size: 14px; font-weight: bold; color: var(--foreground); font-family: var(--handwriting-font); }
        .sp-fw { position: relative; }
        .sp-fi {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          width: 16px; height: 16px; color: var(--foreground); opacity: 0.55; pointer-events: none;
        }
        .sp-input {
          width: 100%; box-sizing: border-box; padding: 13px 14px 13px 40px;
          border-radius: 6px; border: 2px solid var(--foreground); background: var(--input);
          color: var(--foreground); font-size: 14px; outline: none;
          font-family: inherit; -webkit-appearance: none;
          box-shadow: 3px 3px 0px 0px var(--foreground);
        }
        .sp-input:focus { border-color: var(--primary); }
        .sp-input.pr { padding-right: 42px; }
        .sp-pwtoggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--foreground); opacity: 0.8; padding: 4px; display: flex;
        }
        .sp-pwtoggle:hover { color: var(--primary); }
        .sp-btn {
          width: 100%; padding: 13px 0; border-radius: 6px; border: 2.5px solid var(--foreground);
          background: var(--foreground); color: var(--background); font-size: 14px; font-weight: bold;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 8px; transition: all 0.15s ease; font-family: var(--handwriting-font); -webkit-appearance: none;
          box-shadow: 3px 3px 0px 0px var(--border);
        }
        .sp-btn:hover:not(:disabled) { transform: translate(-1.5px, -1.5px); box-shadow: 4.5px 4.5px 0px 0px var(--border); }
        .sp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sp-google-btn {
          width: 100%; padding: 12px 0; border-radius: 6px; border: 2.5px solid var(--foreground);
          background: var(--card); color: var(--foreground); font-size: 14px; font-weight: bold;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: all 0.15s ease; font-family: var(--handwriting-font); -webkit-appearance: none;
          box-shadow: 3px 3px 0px 0px var(--foreground);
        }
        .sp-google-btn:hover { transform: translate(-1.5px, -1.5px); box-shadow: 4.5px 4.5px 0px 0px var(--foreground); background: var(--input); }
        .sp-switch { text-align: center; margin-top: 18px; font-size: 13px; color: var(--muted-foreground); font-family: var(--handwriting-font); font-weight: 500; }
        .sp-switch button {
          background: none; border: none; color: var(--foreground); font-weight: bold;
          cursor: pointer; font-size: 13px; text-decoration: underline; text-underline-offset: 3px; font-family: var(--handwriting-font);
        }
        .sp-chip {
          display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
          border-radius: 20px; font-size: 11px; font-weight: 700; border: 1.5px solid var(--border);
          text-transform: uppercase; letter-spacing: 0.3px;
        }
        .sp-skills-trigger {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-radius: 6px; border: 2px solid var(--foreground);
          background: var(--card); cursor: pointer; transition: all 0.2s;
          box-shadow: 2px 2px 0px 0px var(--border);
        }
        .sp-skills-trigger:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0px 0px var(--border); }
        .sp-skills-trigger.open { border-color: var(--primary); }
        .sp-otp-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 22px; }
        .sp-otp-box {
          width: 100%; height: 50px; text-align: center; font-size: 20px; font-weight: bold;
          border: 2px solid var(--foreground); border-radius: 6px; background: var(--card);
          color: var(--foreground); outline: none; transition: all 0.2s;
          box-shadow: 2.5px 2.5px 0px 0px var(--foreground);
        }
        .sp-otp-box:focus { border-color: var(--primary); box-shadow: 4px 4px 0px 0px var(--primary); transform: translate(-1px, -1px); }
        @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sp-spin { animation: sp-spin 0.8s linear infinite; }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(-1deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-0.5deg); }
          50% { transform: rotate(0.5deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .float-slow { animation: float-slow 6s ease-in-out infinite; }
        .float-medium { animation: float-medium 4s ease-in-out infinite; }
        .wiggle { animation: wiggle 0.4s ease-in-out infinite; }
        .spin-slow { animation: spin-slow 12s linear infinite; }
        @keyframes fade-in-slide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .lp-divider {
          display: flex; align-items: center; gap: 12px; margin: 20px 0;
          color: var(--foreground); font-size: 12px; font-weight: bold; text-transform: uppercase;
          font-family: var(--handwriting-font);
        }
        .lp-divider span { flex: 1; height: 1.5px; background: var(--border); }
      `}</style>

      <div className="sp-container">
        {/* Left Section - Excalidraw Diagrams */}
        <div className="sp-left">
          <button onClick={() => router.push("/")} className="sp-back">
            <ArrowLeft style={{ width: 15, height: 15 }} />
            Back
          </button>
          <ExcalidrawDiagram />
        </div>

        {/* Right Section - Auth Card */}
        <div className="sp-right">
          <button onClick={() => router.push("/")} className="sp-back-mobile">
            <ArrowLeft style={{ width: 15, height: 15 }} />
            Back
          </button>

          {/* Floating Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: 6,
              border: "2px solid var(--foreground)",
              background: "var(--card)",
              color: "var(--foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 50,
              boxShadow: "2px 2px 0px 0px var(--foreground)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--input)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon style={{ width: 16, height: 16 }} />
            ) : (
              <Sun style={{ width: 16, height: 16 }} />
            )}
          </button>

          <div className="sp-card">
            {/* Brand */}
            <div className="sp-brand">
              <div className="sp-logo">
                <Sparkles style={{ width: 20, height: 20, color: "var(--primary-foreground)" }} />
              </div>
              <h1>Prop<span style={{ color: "var(--muted-foreground)" }}>AI</span></h1>
              <p>
                {isOtp
                  ? "Check your inbox"
                  : authMode === "signup"
                  ? "Create your account"
                  : "Welcome back"}
              </p>
            </div>

            {/* Error */}
            {activeError && <div className="sp-error">{activeError}</div>}

            {/* ── OTP VERIFICATION ────────────────────────────────────────────── */}
            {isOtp ? (
              <form onSubmit={signupForm.handleOtpSubmit} className="animate-fade-in">
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 8, background: "var(--input)", border: "2px solid var(--foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "2px 2px 0px 0px var(--foreground)" }}>
                    <ShieldCheck style={{ width: 28, height: 28, color: "var(--foreground)" }} />
                  </div>
                  <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0, fontFamily: "var(--handwriting-font)", fontWeight: 500 }}>
                    We emailed a 6-digit code to
                  </p>
                  <p style={{ fontSize: 15, fontWeight: "bold", color: "var(--foreground)", margin: "2px 0 0", fontFamily: "var(--handwriting-font)" }}>{signupForm.email}</p>
                </div>

                <div className="sp-otp-grid">
                  {signupForm.otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { signupForm.otpRefs.current[idx] = el; }}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit} className="sp-otp-box"
                      onChange={e => signupForm.handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => { if (e.key === "Backspace" && !signupForm.otp[idx] && idx > 0) signupForm.otpRefs.current[idx - 1]?.focus(); }}
                      onPaste={idx === 0 ? signupForm.handleOtpPaste : undefined}
                      style={{ borderColor: digit ? "var(--foreground)" : undefined, background: digit ? "var(--input)" : undefined }}
                    />
                  ))}
                </div>

                <button type="submit" className="sp-btn" disabled={signupForm.otpLoading || signupForm.otp.join("").length < 6}>
                  {signupForm.otpLoading
                    ? <><Loader2 className="sp-spin" style={{ width: 15, height: 15 }} /><span>Verifying...</span></>
                    : <><Check style={{ width: 16, height: 16 }} /><span>Verify & Create Account</span></>}
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                  <button type="button"
                    onClick={() => { signupForm.setStep("form"); signupForm.setError(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "var(--handwriting-font)" }}>
                    <ArrowLeft style={{ width: 13, height: 13 }} /> Edit details
                  </button>
                  <button type="button" onClick={signupForm.handleResend} disabled={signupForm.resendCooldown > 0}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: signupForm.resendCooldown > 0 ? "var(--border)" : "var(--foreground)", fontSize: 13, fontWeight: "bold", cursor: signupForm.resendCooldown > 0 ? "not-allowed" : "pointer", textDecoration: signupForm.resendCooldown > 0 ? "none" : "underline", textUnderlineOffset: 3, fontFamily: "var(--handwriting-font)" }}>
                    <RotateCcw style={{ width: 12, height: 12 }} />
                    {signupForm.resendCooldown > 0 ? `Resend in ${signupForm.resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            ) : (
              /* CUSTOM EMAIL FORM (SIGN UP OR SIGN IN) */
              <form onSubmit={authMode === "signup" ? signupForm.handleFormSubmit : loginForm.handleSubmit} className="animate-fade-in">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {authMode === "signup" && (
                    <div className="sp-field">
                      <label>Full Name</label>
                      <div className="sp-fw">
                        <input className="sp-input" type="text" required value={signupForm.name}
                          onChange={e => signupForm.setName(e.target.value)} placeholder="Your full name" />
                        <User className="sp-fi" />
                      </div>
                    </div>
                  )}

                  <div className="sp-field">
                    <label>Email Address</label>
                    <div className="sp-fw">
                      <input
                        className="sp-input"
                        type="email"
                        required
                        value={authMode === "signup" ? signupForm.email : loginForm.email}
                        onChange={e => authMode === "signup" ? signupForm.setEmail(e.target.value) : loginForm.setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                      <Mail className="sp-fi" />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label>Password</label>
                    <div className="sp-fw">
                      <input
                        className="sp-input pr"
                        type={
                          authMode === "signup"
                            ? signupForm.showPassword ? "text" : "password"
                            : loginForm.showPassword ? "text" : "password"
                        }
                        required
                        value={authMode === "signup" ? signupForm.password : loginForm.password}
                        onChange={e => authMode === "signup" ? signupForm.setPassword(e.target.value) : loginForm.setPassword(e.target.value)}
                        placeholder={authMode === "signup" ? "Min. 6 characters" : "••••••••"}
                      />
                      <Lock className="sp-fi" />
                      <button
                        type="button"
                        className="sp-pwtoggle"
                        onClick={() =>
                          authMode === "signup"
                            ? signupForm.setShowPassword(!signupForm.showPassword)
                            : loginForm.setShowPassword(!loginForm.showPassword)
                        }
                      >
                        {authMode === "signup" ? (
                          signupForm.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />
                        ) : (
                          loginForm.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" className="sp-btn" disabled={activeLoading} style={{ marginTop: 22 }}>
                  {activeLoading ? (
                    <>
                      <Loader2 className="sp-spin" style={{ width: 15, height: 15 }} />
                      <span>{authMode === "signup" ? "Sending code..." : "Signing in..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{authMode === "signup" ? "Continue — Verify Email" : "Sign In"}</span>
                      <ArrowRight style={{ width: 15, height: 15 }} />
                    </>
                  )}
                </button>

                <div className="lp-divider" style={{ margin: "20px 0 16px" }}>
                  <span></span>
                  or
                  <span></span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/api/mail/gmail/connect?flow=auth";
                  }}
                  className="sp-google-btn"
                  style={{ padding: "14px 0" }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 8 }}>
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.98 1 12 1 7.35 1 3.37 3.68 1.48 7.6l3.86 3C6.27 7.74 8.89 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.47c-.28 1.48-1.12 2.74-2.38 3.59l3.7 2.87c2.16-1.99 3.4-4.92 3.4-8.56z" />
                    <path fill="#FBBC05" d="M5.34 14.6c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28l-3.86-3C.72 8.44 0 10.14 0 12s.72 3.56 1.48 4.96l3.86-3.36z" />
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.11 0-5.73-2.7-6.66-5.56l-3.86 3C3.37 20.32 7.35 23 12 23z" />
                  </svg>
                  <span>{authMode === "signup" ? "Sign Up using Google" : "Sign In using Google"}</span>
                </button>

                <div className="sp-switch" style={{ marginTop: 20 }}>
                  {authMode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button type="button" onClick={() => handleSwitchMode("signin")}>Sign In</button>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <button type="button" onClick={() => handleSwitchMode("signup")}>Sign Up</button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
