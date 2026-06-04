"use client";

import { useState, useEffect, useMemo } from "react";
import React from "react";
import {
  getJobPostsAction,
  updateJobPostAction,
  deleteJobPostAction,
} from "../actions/db-actions";
import { analyzeAndGenerateAction } from "../actions/ai-actions";
import type { JobPost } from "../utils/db";

export function useDashboard(userEmail: string, pendingJobId?: string) {
  // ─── Jobs & filters ────────────────────────────────────────────────────────
  const [jobs, setJobs]               = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ─── Drawer ───────────────────────────────────────────────────────────────
  const [selectedJob, setSelectedJob]               = useState<JobPost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen]             = useState(false);
  const [drawerActiveTab, setDrawerActiveTab]       = useState<"details" | "templates">("templates");
  const [templateActiveTab, setTemplateActiveTab]   = useState<string>("coldEmail");
  const [copiedStates, setCopiedStates]             = useState<Record<string, boolean>>({});
  const [notesText, setNotesText]                   = useState("");

  // ─── Data loading ──────────────────────────────────────────────────────────
  const loadJobs = async () => {
    try {
      const dbJobs = await getJobPostsAction();
      setJobs(dbJobs);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // ─── Auto-open drawer from URL ?job=<id> ──────────────────────────────────
  useEffect(() => {
    if (!pendingJobId || jobs.length === 0) return;
    const job = jobs.find(j => j.id === pendingJobId);
    if (job) {
      setSelectedJob(job);
      setNotesText(job.notes || "");
      setDrawerActiveTab("templates");
      // Auto-select first tab that actually has content
      const templates = job.generatedTemplates || {};
      const firstAvailable = Object.entries(templates).find(([, v]) => v && !v.startsWith("[Generation failed"))?.[0];
      setTemplateActiveTab(firstAvailable || "coldEmail");
      setIsDrawerOpen(true);
    }
  }, [pendingJobId, jobs]);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = jobs.length;
    const avgMatch = total > 0 ? Math.round(jobs.reduce((a, j) => a + j.matchScore, 0) / total) : 0;
    const active   = jobs.filter(j => j.status === "Sent" || j.status === "Interviewing").length;
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
  const openJobDrawer = (job: JobPost) => {
    setSelectedJob(job);
    setNotesText(job.notes || "");
    setDrawerActiveTab("templates");
    // Auto-select first tab that has content
    const templates = job.generatedTemplates || {};
    const firstAvailable = Object.entries(templates).find(([, v]) => v && !v.startsWith("[Generation failed"))?.[0];
    setTemplateActiveTab(firstAvailable || "coldEmail");
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
    await loadJobs();
  };

  const handleStatusChange = async (status: JobPost["status"]) => {
    if (!selectedJob) return;
    const updated = { ...selectedJob, status };
    await updateJobPostAction(updated);
    setSelectedJob(updated);
    await loadJobs();
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job scan?")) return;
    await deleteJobPostAction(id);
    setIsDrawerOpen(false);
    setSelectedJob(null);
    await loadJobs();
  };

  const handleRegenerateJob = async () => {
    if (!selectedJob) return;
    try {
      const result = await analyzeAndGenerateAction(selectedJob.originalText, userEmail);
      if (result.success && result.result) {
        const updated = { ...selectedJob, generatedTemplates: result.result.generatedTemplates };
        setSelectedJob(updated);
        await updateJobPostAction(updated);
        await loadJobs();
      }
    } catch (err) {
      console.error("Regeneration failed:", err);
    }
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
    jobs,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    selectedJob, setSelectedJob,
    isDrawerOpen, setIsDrawerOpen,
    drawerActiveTab, setDrawerActiveTab,
    templateActiveTab, setTemplateActiveTab,
    copiedStates,
    notesText, setNotesText,
    // computed
    stats, filteredJobs,
    // handlers
    openJobDrawer,
    handleCopyToClipboard,
    handleSaveNotes,
    handleStatusChange,
    handleDeleteJob,
    handleRegenerateJob,
    loadJobs,
    // style helpers
    getScoreColor, getScoreBg, getStatusStyle,
  };
}
