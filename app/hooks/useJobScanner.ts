"use client";

import { useState, useEffect, useMemo } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { addJobPostAction, getJobsByEmailAction } from "../actions/db-actions";
import { analyzeAndGenerateAction, getAIStatusAction, compareDuplicatePostsAction } from "../actions/ai-actions";
import { extractEmailFromText, detectPlatform, type Platform } from "../utils/platform-detector";
import type { UserProfile } from "../utils/db";
import type { JobPost } from "../utils/db";

// ─── Duplicate state type ───────────────────────────────────────────────────
export interface DuplicateState {
  existingJob: JobPost;
  reason: string;
  confidence: number;
}

export function useJobScanner(userEmail: string, profile: UserProfile | null) {
  const router = useRouter();

  // ─── Paste & generation state ──────────────────────────────────────────────
  const [pasteText, setPasteText]               = useState("");
  const [isGenerating, setIsGenerating]         = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [generationStep, setGenerationStep]     = useState(0);
  const [generationError, setGenerationError]   = useState<string | null>(null);
  const [lastUsedProvider, setLastUsedProvider]  = useState<string | null>(null);

  // ─── Duplicate detection ──────────────────────────────────────────────────
  const [duplicateState, setDuplicateState]     = useState<DuplicateState | null>(null);

  // ─── AI status ────────────────────────────────────────────────────────────
  const [aiProvider, setAiProvider]   = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    getAIStatusAction().then(({ available, provider }) => {
      setAiAvailable(available);
      setAiProvider(provider);
    });
  }, []);

  // ─── Platform detection (live, from paste text) ───────────────────────────
  const platform: Platform = useMemo(() => {
    if (!pasteText.trim()) return "generic";
    return detectPlatform(pasteText);
  }, [pasteText]);

  // ─── Live heuristics (computed from paste text + profile) ─────────────────
  const liveHeuristics = useMemo(() => {
    if (!pasteText.trim()) return null;

    const email = extractEmailFromText(pasteText) || "Looking...";

    let role = "Analyzing...";
    if (/react/i.test(pasteText))        role = "React.js Engineer";
    else if (/flutter/i.test(pasteText)) role = "Flutter Support Engineer";
    else if (/product/i.test(pasteText)) role = "Product Architect";

    let company = "Analyzing...";
    if (/Zvart/i.test(pasteText))        company = "Zvart Manukyan Dev";
    else if (/Vercel/i.test(pasteText))  company = "Vercel Corp";
    else if (/Linear/i.test(pasteText))  company = "Linear App";

    let score = 70;
    if (profile) {
      const matched = profile.skills.filter(skill => {
        const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(pasteText);
      });
      score = 65 + Math.min(matched.length * 4, 30);
    } else {
      if (/react/i.test(pasteText))   score += 15;
      if (/flutter/i.test(pasteText)) score += 10;
    }

    return { role, company, email, score: Math.min(score, 100) };
  }, [pasteText, profile]);

  // ─── Duplicate check (called before generation) ───────────────────────────
  const checkForDuplicate = async (): Promise<boolean> => {
    const email = extractEmailFromText(pasteText);
    if (!email) return false; // no email → can't check → no duplicate

    setIsCheckingDuplicate(true);
    try {
      const existingJobs = await getJobsByEmailAction(email);
      if (existingJobs.length === 0) return false;

      // Compare against each existing job (most recent first)
      for (const existing of existingJobs) {
        const comparison = await compareDuplicatePostsAction(existing.originalText, pasteText);
        if (comparison.isSame) {
          setDuplicateState({
            existingJob: existing,
            reason: comparison.reason,
            confidence: comparison.confidence,
          });
          return true; // duplicate found — block generation
        }
      }
      return false;
    } catch (err) {
      console.warn("Duplicate check failed, proceeding:", err);
      return false;
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // ─── Generate handler ──────────────────────────────────────────────────────
  const runGeneration = async () => {
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

      // Check if ALL templates failed — don't save garbage to DB
      const templates = analysis.generatedTemplates;
      if (templates) {
        const allFailed = Object.values(templates).every(
          (v) => !v || v.startsWith("[Generation failed")
        );
        if (allFailed) {
          setGenerationError("All templates failed to generate. Check your API key and model configuration, then try again.");
          setIsGenerating(false);
          return;
        }
      }

      const newJob = await addJobPostAction({
        role:               analysis.role,
        company:            analysis.company,
        originalText:       pasteText,
        parsedSummary:      analysis.parsedSummary,
        contactName:        analysis.contactName,
        contactEmail:       analysis.contactEmail,
        matchScore:         analysis.matchScore,
        tags:               analysis.tags,
        notes:              analysis.notes,
        generatedTemplates: analysis.generatedTemplates,
      });

      setPasteText("");
      setIsGenerating(false);
      router.push(`/dashboard?job=${newJob.id}`);
    } catch (err) {
      clearInterval(stepInterval);
      console.error("Failed to generate:", err);
      setGenerationError(err instanceof Error ? err.message : "Unexpected error during generation.");
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    // Step 1: Check for duplicates first
    const isDuplicate = await checkForDuplicate();
    if (isDuplicate) return; // blocked — user sees the DuplicateAlert UI

    // Step 2: No duplicate → generate
    await runGeneration();
  };

  // ─── Duplicate action handlers ────────────────────────────────────────────
  const handleGoToExistingJob = () => {
    if (!duplicateState) return;
    const jobId = duplicateState.existingJob.id;
    setDuplicateState(null);
    router.push(`/dashboard?job=${jobId}`);
  };

  const handleIgnoreDuplicate = async () => {
    setDuplicateState(null);
    await runGeneration();
  };

  const handleDismissDuplicate = () => {
    setDuplicateState(null);
  };

  return {
    pasteText, setPasteText,
    isGenerating, generationStep,
    isCheckingDuplicate,
    generationError, setGenerationError,
    lastUsedProvider,
    aiProvider, aiAvailable,
    platform,
    liveHeuristics,
    handleGenerate,
    // duplicate
    duplicateState,
    handleGoToExistingJob,
    handleIgnoreDuplicate,
    handleDismissDuplicate,
  };
}
