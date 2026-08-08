"use client";

import { useState, useEffect, useMemo } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { addJobPostAction, getJobsByEmailAction } from "../actions/db-actions";
import { getAIStatusAction, generateProposalsAction, getAvailableProvidersAction, analyzeJobCandidacyAction } from "../actions/ai-actions";
import type { ExistingJobSnippet } from "../actions/ai-actions";
import { extractEmailFromText, detectPlatform, platformTemplates, type Platform } from "../utils/platform-detector";
import type { UserProfile } from "../utils/db";
import type { JobPost } from "../utils/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DuplicateState {
  existingJob: JobPost;
  reason: string;
  confidence: number;
}

export type DrawerStep = "idle" | "checking" | "analysis" | "duplicate" | "platforms" | "generating" | "results";

export type AIModel = "gemini" | "claude" | "openai" | "auto";

export const ALL_PLATFORMS = [
  { key: "proposal",    label: "Upwork Proposal",    icon: "🔵", desc: "Freelance bid for Upwork" },
  { key: "coldEmail",   label: "Cold Email",          icon: "📧", desc: "Professional email outreach" },
  { key: "linkedin",    label: "LinkedIn Message",    icon: "💼", desc: "Connection note (≤280 chars)" },
  { key: "whatsapp",   label: "WhatsApp Message",    icon: "💬", desc: "Casual chat introduction" },
  { key: "freelancer",  label: "Freelancer Bid",      icon: "🔗", desc: "Freelancer.com project bid" },
  { key: "coverLetter", label: "Cover Letter",        icon: "📄", desc: "Formal application letter" },
] as const;

export type PlatformKey = typeof ALL_PLATFORMS[number]["key"];

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useJobScanner(userEmail: string, profile: UserProfile | null) {
  const router = useRouter();

  // ─── Paste state ──────────────────────────────────────────────────────────
  const [pasteText, setPasteText]             = useState("");
  const [waMessageId, setWaMessageId]         = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ─── AI status ────────────────────────────────────────────────────────────
  const [aiProvider, setAiProvider]     = useState<string | null>(null);
  const [aiAvailable, setAiAvailable]   = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // ─── Has the user clicked Analyze Job yet? ───────────────────────────
  // Only true after button click — prevents live heuristics from showing on paste
  const [hasAnalyzed, setHasAnalyzed]   = useState(false);

  // ─── AI candidacy analysis state ───────────────────────────────────────
  const [aiCandidacy, setAiCandidacy] = useState<{
    score: number;
    role: string;
    company: string;
    contactEmail: string;
    contactCc?: string;
    contactBcc?: string;
    contactPhone: string;
    explanation: string;
    matchedSkills: string[];
    missingSkills: string[];
    isDuplicate?: boolean;
    duplicateJobId?: string;
    duplicateReason?: string;
  } | null>(null);
  const [isCandidacyLoading, setIsCandidacyLoading] = useState(false);

  useEffect(() => {
    getAIStatusAction().then(({ available, provider }) => {
      setAiAvailable(available);
      setAiProvider(provider);
    });
    getAvailableProvidersAction().then(({ providers }) => {
      setAvailableModels(providers);
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const text = params.get("text");
      const waMsgId = params.get("waMessageId");
      if (text) setPasteText(text);
      if (waMsgId) setWaMessageId(waMsgId);
    }
  }, []);

  // ─── On-demand candidacy analysis ────────────────────────────────────────────────────
  // Accepts optional existing jobs from DB for unified duplicate detection.
  const triggerCandidacyAnalysis = async (
    text: string,
    existingJobs?: ExistingJobSnippet[]
  ) => {
    if (!text.trim() || text.length < 40 || !userEmail) {
      setAiCandidacy(null);
      setIsCandidacyLoading(false);
      return null;
    }
    setIsCandidacyLoading(true);
    try {
      const result = await analyzeJobCandidacyAction(text, userEmail, existingJobs);
      if (result.success) {
        const candidacy = {
          score:          result.score        ?? 50,
          role:           result.role         ?? "Unknown",
          company:        result.company      ?? "Not specified",
          contactEmail:   result.contactEmail ?? "",
          contactCc:      result.contactCc    ?? "",
          contactBcc:     result.contactBcc   ?? "",
          contactPhone:   result.contactPhone ?? "",
          explanation:    result.explanation  ?? "",
          matchedSkills:  result.matchedSkills ?? [],
          missingSkills:  result.missingSkills ?? [],
          isDuplicate:    result.isDuplicate,
          duplicateJobId: result.duplicateJobId,
          duplicateReason: result.duplicateReason,
        };
        setAiCandidacy(candidacy);
        return candidacy;
      } else {
        setAiCandidacy(null);
        setGenerationError(result.error || "AI candidacy analysis failed");
        return null;
      }
    } catch (err: any) {
      setAiCandidacy(null);
      setGenerationError(err?.message || "AI candidacy analysis failed");
      return null;
    } finally {
      setIsCandidacyLoading(false);
    }
  };

  // Reset AI candidacy when text is cleared
  useEffect(() => {
    if (!pasteText.trim()) {
      setAiCandidacy(null);
      setIsCandidacyLoading(false);
      setHasAnalyzed(false);  // reset gate so panel goes back to empty state
    }
  }, [pasteText]);

  // ─── Platform detection (live) ────────────────────────────────────────────
  const platform: Platform = useMemo(() => {
    if (!pasteText.trim()) return "generic";
    return detectPlatform(pasteText);
  }, [pasteText]);

  // ─── Live heuristics ──────────────────────────────────────────────────────
  const liveHeuristics = useMemo(() => {
    if (!pasteText.trim()) return null;

    // ── Extract contact email ──────────────────────────────────────────────
    const email = extractEmailFromText(pasteText) || "Not found";

    // ── Identify role from job post ────────────────────────────────────────
    const ROLE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
      { pattern: /video\s*edit/i,            label: "Video Editor" },
      { pattern: /graphic\s*design/i,        label: "Graphic Designer" },
      { pattern: /content\s*writ/i,          label: "Content Writer" },
      { pattern: /digital\s*market/i,        label: "Digital Marketer" },
      { pattern: /seo\s*(expert|specialist)/i, label: "SEO Expert" },
      { pattern: /data\s*(analyst|science)/i, label: "Data Analyst" },
      { pattern: /python/i,                  label: "Python Developer" },
      { pattern: /flutter/i,                 label: "Flutter Developer" },
      { pattern: /react\s*native/i,          label: "React Native Developer" },
      { pattern: /react\.?js|reactjs/i,      label: "React.js Engineer" },
      { pattern: /next\.?js|nextjs/i,        label: "Next.js Developer" },
      { pattern: /wordpress|webflow/i,       label: "WordPress/Webflow Developer" },
      { pattern: /full.?stack/i,             label: "Full Stack Developer" },
      { pattern: /front.?end/i,              label: "Frontend Developer" },
      { pattern: /back.?end/i,               label: "Backend Developer" },
      { pattern: /mobile\s*(app|dev)/i,      label: "Mobile App Developer" },
      { pattern: /web\s*dev/i,               label: "Web Developer" },
      { pattern: /ui.?ux|ui\s*design/i,      label: "UI/UX Designer" },
      { pattern: /node\.?js/i,               label: "Node.js Developer" },
      { pattern: /devops/i,                  label: "DevOps Engineer" },
      { pattern: /product\s*manag/i,         label: "Product Manager" },
      { pattern: /project\s*manag/i,         label: "Project Manager" },
    ];
    const detectedRole = ROLE_PATTERNS.find(r => r.pattern.test(pasteText));
    const role = detectedRole?.label || "Developer (General)";

    // ── Identify company ──────────────────────────────────────────────────
    const companyMatch = pasteText.match(
      /(?:at|@|company[:\s]|firm[:\s])\s*([A-Z][A-Za-z0-9 &.,'-]{2,30})/
    );
    const company = companyMatch?.[1]?.trim() || "Not specified";

    // ── Match score ───────────────────────────────────────────────────────
    let score = 0;
    let matchedSkills: string[] = [];

    if (profile && profile.skills.length > 0) {
      // 1. Exact skill keyword matches in the job text
      matchedSkills = profile.skills.filter(skill => {
        const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(pasteText);
      });

      const totalUserSkills = profile.skills.length;
      const overlapRatio = matchedSkills.length / Math.max(totalUserSkills, 1);

      // 2. Domain-level matching — handles vague posts that don't list specific stacks
      const userRoleWords     = (profile.role || "").toLowerCase();
      const detectedRoleLower = (detectedRole?.label || "").toLowerCase();
      const jobPostLower      = pasteText.toLowerCase();

      const DEV_DOMAIN       = ["developer", "engineer", "dev", "full", "stack", "tech", "code", "software", "web", "frontend", "backend", "mobile"];
      const DESIGN_DOMAIN    = ["designer", "design", "ui", "ux", "figma", "creative"];
      const CONTENT_DOMAIN   = ["writer", "content", "copywriter", "seo", "blog", "editor"];
      const DATA_DOMAIN      = ["data", "analyst", "ml", "ai", "machine", "python", "science"];
      const MARKETING_DOMAIN = ["marketing", "growth", "ads", "social", "digital", "brand"];

      const inDomain = (domains: string[], source: string) =>
        domains.some(w => source.includes(w));

      const domainMatch =
        (inDomain(DEV_DOMAIN,       userRoleWords) && (inDomain(DEV_DOMAIN,       detectedRoleLower) || inDomain(DEV_DOMAIN,       jobPostLower))) ||
        (inDomain(DESIGN_DOMAIN,    userRoleWords) && inDomain(DESIGN_DOMAIN,    detectedRoleLower)) ||
        (inDomain(CONTENT_DOMAIN,   userRoleWords) && inDomain(CONTENT_DOMAIN,   detectedRoleLower)) ||
        (inDomain(DATA_DOMAIN,      userRoleWords) && inDomain(DATA_DOMAIN,      detectedRoleLower)) ||
        (inDomain(MARKETING_DOMAIN, userRoleWords) && inDomain(MARKETING_DOMAIN, detectedRoleLower));

      const isRoleMismatch = detectedRole && !domainMatch;

      if (matchedSkills.length === 0) {
        // No exact keywords — use domain alignment as the signal
        if (domainMatch) {
          // Same field, vague post (no specific stack listed) → honest mid-range
          score = 48;
        } else if (isRoleMismatch) {
          // Clearly different field (e.g. user=Dev, job=Content Writer)
          score = 12;
        } else {
          // Unknown / couldn't determine
          score = 25;
        }
      } else {
        // Has keyword matches: base + overlap bonus + domain bonus
        const overlapBonus = Math.round(overlapRatio * 55);
        score = (domainMatch ? 42 : 35) + overlapBonus;
      }
    } else {
      score = 50; // no profile yet — neutral
    }

    return { role, company, email, score: Math.min(Math.max(score, 5), 100), matchedSkills };

  }, [pasteText, profile]);

  // ─── Drawer state ─────────────────────────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen]         = useState(false);
  const [drawerStep, setDrawerStep]             = useState<DrawerStep>("idle");
  const [duplicateState, setDuplicateState]     = useState<DuplicateState | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(
    new Set<PlatformKey>(["coldEmail"])   // updated dynamically on drawer open based on detected platform
  );
  const [selectedModel, setSelectedModel]       = useState<AIModel>("auto");
  const [generatedProposals, setGeneratedProposals] = useState<Record<string, string>>({});
  const [parsedJobData, setParsedJobData] = useState<{
    role: string; company: string; contactName: string;
    contactEmail: string; contactCc?: string; contactBcc?: string;
    matchScore: number; tags: string[]; parsedSummary: string;
  } | null>(null);
  const [activeResultTab, setActiveResultTab]   = useState<string>("");
  const [isSavingJob, setIsSavingJob]           = useState(false);
  const [jobSavedId, setJobSavedId]             = useState<string | null>(null);
  const [suggestAttachResume, setSuggestAttachResume] = useState<boolean | undefined>(undefined);

  // ─── Toggle platform selection ─────────────────────────────────────────────
  const togglePlatform = (key: PlatformKey) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ─── Open drawer: UNIFIED flow (single AI call) ──────────────────────────────
  // 1. Extract email from job post
  // 2. If email found → fetch existing jobs from DB
  // 3. Single AI call: profile + job post + existingJobs → score + isDuplicate + contact
  // 4. If isDuplicate → show duplicate step; else → show platforms step
  const handleOpenDrawer = async () => {
    if (!pasteText.trim()) return;
    setGenerationError(null);
    setDuplicateState(null);
    setGeneratedProposals({});
    setParsedJobData(null);
    setJobSavedId(null);
    setHasAnalyzed(true);

    // Pre-select platforms
    const detectedPlatform = detectPlatform(pasteText);
    const suggested = platformTemplates(detectedPlatform) as PlatformKey[];
    setSelectedPlatforms(new Set(suggested.length > 0 ? suggested : ["coldEmail" as PlatformKey]));

    setIsDrawerOpen(true);
    setDrawerStep("checking");

    // Step 1: extract email
    const email = extractEmailFromText(pasteText);
    let existingJobs: ExistingJobSnippet[] = [];

    // Step 2: if email found → fetch existing jobs from DB
    if (email) {
      try {
        const rows = await getJobsByEmailAction(email);
        existingJobs = rows.map(j => ({
          id:           j.id,
          role:         j.role,
          company:      j.company,
          originalText: j.originalText,
        }));
      } catch (err) {
        console.warn("[useJobScanner] DB fetch failed:", err);
      }
    }

    // Step 3: single AI call (candidacy score + duplicate check)
    const candidacy = await triggerCandidacyAnalysis(pasteText, existingJobs);
    if (!candidacy) {
      setDrawerStep("idle");
      return;
    }

    // Step 4: if duplicate detected → show duplicate step
    if (candidacy.isDuplicate && candidacy.duplicateJobId) {
      const fullRows = email ? await getJobsByEmailAction(email).catch(() => []) : [];
      const existingFull = fullRows.find(j => j.id === candidacy.duplicateJobId);
      if (existingFull) {
        setDuplicateState({
          existingJob: existingFull,
          reason: candidacy.duplicateReason || "AI detected this as a duplicate posting.",
          confidence: 80,
        });
        setDrawerStep("duplicate");
        return;
      }
    }

    setDrawerStep("analysis");
  };

  // ─── Continue from analysis → platform selection ──────────────────────────
  const handleContinueToTemplates = () => {
    setDrawerStep("platforms");
  };

  // ─── User chooses to continue despite duplicate ────────────────────────────
  const handleContinueDespiteDuplicate = () => {
    setDuplicateState(null);
    setDrawerStep("platforms");
  };

  // ─── User clicks "Go to existing job" ─────────────────────────────────────
  const handleGoToExistingJob = () => {
    if (!duplicateState) return;
    const jobId = duplicateState.existingJob.id;
    setIsDrawerOpen(false);
    setDuplicateState(null);
    router.push(`/dashboard/jobs/${jobId}`);
  };

  // ─── Generate proposals ────────────────────────────────────────────────────
  const handleGenerateProposals = async () => {
    if (!selectedPlatforms.size) return;
    setDrawerStep("generating");
    setGenerationError(null);

    const platformsArray = Array.from(selectedPlatforms);

    try {
      const result = await generateProposalsAction(
        pasteText,
        platformsArray,
        selectedModel,
        userEmail
      );

      if (!result.success || !result.results) {
        const isOutOfTokens = result.error?.includes("OUT_OF_TOKENS") || result.error?.includes("Out of tokens");
        setGenerationError(isOutOfTokens ? "⚠️ Out of tokens! Please visit the AI Credit Portal in the sidebar to buy credits." : (result.error || "Generation failed. Please try again."));
        setDrawerStep("platforms");
        return;
      }

      setGeneratedProposals(result.results);
      if (result.parsed) setParsedJobData(result.parsed);
      setSuggestAttachResume(result.suggestAttachResume);
      setActiveResultTab(platformsArray[0]);
      setDrawerStep("results");
    } catch (err: any) {
      const isOutOfTokens = err?.message?.includes("OUT_OF_TOKENS") || err?.message?.includes("Out of tokens");
      setGenerationError(isOutOfTokens ? "⚠️ Out of tokens! Please visit the AI Credit Portal in the sidebar to buy credits." : (err?.message || "Unexpected error during generation."));
      setDrawerStep("platforms");
    }
  };

  // ─── Save job to DB and close ──────────────────────────────────────────────
  const handleSaveAndClose = async () => {
    if (!parsedJobData) {
      setIsDrawerOpen(false);
      setPasteText("");
      return;
    }
    setIsSavingJob(true);
    try {
      const tags = [...parsedJobData.tags];
      if (parsedJobData.contactCc && !tags.some(t => t.startsWith("cc:"))) {
        tags.push(`cc:${parsedJobData.contactCc}`);
      }
      if (parsedJobData.contactBcc && !tags.some(t => t.startsWith("bcc:"))) {
        tags.push(`bcc:${parsedJobData.contactBcc}`);
      }

      const newJob = await addJobPostAction({
        userEmail,
        role:               parsedJobData.role,
        company:            parsedJobData.company,
        originalText:       pasteText,
        parsedSummary:      parsedJobData.parsedSummary,
        contactName:        parsedJobData.contactName,
        contactEmail:       parsedJobData.contactEmail,
        matchScore:         parsedJobData.matchScore,
        tags:               tags,
        notes:              "",
        generatedTemplates: generatedProposals as any,
        suggestAttachResume,
        waMessageId:        waMessageId ?? undefined,
      });
      setJobSavedId(newJob.id);
      setPasteText("");
      setIsDrawerOpen(false);
      router.push(`/dashboard/jobs/${newJob.id}`);
    } catch (err: any) {
      console.error("[useJobScanner] Failed to save job:", err);
      setGenerationError(err?.message || "Failed to save job post.");
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerStep("idle");
    setDuplicateState(null);
    setGeneratedProposals({});
    setParsedJobData(null);
  };

  // ─── Open drawer with STORED data (skip AI re-analysis) ─────────────────────────
  // Used by job detail page: job already has analysis data stored in DB.
  // Inject it into scanner state and jump straight to analysis step.
  const handleOpenWithStoredData = (data: {
    score: number;
    role: string;
    company: string;
    contactEmail: string;
    contactCc?: string;
    contactBcc?: string;
    contactPhone: string;
    explanation: string;
    matchedSkills: string[];
    missingSkills: string[];
  }) => {
    setGenerationError(null);
    setDuplicateState(null);
    setGeneratedProposals({});
    setParsedJobData(null);

    // Detect platform from text and pre-select templates
    const detectedPlatform = detectPlatform(pasteText);
    const suggested = platformTemplates(detectedPlatform) as PlatformKey[];
    setSelectedPlatforms(new Set(suggested.length > 0 ? suggested : ["coldEmail" as PlatformKey]));

    // Inject stored candidacy data
    setAiCandidacy(data);
    setIsCandidacyLoading(false);
    setHasAnalyzed(true);

    // Open at 'analysis' so user sees the stored score/details, then continues to platforms
    setIsDrawerOpen(true);
    setDrawerStep("analysis");
  };

  // ─── Edit a single generated proposal inline ──────────────────────────────
  const handleEditProposal = (tab: string, newText: string) => {
    setGeneratedProposals(prev => ({ ...prev, [tab]: newText }));
  };

  // ─── Legacy form handler (kept for backward compat if needed) ─────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleOpenDrawer();
  };

  // ─── Duplicate action handlers (legacy compat) ────────────────────────────
  const handleIgnoreDuplicate = () => handleContinueDespiteDuplicate();
  const handleDismissDuplicate = () => { setDuplicateState(null); handleCloseDrawer(); };

  return {
    // Paste
    pasteText, setPasteText,
    generationError, setGenerationError,
    // AI status
    aiProvider, aiAvailable, availableModels,
    // Platform detection
    platform,
    liveHeuristics,
    // AI candidacy
    aiCandidacy, isCandidacyLoading,
    // Drawer
    isDrawerOpen, drawerStep,
    duplicateState,
    selectedPlatforms, togglePlatform,
    selectedModel, setSelectedModel,
    generatedProposals, parsedJobData,
    suggestAttachResume,
    activeResultTab, setActiveResultTab,
    handleEditProposal,
    isSavingJob, jobSavedId,
    // Handlers
    handleGenerate,
    handleOpenDrawer,
    handleCloseDrawer,
    handleContinueDespiteDuplicate,
    handleGoToExistingJob,
    handleGenerateProposals,
    handleSaveAndClose,
    // Legacy
    handleIgnoreDuplicate,
    handleDismissDuplicate,
    // These are no longer used but kept to avoid breaking anything
    isGenerating: drawerStep === "generating",
    isCheckingDuplicate: drawerStep === "checking" && isDrawerOpen,
    generationStep: 0,
    lastUsedProvider: aiProvider,
    handleContinueToTemplates,
    triggerCandidacyAnalysis,
    hasAnalyzed,
    handleOpenWithStoredData,
  };
}
