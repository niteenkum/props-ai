"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles, Eye, EyeOff, Lock, Mail, Loader2, User, Briefcase,
  Globe, ArrowRight, ArrowLeft, Search, X, ChevronDown,
  ShieldCheck, RotateCcw, Check,
} from "lucide-react";
import { loginAction, sendSignupOtpAction, verifyOtpAndSignUpAction } from "../actions/auth-actions";
import { getSkillsAction, seedSkillsAction, SkillItem } from "../actions/skill-actions";

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

interface LoginViewProps {
  onLoginSuccess: (email: string, status: "PENDING" | "ACTIVE", userName: string) => void;
  onBack: () => void;
}

// Category badge colors
const catColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Frontend:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" },
  Backend:   { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" },
  Mobile:    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  Database:  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  DevOps:    { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", dot: "#0ea5e9" },
  "AI/ML":   { bg: "#fef3c7", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
  Design:    { bg: "#fdf2f8", border: "#fbcfe8", text: "#9d174d", dot: "#ec4899" },
  Testing:   { bg: "#f7fee7", border: "#d9f99d", text: "#3f6212", dot: "#84cc16" },
  General:   { bg: "#f5f5f5", border: "#e0e0e0", text: "#555", dot: "#999" },
};

type SignupStep = "form" | "otp";

export default function LoginView({ onLoginSuccess, onBack }: LoginViewProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Skills
  const [allSkills, setAllSkills] = useState<SkillItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skillSearch, setSkillSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  // OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (mode === "signup" && allSkills.length === 0) {
      setSkillsLoading(true);
      (async () => {
        await seedSkillsAction();
        const skills = await getSkillsAction();
        setAllSkills(skills);
        setSkillsLoading(false);
      })();
    }
  }, [mode, allSkills.length]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Close dropdown on outside click (backdrop handles this now for the portal, but keep as fallback)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDropdown = dropdownRef.current?.contains(target);
      const insideTrigger = triggerRef.current?.contains(target);
      if (!insideDropdown && !insideTrigger) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const categories = useMemo(() => [...new Set(allSkills.map((s) => s.category))].sort(), [allSkills]);
  const filteredSkills = useMemo(() => {
    let list = allSkills.filter((s) => !selectedIds.has(s.id));
    if (activeCategory) list = list.filter((s) => s.category === activeCategory);
    if (skillSearch.trim()) list = list.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()));
    return list;
  }, [allSkills, selectedIds, activeCategory, skillSearch]);
  const selectedSkills = useMemo(() => allSkills.filter((s) => selectedIds.has(s.id)), [allSkills, selectedIds]);

  const toggleSkill = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[idx] = digit; setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!digit && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) { setOtp(digits.split("")); otpRefs.current[5]?.focus(); }
  };

  const handleSignupFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (selectedIds.size === 0) { setError("Please select at least one skill."); return; }
    setLoading(true);
    const res = await sendSignupOtpAction(email, name);
    setLoading(false);
    if (res.success) { setSignupStep("otp"); setResendCooldown(60); }
    else setError(res.error || "Failed to send verification email.");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the 6-digit code sent to your email."); return; }
    setOtpLoading(true);
    const res = await verifyOtpAndSignUpAction({
      otp: code, name, email, password, role,
      skills: selectedSkills.map((s) => s.name).join(", "),
      portfolioUrl, githubUrl, linkedinUrl,
    });
    setOtpLoading(false);
    if (res.success && res.user) onLoginSuccess(res.user.email, res.user.status, res.user.name);
    else setError(res.error || "Verification failed.");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true);
    const res = await loginAction({ email, password });
    setLoading(false);
    if (res.success && res.user) onLoginSuccess(res.user.email, res.user.status, res.user.name);
    else setError(res.error || "Sign in failed.");
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(""); setOtp(["", "", "", "", "", ""]);
    const res = await sendSignupOtpAction(email, name);
    if (res.success) setResendCooldown(60);
    else setError(res.error || "Failed to resend.");
  };

  const switchMode = (next: "login" | "signup") => {
    setMode(next); setSignupStep("form"); setError("");
    setOtp(["", "", "", "", "", ""]);
    setEmail(""); setPassword(""); setName(""); setRole("");
    setPortfolioUrl(""); setGithubUrl(""); setLinkedinUrl("");
    setSelectedIds(new Set()); setSkillSearch("");
  };

  return (
    <>
      <style>{`
        :root { --brand: #111; }

        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          background: #f5f5f5;
          padding: 16px;
          padding-top: 48px;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        @media (min-width: 640px) {
          .auth-page { padding: 40px 24px; align-items: center; }
        }

        .auth-back {
          position: fixed;
          top: 16px; left: 16px;
          display: flex; align-items: center; gap: 5px;
          color: #999; font-size: 13px; font-weight: 500;
          background: none; border: none; cursor: pointer;
          z-index: 50; transition: color 0.2s;
        }
        .auth-back:hover { color: #111; }

        .auth-card {
          width: 100%;
          background: #fff;
          border-radius: 20px;
          border: 1px solid #e8e8e8;
          box-shadow: 0 8px 32px rgba(0,0,0,0.07);
          padding: 28px 20px;
          max-width: 440px;
          transition: max-width 0.3s ease;
        }

        @media (min-width: 640px) {
          .auth-card { padding: 36px 32px; }
        }

        .auth-card.wide {
          max-width: 440px;
        }

        @media (min-width: 768px) {
          .auth-card.wide { max-width: 720px; }
        }

        .auth-brand {
          text-align: center;
          margin-bottom: 24px;
        }

        .auth-brand-logo {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: #111;
          display: inline-flex;
          align-items: center; justify-content: center;
          margin-bottom: 12px;
        }

        .auth-brand h1 {
          font-size: 22px; font-weight: 700; color: #111; margin: 0;
        }

        .auth-brand p {
          font-size: 13px; color: #aaa; margin: 4px 0 0;
        }

        .auth-error {
          margin-bottom: 16px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 12px;
          text-align: center;
          font-weight: 500;
        }

        /* ── Field ── */
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field label { font-size: 12px; font-weight: 600; color: #888; }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; color: #c0c0c0; pointer-events: none;
          transition: color 0.2s;
        }
        .field-input {
          width: 100%; box-sizing: border-box;
          padding: 11px 12px 11px 38px;
          border-radius: 10px;
          border: 1.5px solid #e8e8e8;
          background: #f8f8f8;
          color: #111; font-size: 14px;
          outline: none;
          transition: all 0.2s;
          -webkit-appearance: none;
        }
        .field-input:focus {
          border-color: #111;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
        }
        .field-input::placeholder { color: #c0c0c0; }

        .field-input.pr { padding-right: 40px; }

        .pw-toggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #ccc;
          padding: 4px; display: flex; transition: color 0.2s;
        }
        .pw-toggle:hover { color: #888; }

        /* ── Form grid ── */
        .form-cols {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        @media (min-width: 640px) {
          .form-cols {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px 20px;
          }
        }

        .form-col { display: flex; flex-direction: column; gap: 14px; }

        /* ── Submit button ── */
        .btn-primary {
          width: 100%;
          padding: 13px 0;
          border-radius: 11px;
          border: none;
          background: #111;
          color: #fff;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: all 0.2s;
          -webkit-appearance: none;
        }
        .btn-primary:hover:not(:disabled) { background: #333; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Skills picker ── */
        .skills-label {
          font-size: 12px; font-weight: 600; color: #888;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .skills-count {
          font-size: 11px; font-weight: 500;
          background: #f0f0f0; color: #888;
          padding: 2px 8px; border-radius: 20px;
        }

        .skills-chips {
          display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;
        }

        .skill-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 8px;
          font-size: 12px; font-weight: 500;
          border: 1.5px solid;
          transition: opacity 0.15s;
        }

        .skill-chip-remove {
          background: none; border: none; cursor: pointer;
          padding: 0; display: flex; opacity: 0.5;
          transition: opacity 0.15s;
        }
        .skill-chip-remove:hover { opacity: 1; }

        /* ── Dropdown trigger ── */
        .skills-trigger {
          display: flex; align-items: center; justify-content: space-between;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #e8e8e8;
          background: #f8f8f8;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .skills-trigger:hover { border-color: #ccc; background: #f3f3f3; }
        .skills-trigger.open { border-color: #111; background: #fff; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        .skills-trigger span { font-size: 13px; color: #bbb; }

        /* ── Dropdown panel ── */
        .skills-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0; right: 0;
          z-index: 100;
          background: #fff;
          border: 1.5px solid #e0e0e0;
          border-radius: 14px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          display: flex; flex-direction: column;
          max-height: 340px;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .skills-dropdown {
            position: fixed;
            top: auto;
            bottom: 0; left: 0; right: 0;
            border-radius: 20px 20px 0 0;
            max-height: 70vh;
            border-bottom: none;
          }
        }

        .skills-search-wrap {
          padding: 12px 12px 8px;
          border-bottom: 1px solid #f0f0f0;
        }

        .skills-search {
          position: relative;
        }

        .skills-search-input {
          width: 100%; box-sizing: border-box;
          padding: 9px 12px 9px 34px;
          border: 1.5px solid #eee;
          border-radius: 9px;
          font-size: 13px;
          outline: none;
          background: #fafafa;
          color: #111;
          transition: all 0.2s;
        }
        .skills-search-input:focus { border-color: #ccc; background: #fff; }
        .skills-search-input::placeholder { color: #bbb; }

        /* Category tabs — horizontal scroll, no wrap */
        .cat-tabs {
          display: flex !important;
          gap: 6px !important;
          padding: 8px 12px !important;
          border-bottom: 1px solid #f0f0f0 !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: none !important;
          background: #fff !important;
        }
        .cat-tabs::-webkit-scrollbar { display: none; }

        /* Skills list */
        .skills-list {
          overflow-y: auto;
          flex: 1;
          padding: 6px;
        }

        .skill-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 10px;
          border-radius: 9px;
          cursor: pointer;
          transition: background 0.12s;
          border: none; background: transparent; width: 100%; text-align: left;
        }
        .skill-row:hover { background: #f5f5f5; }

        .skill-row-name { font-size: 13px; color: #333; font-weight: 500; }
        .skill-cat-badge {
          font-size: 10px; font-weight: 700;
          padding: 3px 8px; border-radius: 5px;
          text-transform: uppercase; letter-spacing: 0.3px;
          flex-shrink: 0;
        }

        .skills-empty { text-align: center; color: #bbb; font-size: 13px; padding: 20px; }

        /* ── OTP ── */
        .otp-grid {
          display: flex; gap: 8px; justify-content: center;
          margin-bottom: 20px;
        }

        @media (min-width: 400px) { .otp-grid { gap: 10px; } }

        .otp-box {
          width: 44px; height: 54px;
          text-align: center;
          font-size: 22px; font-weight: 800;
          border-radius: 12px;
          border: 2px solid #e0e0e0;
          background: #fafafa;
          color: #111; outline: none;
          transition: all 0.15s;
          -webkit-appearance: none;
        }
        .otp-box:focus { border-color: #111; background: #fff; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }

        @media (min-width: 400px) {
          .otp-box { width: 52px; height: 60px; font-size: 24px; }
        }

        /* ── Divider / switch ── */
        .auth-switch {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #aaa;
        }
        .auth-switch button {
          background: none; border: none;
          color: #111; font-weight: 700;
          cursor: pointer; font-size: 13px;
          text-decoration: underline; text-underline-offset: 3px;
        }

        /* ── Spinner ── */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* Mobile backdrop for dropdown */
        .skills-backdrop {
          display: none;
        }
        @media (max-width: 640px) {
          .skills-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.3);
            z-index: 99;
          }
        }
      `}</style>

      <div className="auth-page">
        <button onClick={onBack} className="auth-back">
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back
        </button>

        <div className={`auth-card ${mode === "signup" && signupStep === "form" ? "wide" : ""}`}>
          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-brand-logo">
              <Sparkles style={{ width: 20, height: 20, color: "#fff" }} />
            </div>
            <h1>Prop<span style={{ color: "#888" }}>AI</span></h1>
            <p>
              {mode === "login" ? "Sign in to your workspace" : signupStep === "otp" ? "Check your inbox" : "Create your account"}
            </p>
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* ══ LOGIN ══════════════════════════════════════════════════════ */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Email address</label>
                <div className="field-wrap">
                  <Mail className="field-icon" />
                  <input className="field-input" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="field-wrap">
                  <Lock className="field-icon" />
                  <input className="field-input pr" type={showPassword ? "text" : "password"} required
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                {loading
                  ? <><Loader2 className="spin" style={{ width: 15, height: 15 }} /><span>Signing in...</span></>
                  : <><span>Sign In</span><ArrowRight style={{ width: 15, height: 15 }} /></>
                }
              </button>

              <div className="auth-switch">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchMode("signup")}>Create Account</button>
              </div>
            </form>
          )}

          {/* ══ SIGNUP FORM ═══════════════════════════════════════════════ */}
          {mode === "signup" && signupStep === "form" && (
            <form onSubmit={handleSignupFormSubmit}>
              {/* Two-column on ≥640px, single on mobile */}
              <div className="form-cols">
                {/* Col 1 */}
                <div className="form-col">
                  <div className="field">
                    <label>Full Name</label>
                    <div className="field-wrap">
                      <User className="field-icon" />
                      <input className="field-input" type="text" required value={name}
                        onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Email Address</label>
                    <div className="field-wrap">
                      <Mail className="field-icon" />
                      <input className="field-input" type="email" required value={email}
                        onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <div className="field-wrap">
                      <Lock className="field-icon" />
                      <input className="field-input pr" type={showPassword ? "text" : "password"} required
                        value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" />
                      <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Professional Role</label>
                    <div className="field-wrap">
                      <Briefcase className="field-icon" />
                      <input className="field-input" type="text" value={role}
                        onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" />
                    </div>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="form-col">
                  <div className="field">
                    <label>GitHub URL</label>
                    <div className="field-wrap">
                      <GithubIcon className="field-icon" />
                      <input className="field-input" type="url" value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/username" />
                    </div>
                  </div>
                  <div className="field">
                    <label>LinkedIn URL</label>
                    <div className="field-wrap">
                      <LinkedinIcon className="field-icon" />
                      <input className="field-input" type="url" value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/user" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Portfolio URL</label>
                    <div className="field-wrap">
                      <Globe className="field-icon" />
                      <input className="field-input" type="url" value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yoursite.com" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Skills Picker ────────────────────────────────────────── */}
              <div style={{ marginTop: 20 }}>
                <div className="skills-label">
                  <span>Your IT Skills</span>
                  {selectedIds.size > 0 && (
                    <span className="skills-count">{selectedIds.size} selected</span>
                  )}
                </div>

                {/* Selected chips */}
                {selectedSkills.length > 0 && (
                  <div className="skills-chips">
                    {selectedSkills.map((s) => {
                      const c = catColors[s.category] || catColors.General;
                      return (
                        <span key={s.id} className="skill-chip" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block", flexShrink: 0 }} />
                          {s.name}
                          <button type="button" className="skill-chip-remove" onClick={() => toggleSkill(s.id)} style={{ color: c.text }}>
                            <X style={{ width: 11, height: 11 }} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown */}
                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <div
                    ref={triggerRef}
                    className={`skills-trigger ${showDropdown ? "open" : ""}`}
                    onClick={() => {
                      if (!showDropdown && triggerRef.current) {
                        const rect = triggerRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        setDropUp(spaceBelow < 360);
                        setTriggerRect(rect);
                      }
                      setShowDropdown(!showDropdown);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Search style={{ width: 15, height: 15, color: "#ccc", flexShrink: 0 }} />
                      <span>{skillsLoading ? "Loading skills..." : selectedIds.size > 0 ? "Add more skills..." : "Search and select your skills..."}</span>
                    </div>
                    <ChevronDown style={{ width: 15, height: 15, color: "#ccc", flexShrink: 0, transition: "transform 0.2s", transform: showDropdown ? "rotate(180deg)" : "none" }} />
                  </div>

                  {showDropdown && triggerRect && (
                    <>
                      {/* Full-page backdrop — closes on tap, also dims on mobile */}
                      <div
                        style={{
                          position: "fixed", inset: 0, zIndex: 99,
                          background: "transparent",
                        }}
                        onClick={() => setShowDropdown(false)}
                      />

                      {/* ── Dropdown portal — fixed positioning beats all overflow/clip issues ── */}
                      <div
                        ref={dropdownRef}
                        style={{
                          position: "fixed",
                          zIndex: 200,
                          width: triggerRect.width,
                          left: triggerRect.left,
                          ...(dropUp
                            ? { bottom: window.innerHeight - triggerRect.top + 6 }
                            : { top: triggerRect.bottom + 6 }
                          ),
                          background: "#fff",
                          border: "1.5px solid #e8e8e8",
                          borderRadius: 14,
                          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
                          display: "flex", flexDirection: "column",
                          maxHeight: 340,
                          overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >

                        {/* Search */}
                        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
                          <div style={{ position: "relative" }}>
                            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#ccc" }} />
                            <input
                              autoFocus
                              type="text"
                              value={skillSearch}
                              onChange={(e) => setSkillSearch(e.target.value)}
                              placeholder="Search skills..."
                              style={{
                                width: "100%", boxSizing: "border-box",
                                padding: "9px 12px 9px 34px",
                                border: "1.5px solid #eee", borderRadius: 9,
                                fontSize: 13, outline: "none",
                                background: "#fafafa", color: "#333",
                                fontFamily: "inherit",
                              }}
                              onFocus={(e) => { e.target.style.borderColor = "#ccc"; e.target.style.background = "#fff"; }}
                              onBlur={(e) => { e.target.style.borderColor = "#eee"; e.target.style.background = "#fafafa"; }}
                            />
                          </div>
                        </div>

                        {/* Category pills — horizontal scroll */}
                        <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid #f0f0f0", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", background: "#fff", flexShrink: 0 }}>
                          {[null, ...categories].map((cat) => {
                            const isActive = activeCategory === cat;
                            return (
                              <button
                                key={cat ?? "all"}
                                type="button"
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                  flexShrink: 0, padding: "4px 13px", borderRadius: 20,
                                  fontSize: 12, fontWeight: 600,
                                  border: `1.5px solid ${isActive ? "#111" : "#e8e8e8"}`,
                                  background: isActive ? "#111" : "#fff",
                                  color: isActive ? "#fff" : "#777",
                                  cursor: "pointer", whiteSpace: "nowrap",
                                  transition: "all 0.15s", fontFamily: "inherit",
                                }}
                              >
                                {cat ?? "All"}
                              </button>
                            );
                          })}
                        </div>

                        {/* Skills list */}
                        <div style={{ overflowY: "auto", flex: 1, padding: 6, background: "#fff" }}>
                          {filteredSkills.length === 0 && (
                            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, padding: 20, margin: 0, background: "#fff" }}>
                              {skillSearch ? `No results for "${skillSearch}"` : "All skills selected!"}
                            </p>
                          )}
                          {filteredSkills.map((skill) => {
                            const c = catColors[skill.category] || catColors.General;
                            return (
                              <button
                                key={skill.id}
                                type="button"
                                onClick={() => toggleSkill(skill.id)}
                                style={{
                                  width: "100%", display: "flex", alignItems: "center",
                                  justifyContent: "space-between", padding: "9px 10px",
                                  borderRadius: 9, border: "none", background: "transparent",
                                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                                  transition: "background 0.12s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />
                                  <span style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{skill.name}</span>
                                </div>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "3px 8px",
                                  borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.3px",
                                  flexShrink: 0, background: c.bg, color: c.text,
                                  border: `1px solid ${c.border}`,
                                }}>
                                  {skill.category}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 22 }}>
                {loading
                  ? <><Loader2 className="spin" style={{ width: 15, height: 15 }} /><span>Sending code...</span></>
                  : <><span>Continue — Verify Email</span><ArrowRight style={{ width: 15, height: 15 }} /></>
                }
              </button>

              <div className="auth-switch">
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")}>Sign In</button>
              </div>
            </form>
          )}

          {/* ══ OTP VERIFICATION ══════════════════════════════════════════ */}
          {mode === "signup" && signupStep === "otp" && (
            <form onSubmit={handleOtpSubmit}>
              {/* Icon + desc */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: "#f5f5f5", border: "1px solid #eee", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <ShieldCheck style={{ width: 28, height: 28, color: "#555" }} />
                </div>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0 }}>
                  We emailed a 6-digit code to
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "2px 0 0" }}>{email}</p>
              </div>

              {/* OTP boxes */}
              <div className="otp-grid">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    className="otp-box"
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus(); }}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    style={{ borderColor: digit ? "#111" : undefined, background: digit ? "#f8f8f8" : undefined }}
                  />
                ))}
              </div>

              {/* Verify button */}
              <button
                type="submit"
                className="btn-primary"
                disabled={otpLoading || otp.join("").length < 6}
              >
                {otpLoading
                  ? <><Loader2 className="spin" style={{ width: 15, height: 15 }} /><span>Verifying...</span></>
                  : <><Check style={{ width: 16, height: 16 }} /><span>Verify & Create Account</span></>
                }
              </button>

              {/* Resend + back */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => { setSignupStep("form"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#aaa", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  <ArrowLeft style={{ width: 13, height: 13 }} />
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: resendCooldown > 0 ? "#ccc" : "#111", fontSize: 12, fontWeight: 600, cursor: resendCooldown > 0 ? "not-allowed" : "pointer", textDecoration: resendCooldown > 0 ? "none" : "underline", textUnderlineOffset: 3 }}
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
