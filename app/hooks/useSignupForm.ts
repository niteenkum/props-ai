"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { sendSignupOtpAction, verifyOtpAndSignUpAction } from "../actions/auth-actions";
import { getSkillsAction, seedSkillsAction } from "../actions/skill-actions";
import type { SkillItem } from "../actions/skill-actions";
import { useLoginSuccess } from "./useLoginSuccess";

export type SignupStep = "form" | "otp";

export function useSignupForm() {
  const { handleLoginSuccess } = useLoginSuccess();

  // ─── Form fields ─────────────────────────────────────────────────────────
  const [step, setStep]                 = useState<SignupStep>("form");
  const [name, setName]                 = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole]                 = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl]       = useState("");
  const [linkedinUrl, setLinkedinUrl]   = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  // ─── Skills ──────────────────────────────────────────────────────────────
  const [allSkills, setAllSkills]         = useState<SkillItem[]>([]);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [skillSearch, setSkillSearch]     = useState("");
  const [showDropdown, setShowDropdown]   = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [dropUp, setDropUp]               = useState(false);
  const [triggerRect, setTriggerRect]     = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLDivElement>(null);

  // ─── OTP ─────────────────────────────────────────────────────────────────
  const [otp, setOtp]                   = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load skills when component mounts
  useEffect(() => {
    setSkillsLoading(true);
    (async () => {
      await seedSkillsAction();
      const skills = await getSkillsAction();
      setAllSkills(skills);
      setSkillsLoading(false);
    })();
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const categories    = useMemo(() => [...new Set(allSkills.map(s => s.category))].sort(), [allSkills]);
  const filteredSkills = useMemo(() => {
    let list = allSkills.filter(s => !selectedIds.has(s.id));
    if (activeCategory) list = list.filter(s => s.category === activeCategory);
    if (skillSearch.trim()) list = list.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()));
    return list;
  }, [allSkills, selectedIds, activeCategory, skillSearch]);
  const selectedSkills = useMemo(() => allSkills.filter(s => selectedIds.has(s.id)), [allSkills, selectedIds]);

  // ─── Skill handlers ───────────────────────────────────────────────────────
  const toggleSkill = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openDropdown = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropUp(window.innerHeight - rect.bottom < 360);
    setTriggerRect(rect);
    setShowDropdown(true);
  };

  // ─── OTP handlers ────────────────────────────────────────────────────────
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

  // ─── Form submit → send OTP ───────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!name.trim())               { setError("Please enter your full name."); return; }
    if (!email.trim())              { setError("Please enter your email address."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const res = await sendSignupOtpAction(email, name);
    setLoading(false);
    if (res.success) { setStep("otp"); setResendCooldown(60); }
    else setError(res.error || "Failed to send verification email.");
  };

  // ─── OTP submit → create account ─────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the 6-digit code sent to your email."); return; }
    setOtpLoading(true);
    const res = await verifyOtpAndSignUpAction({
      otp: code, name, email, password, role,
      skills: selectedSkills.map(s => s.name).join(", "),
      portfolioUrl, githubUrl, linkedinUrl,
    });
    setOtpLoading(false);
    if (res.success && res.user) {
      handleLoginSuccess(res.user.email, res.user.status, res.user.name, res.user.role, "/dashboard/profile");
    } else {
      setError(res.error || "Verification failed.");
    }
  };

  // ─── Resend OTP ───────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(""); setOtp(["", "", "", "", "", ""]);
    const res = await sendSignupOtpAction(email, name);
    if (res.success) setResendCooldown(60);
    else setError(res.error || "Failed to resend.");
  };

  return {
    // step
    step, setStep,
    // fields
    name, setName,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    role, setRole,
    portfolioUrl, setPortfolioUrl,
    githubUrl, setGithubUrl,
    linkedinUrl, setLinkedinUrl,
    loading, error, setError,
    // skills
    allSkills, selectedIds, skillSearch, setSkillSearch,
    showDropdown, setShowDropdown,
    activeCategory, setActiveCategory,
    skillsLoading, dropUp, triggerRect,
    dropdownRef, triggerRef,
    categories, filteredSkills, selectedSkills,
    toggleSkill, openDropdown,
    // otp
    otp, otpRefs, otpLoading, resendCooldown,
    handleOtpChange, handleOtpPaste,
    // handlers
    handleFormSubmit, handleOtpSubmit, handleResend,
  };
}
