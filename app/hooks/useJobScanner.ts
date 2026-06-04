"use client";

import { useState, useEffect, useMemo } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { addJobPostAction, getJobsByEmailAction } from "../actions/db-actions";
import { getAIStatusAction, compareDuplicatePostsAction, generateProposalsAction, getAvailableProvidersAction, analyzeJobCandidacyAction } from "../actions/ai-actions";
import { extractEmailFromText, detectPlatform, platformTemplates, type Platform } from "../utils/platform-detector";
import type { UserProfile } from "../utils/db";
import type { JobPost } from "../utils/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DuplicateState {
  existingJob: JobPost;
  reason: string;
  confidence: number;
}

export type DrawerStep = "checking" | "duplicate" | "platforms" | "generating" | "results";

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
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ─── AI status ────────────────────────────────────────────────────────────
  const [aiProvider, setAiProvider]     = useState<string | null>(null);
  const [aiAvailable, setAiAvailable]   = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // ─── AI candidacy analysis state ───────────────────────────────────────
  const [aiCandidacy, setAiCandidacy] = useState<{
    score: number;
    role: string;
    company: string;
    contactEmail: string;
    contactPhone: string;
    explanation: string;
    matchedSkills: string[];
    missingSkills: string[];
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

  // ─── Debounced AI candidacy analysis (triggers 1.2s after user stops typing) ────
  useEffect(() => {
    // Reset AI candidacy when text is cleared
    if (!pasteText.trim() || pasteText.length < 40) {
      setAiCandidacy(null);
      setIsCandidacyLoading(false);
      return;
    }

    if (!userEmail) return;

    setIsCandidacyLoading(true);

    const timer = setTimeout(async () => {
      try {
        const result = await analyzeJobCandidacyAction(pasteText, userEmail);
        if (result.success) {
          setAiCandidacy({
            score:         result.score        ?? 50,
            role:          result.role         ?? "Unknown",
            company:       result.company      ?? "Not specified",
            contactEmail:  result.contactEmail ?? "",
            contactPhone:  result.contactPhone ?? "",
            explanation:   result.explanation  ?? "",
            matchedSkills: result.matchedSkills ?? [],
            missingSkills: result.missingSkills ?? [],
          });
        } else {
          setAiCandidacy(null); // fall back to heuristics silently
        }
      } catch {
        setAiCandidacy(null);
      } finally {
        setIsCandidacyLoading(false);
      }
    }, 1200); // 1.2s debounce

    return () => clearTimeout(timer);
  }, [pasteText, userEmail]);

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
  const [drawerStep, setDrawerStep]             = useState<DrawerStep>("checking");
  const [duplicateState, setDuplicateState]     = useState<DuplicateState | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(
    new Set<PlatformKey>(["coldEmail"])   // updated dynamically on drawer open based on detected platform
  );
  const [selectedModel, setSelectedModel]       = useState<AIModel>("auto");
  const [generatedProposals, setGeneratedProposals] = useState<Record<string, string>>({});
  const [parsedJobData, setParsedJobData] = useState<{
    role: string; company: string; contactName: string;
    contactEmail: string; matchScore: number; tags: string[]; parsedSummary: string;
  } | null>(null);
  const [activeResultTab, setActiveResultTab]   = useState<string>("");
  const [isSavingJob, setIsSavingJob]           = useState(false);
  const [jobSavedId, setJobSavedId]             = useState<string | null>(null);

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

  // ─── Open drawer: check duplicate first ───────────────────────────────────
  const handleOpenDrawer = async () => {
    if (!pasteText.trim()) return;
    setGenerationError(null);
    setDuplicateState(null);
    setGeneratedProposals({});
    setParsedJobData(null);
    setJobSavedId(null);

    // Pre-select platforms based on detected platform
    const detectedPlatform = detectPlatform(pasteText);
    const suggested = platformTemplates(detectedPlatform) as PlatformKey[];
    // If only one suggestion and it's generic, add coldEmail as fallback
    const defaults = suggested.length > 0 ? suggested : ["coldEmail"] as PlatformKey[];
    setSelectedPlatforms(new Set(defaults));

    setIsDrawerOpen(true);
    setDrawerStep("checking");

    // Extract email and check for duplicates
    const email = extractEmailFromText(pasteText);
    if (email) {
      try {
        const existingJobs = await getJobsByEmailAction(email);
        if (existingJobs.length > 0) {
          for (const existing of existingJobs) {
            const comparison = await compareDuplicatePostsAction(existing.originalText, pasteText);
            if (comparison.isSame) {
              setDuplicateState({
                existingJob: existing,
                reason: comparison.reason,
                confidence: comparison.confidence,
              });
              setDrawerStep("duplicate");
              return;
            }
          }
        }
      } catch (err) {
        console.warn("[useJobScanner] Duplicate check failed, proceeding:", err);
      }
    }

    // No duplicate → go to platform selection
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
    router.push(`/dashboard?job=${jobId}`);
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
        setGenerationError(result.error || "Generation failed. Please try again.");
        setDrawerStep("platforms");
        return;
      }

      setGeneratedProposals(result.results);
      if (result.parsed) setParsedJobData(result.parsed);
      setActiveResultTab(platformsArray[0]);
      setDrawerStep("results");
    } catch (err: any) {
      setGenerationError(err?.message || "Unexpected error during generation.");
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
      const newJob = await addJobPostAction({
        role:               parsedJobData.role,
        company:            parsedJobData.company,
        originalText:       pasteText,
        parsedSummary:      parsedJobData.parsedSummary,
        contactName:        parsedJobData.contactName,
        contactEmail:       parsedJobData.contactEmail,
        matchScore:         parsedJobData.matchScore,
        tags:               parsedJobData.tags,
        notes:              "",
        generatedTemplates: generatedProposals as any,
      });
      setJobSavedId(newJob.id);
      setPasteText("");
      setIsDrawerOpen(false);
      router.push(`/dashboard?job=${newJob.id}`);
    } catch (err: any) {
      console.error("[useJobScanner] Failed to save job:", err);
      setGenerationError(err?.message || "Failed to save job post.");
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerStep("checking");
    setDuplicateState(null);
    setGeneratedProposals({});
    setParsedJobData(null);
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
  };
}
