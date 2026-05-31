// ─── AI Service: Provider-Agnostic Orchestrator ───────────────────────────
// Reads AI_PROVIDER from env, creates the right adapter, generates content.
// Falls back to heuristic templates if no provider is configured.

import { AIProviderAdapter, AIProviderName, TemplateType, GeneratedTemplates, ParsedJobData } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
import { ClaudeProvider } from "./providers/claude";
import { OllamaProvider } from "./providers/ollama";
import { buildPromptForTemplate, buildJobAnalysisPrompt } from "./prompts";
import { UserProfile } from "../db";

// ─── Provider Factory ──────────────────────────────────────────────────────

function createProvider(): AIProviderAdapter | null {
  const providerName = (process.env.AI_PROVIDER || "").toLowerCase() as AIProviderName;

  // Try explicit provider first
  switch (providerName) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) { console.warn("[AI Service] AI_PROVIDER=gemini but GEMINI_API_KEY is not set"); return null; }
      const model = process.env.GEMINI_MODEL || undefined;
      return new GeminiProvider(key, model);
    }
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) { console.warn("[AI Service] AI_PROVIDER=openai but OPENAI_API_KEY is not set"); return null; }
      const model = process.env.OPENAI_MODEL || undefined;
      const baseUrl = process.env.OPENAI_BASE_URL || undefined;
      return new OpenAIProvider(key, model, baseUrl);
    }
    case "claude": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) { console.warn("[AI Service] AI_PROVIDER=claude but ANTHROPIC_API_KEY is not set"); return null; }
      const model = process.env.ANTHROPIC_MODEL || undefined;
      return new ClaudeProvider(key, model);
    }
    case "ollama": {
      const host = process.env.OLLAMA_HOST || undefined;
      const model = process.env.OLLAMA_MODEL || undefined;
      return new OllamaProvider(host, model);
    }
  }

  // Auto-detect: try to find any configured key
  if (process.env.GEMINI_API_KEY) return new GeminiProvider(process.env.GEMINI_API_KEY);
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider(process.env.OPENAI_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeProvider(process.env.ANTHROPIC_API_KEY);

  // No provider configured
  return null;
}

// Singleton-ish: create once per server lifecycle
let _provider: AIProviderAdapter | null | undefined;

function getProvider(): AIProviderAdapter | null {
  if (_provider === undefined) {
    _provider = createProvider();
    if (_provider) {
      console.log(`[AI Service] Using provider: ${_provider.name}`);
    } else {
      console.log("[AI Service] No AI provider configured — using heuristic fallback");
    }
  }
  return _provider;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Check if an AI provider is available
 */
export function isAIAvailable(): boolean {
  return getProvider() !== null;
}

/**
 * Get the name of the active provider
 */
export function getActiveProviderName(): AIProviderName | null {
  const provider = getProvider();
  return provider?.name || null;
}

/**
 * Generate a single outreach template using AI
 */
export async function generateTemplate(
  type: TemplateType,
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No AI provider configured");
  }

  const { systemPrompt, userPrompt } = buildPromptForTemplate(type, jobText, profile, parsed);

  console.log(`[AI Service] Generating ${type} template via ${provider.name}...`);
  const start = Date.now();

  const result = await provider.generate({
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: type === "linkedin" ? 512 : 2048,
  });

  console.log(`[AI Service] Generated ${type} in ${Date.now() - start}ms (${result.length} chars)`);
  return result;
}

/**
 * Generate ALL four outreach templates in parallel using AI
 */
export async function generateAllTemplates(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
): Promise<GeneratedTemplates> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No AI provider configured");
  }

  const types: TemplateType[] = ["coldEmail", "proposal", "linkedin", "coverLetter"];

  console.log(`[AI Service] Generating all 4 templates via ${provider.name}...`);
  const start = Date.now();

  // Run all 4 in parallel for speed
  const results = await Promise.all(
    types.map(async (type) => {
      try {
        const content = await generateTemplate(type, jobText, profile, parsed);
        return { type, content };
      } catch (error) {
        console.error(`[AI Service] Failed to generate ${type}:`, error);
        return { type, content: `[Generation failed for ${type}. Please try again.]` };
      }
    })
  );

  const templates: GeneratedTemplates = {
    coldEmail: "",
    proposal: "",
    linkedin: "",
    coverLetter: "",
  };

  for (const { type, content } of results) {
    templates[type] = content;
  }

  console.log(`[AI Service] All 4 templates generated in ${Date.now() - start}ms`);
  return templates;
}

/**
 * Use AI to analyze a job posting and extract structured data
 */
export async function analyzeJobWithAI(
  jobText: string,
  profile: UserProfile
): Promise<ParsedJobData | null> {
  const provider = getProvider();
  if (!provider) return null;

  try {
    const { systemPrompt, userPrompt } = buildJobAnalysisPrompt(jobText, profile);

    const rawResponse = await provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.3, // low temperature for structured extraction
      maxTokens: 1024,
    });

    // Try to parse JSON from the response
    // Sometimes models wrap in code blocks, so strip those
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    return {
      role: parsed.role || "Frontend Engineer",
      company: parsed.company || "Company",
      contactName: parsed.contactName || "Hiring Team",
      contactEmail: parsed.contactEmail || "",
      matchScore: 0, // will be computed by heuristics
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      parsedSummary: parsed.summary || jsonStr.substring(0, 200),
      notes: "",
    };
  } catch (error) {
    console.error("[AI Service] Job analysis with AI failed, falling back:", error);
    return null;
  }
}
