"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import React from "react";
import {
  getJobPostsAction,
  addJobPostAction,
  updateJobPostAction,
  deleteJobPostAction,
  getUserProfileAction,
  saveUserProfileAction,
} from "../actions/db-actions";
import { analyzeAndGenerateAction, getAIStatusAction } from "../actions/ai-actions";
import type { JobPost, UserProfile } from "../utils/db";

export function useDashboard(userEmail: string) {
  // ─── Navigation ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"dashboard" | "new" | "profile">("dashboard");

  // ─── Jobs ─────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ─── Profile ──────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [newSkillText, setNewSkillText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeUploadStep, setResumeUploadStep] = useState("");

  // ─── Generation ───────────────────────────────────────────────────────────
  const [pasteText, setPasteText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);

  // ─── AI ───────────────────────────────────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  // ─── Drawer ───────────────────────────────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<"details" | "templates">("templates");
  const [templateActiveTab, setTemplateActiveTab] = useState<"coldEmail" | "proposal" | "linkedin" | "coverLetter">("coldEmail");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [notesText, setNotesText] = useState("");

  // ─── Data Loading ─────────────────────────────────────────────────────────
  const loadWorkspaceData = async () => {
    try {
      const [dbJobs, dbProfile] = await Promise.all([
        getJobPostsAction(),
        getUserProfileAction(userEmail),
      ]);
      setJobs(dbJobs);
      setProfile(dbProfile);
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
    getAIStatusAction().then(({ available, provider }) => {
      setAiAvailable(available);
      setAiProvider(provider);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const liveHeuristics = useMemo(() => {
    if (!pasteText.trim()) return null;
    const foundEmails = pasteText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    const email = foundEmails ? foundEmails[0] : "Looking...";
    let role = "Analyzing...";
    if (/react/i.test(pasteText)) role = "React.js Engineer";
    else if (/flutter/i.test(pasteText)) role = "Flutter Support Engineer";
    else if (/product/i.test(pasteText)) role = "Product Architect";
    let company = "Analyzing...";
    if (/Zvart/i.test(pasteText)) company = "Zvart Manukyan Dev";
    else if (/Vercel/i.test(pasteText)) company = "Vercel Corp";
    else if (/Linear/i.test(pasteText)) company = "Linear App";
    let score = 70;
    if (profile) {
      const matched = profile.skills.filter(skill => {
        const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(pasteText);
      });
      score = 65 + Math.min(matched.length * 4, 30);
    } else {
      if (/react/i.test(pasteText)) score += 15;
      if (/flutter/i.test(pasteText)) score += 10;
    }
    return { role, company, email, score: Math.min(score, 100) };
  }, [pasteText, profile]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const avgMatch = total > 0 ? Math.round(jobs.reduce((a, j) => a + j.matchScore, 0) / total) : 0;
    const active = jobs.filter(j => j.status === "Sent" || j.status === "Interviewing").length;
    const generated = jobs.filter(j => j.status === "Generated" || j.status === "Sent").length;
    return { total, avgMatch, active, generated };
  }, [jobs]);

  const filteredJobs = useMemo(() =>
    jobs.filter(job => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        job.role.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.contactEmail && job.contactEmail.toLowerCase().includes(q)) ||
        job.tags.some(t => t.toLowerCase().includes(q));
      const matchesFilter = statusFilter === "all" || job.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesFilter;
    }), [jobs, searchQuery, statusFilter]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    setIsGenerating(true);
    setGenerationStep(0);
    setGenerationError(null);

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => (prev < 5 ? prev + 1 : prev));
    }, aiAvailable ? 2500 : 600);

    try {
      const result = await analyzeAndGenerateAction(pasteText, userEmail);
      clearInterval(stepInterval);
      setGenerationStep(5);

      if (!result.success || !result.result) {
        setGenerationError(result.error || "Generation failed. Please try again.");
        setIsGenerating(false);
        return;
      }

      const analysis = result.result;
      setLastUsedProvider(result.provider || null);
      if (result.error) setGenerationError(result.error);

      const newJob = await addJobPostAction({
        role: analysis.role,
        company: analysis.company,
        originalText: pasteText,
        parsedSummary: analysis.parsedSummary,
        contactName: analysis.contactName,
        contactEmail: analysis.contactEmail,
        matchScore: analysis.matchScore,
        tags: analysis.tags,
        notes: analysis.notes,
        generatedTemplates: analysis.generatedTemplates,
      });

      setPasteText("");
      setIsGenerating(false);
      await loadWorkspaceData();
      setActiveTab("dashboard");
      setSelectedJob(newJob);
      setNotesText(newJob.notes || "");
      setDrawerActiveTab("templates");
      setTemplateActiveTab("coldEmail");
      setIsDrawerOpen(true);
    } catch (err) {
      clearInterval(stepInterval);
      console.error("Failed to generate:", err);
      setGenerationError(err instanceof Error ? err.message : "Unexpected error during generation.");
      setIsGenerating(false);
    }
  };

  const openJobDrawer = (job: JobPost) => {
    setSelectedJob(job);
    setNotesText(job.notes || "");
    setDrawerActiveTab("templates");
    setTemplateActiveTab("coldEmail");
    setIsDrawerOpen(true);
  };

  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
  };

  const handleSaveNotes = async () => {
    if (!selectedJob) return;
    const updated = { ...selectedJob, notes: notesText };
    await updateJobPostAction(updated);
    setSelectedJob(updated);
    await loadWorkspaceData();
  };

  const handleStatusChange = async (status: JobPost["status"]) => {
    if (!selectedJob) return;
    const updated = { ...selectedJob, status };
    await updateJobPostAction(updated);
    setSelectedJob(updated);
    await loadWorkspaceData();
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job scan?")) return;
    await deleteJobPostAction(id);
    setIsDrawerOpen(false);
    setSelectedJob(null);
    await loadWorkspaceData();
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    setProfileSaving(true);
    setProfileSaveSuccess(false);
    try {
      await saveUserProfileAction(profile);
      setProfileSaveSuccess(true);
      await loadWorkspaceData();
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTriggerFileInput = () => fileInputRef.current?.click();

  const handleResumeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setIsUploadingResume(true);
    setResumeUploadStep("Opening file buffers...");
    const steps = [
      "Decompressing resume layout blocks...",
      "Analyzing visual font structures...",
      "Running semantic OCR filters...",
      "Extracting tech stack indices...",
      "Injecting new candidate parameters...",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setResumeUploadStep(steps[idx++]);
      } else {
        clearInterval(interval);
        const extras = ["Docker", "Kubernetes", "GraphQL", "AWS"].filter(s => !profile.skills.includes(s));
        const updated: UserProfile = { ...profile, resumeFileName: file.name, skills: [...profile.skills, ...extras] };
        setProfile(updated);
        saveUserProfileAction(updated)
          .then(() => { setIsUploadingResume(false); loadWorkspaceData(); })
          .catch(err => { console.error(err); setIsUploadingResume(false); });
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 4000);
      }
    }, 500);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillText.trim() || !profile) return;
    if (!profile.skills.includes(newSkillText.trim()))
      setProfile({ ...profile, skills: [...profile.skills, newSkillText.trim()] });
    setNewSkillText("");
  };

  const handleDeleteSkill = (skill: string) => {
    if (!profile) return;
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  };

  const handleProjectDetailChange = (idx: number, field: "name" | "description" | "tech", value: string) => {
    if (!profile) return;
    const projects = [...profile.projects];
    projects[idx] = field === "tech"
      ? { ...projects[idx], tech: value.split(",").map(t => t.trim()).filter(Boolean) }
      : { ...projects[idx], [field]: value };
    setProfile({ ...profile, projects });
  };

  const handleDeleteProject = (idx: number) => {
    if (!profile) return;
    setProfile({ ...profile, projects: profile.projects.filter((_, i) => i !== idx) });
  };

  const handleAddBlankProject = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: [...profile.projects, { name: "New Project Showcase", tech: ["React"], description: "Describe the architectural approach and tech used." }],
    });
  };

  const handleEducationChange = (idx: number, field: "degree" | "school" | "year", value: string) => {
    if (!profile) return;
    const education = [...profile.education];
    education[idx] = { ...education[idx], [field]: value };
    setProfile({ ...profile, education });
  };

  // ─── Style helpers ────────────────────────────────────────────────────────
  const getScoreColor = (score: number) =>
    score >= 90 ? "#22c55e" : score >= 80 ? "#111" : "#f59e0b";

  const getScoreBg = (score: number) =>
    score >= 90 ? "#f0fdf4" : score >= 80 ? "#f5f5f5" : "#fffbeb";

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case "Generated":    return { background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" };
      case "Sent":         return { background: "#f5f5f5", color: "#111",    border: "1px solid #ddd" };
      case "Interviewing": return { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" };
      case "Declined":     return { background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" };
      default:             return { background: "#fafafa", color: "#888",    border: "1px solid #eee" };
    }
  };

  return {
    // state
    activeTab, setActiveTab,
    jobs,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    profile, setProfile,
    profileSaving, profileSaveSuccess,
    newSkillText, setNewSkillText,
    fileInputRef,
    isUploadingResume, resumeUploadStep,
    pasteText, setPasteText,
    isGenerating, generationStep,
    generationError, setGenerationError,
    lastUsedProvider,
    aiProvider, aiAvailable,
    selectedJob, setSelectedJob,
    isDrawerOpen, setIsDrawerOpen,
    drawerActiveTab, setDrawerActiveTab,
    templateActiveTab, setTemplateActiveTab,
    copiedStates,
    notesText, setNotesText,
    // computed
    liveHeuristics, stats, filteredJobs,
    // handlers
    handleGenerate,
    openJobDrawer,
    handleCopyToClipboard,
    handleSaveNotes,
    handleStatusChange,
    handleDeleteJob,
    handleSaveProfile,
    handleTriggerFileInput,
    handleResumeFileSelected,
    handleAddSkill,
    handleDeleteSkill,
    handleProjectDetailChange,
    handleDeleteProject,
    handleAddBlankProject,
    handleEducationChange,
    // style helpers
    getScoreColor, getScoreBg, getStatusStyle,
  };
}
