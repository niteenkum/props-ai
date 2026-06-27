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
  const [totalCount, setTotalCount]   = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading]     = useState(true);
  const [stats, setStats]             = useState({ total: 0, avgMatch: 0, active: 0, generated: 0 });

  // ─── Drawer ───────────────────────────────────────────────────────────────
  const [selectedJob, setSelectedJob]               = useState<JobPost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen]             = useState(false);
  const [drawerActiveTab, setDrawerActiveTab]       = useState<"details" | "templates">("templates");
  const [templateActiveTab, setTemplateActiveTab]   = useState<string>("coldEmail");
  const [copiedStates, setCopiedStates]             = useState<Record<string, boolean>>({});
  const [notesText, setNotesText]                   = useState("");

  // ─── Email compose drawer ──────────────────────────────────────────
  const [isComposeOpen, setIsComposeOpen]           = useState(false);
  const [composeBody, setComposeBody]               = useState(""); // pre-fill body

  // ─── Inline template editing ────────────────────────────────────────
  const [editingKey, setEditingKey]                 = useState<string | null>(null);
  const [editingText, setEditingText]               = useState("");

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // ─── Data loading ──────────────────────────────────────────────────────────
  const loadJobs = async () => {
    if (!userEmail) return;
    setIsLoading(true);
    try {
      const res = await getJobPostsAction({
        userEmail,
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        status: statusFilter,
      });
      setJobs(res.jobs);
      setTotalCount(res.totalCount);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, currentPage, searchQuery, statusFilter]);

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
      } else {
        const isOutOfTokens = result.error?.includes("OUT_OF_TOKENS") || result.error?.includes("Out of tokens");
        alert(isOutOfTokens ? "⚠️ Out of tokens! Please visit the AI Credit Portal in the sidebar to buy credits." : (result.error || "Regeneration failed"));
      }
    } catch (err: any) {
      const isOutOfTokens = err?.message?.includes("OUT_OF_TOKENS") || err?.message?.includes("Out of tokens");
      alert(isOutOfTokens ? "⚠️ Out of tokens! Please visit the AI Credit Portal in the sidebar to buy credits." : "Regeneration failed");
    }
  };

  // ─── Inline template edit handlers ───────────────────────────────────
  const startEditingTemplate = (key: string, text: string) => {
    setEditingKey(key);
    setEditingText(text);
  };

  const cancelEditingTemplate = () => {
    setEditingKey(null);
    setEditingText("");
  };

  const saveEditingTemplate = async () => {
    if (!selectedJob || !editingKey) return;
    const updated = {
      ...selectedJob,
      generatedTemplates: {
        ...(selectedJob.generatedTemplates ?? {}),
        [editingKey]: editingText,
      },
    };
    setSelectedJob(updated);
    setEditingKey(null);
    setEditingText("");
    await updateJobPostAction(updated);
    await loadJobs();
  };

  // ─── Open compose drawer ──────────────────────────────────────────────
  const openCompose = (body: string) => {
    setComposeBody(body);
    setIsComposeOpen(true);
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

  // ─── Computed paginated list ──────────────────────────────────────────────
  const paginatedJobs = jobs;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    // state
    jobs,
    isLoading,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    selectedJob, setSelectedJob,
    isDrawerOpen, setIsDrawerOpen,
    drawerActiveTab, setDrawerActiveTab,
    templateActiveTab, setTemplateActiveTab,
    copiedStates,
    notesText, setNotesText,
    // compose
    isComposeOpen, setIsComposeOpen, composeBody, openCompose,
    // inline edit
    editingKey, editingText, setEditingText,
    startEditingTemplate, cancelEditingTemplate, saveEditingTemplate,
    // computed
    stats, paginatedJobs, totalPages, currentPage, setCurrentPage, pageSize, totalCount,
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
