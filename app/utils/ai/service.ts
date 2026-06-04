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

export function getProvider(): AIProviderAdapter | null {
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
 * Get all configured (available) providers so the UI can show a model picker.
 * Returns an array of provider names that have API keys set.
 */
export function getAvailableProviders(): AIProviderName[] {
  const available: AIProviderName[] = [];
  if (process.env.GEMINI_API_KEY)    available.push("gemini");
  if (process.env.OPENAI_API_KEY)    available.push("openai");
  if (process.env.ANTHROPIC_API_KEY) available.push("claude");
  return available;
}

/**
 * Create a one-off provider instance for a specific provider name.
 * Used by generateProposalsAction to let the user pick their model.
 */
function createProviderByName(name: AIProviderName): AIProviderAdapter | null {
  switch (name) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return null;
      return new GeminiProvider(key, process.env.GEMINI_MODEL || undefined);
    }
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return null;
      return new OpenAIProvider(key, process.env.OPENAI_MODEL || undefined, process.env.OPENAI_BASE_URL || undefined);
    }
    case "claude": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return null;
      return new ClaudeProvider(key, process.env.ANTHROPIC_MODEL || undefined);
    }
    default:
      return null;
  }
}

/**
 * Generate a single template using a SPECIFIC provider by name.
 * Falls back to the default provider if the requested one isn't available.
 */
export async function generateForProvider(
  providerName: AIProviderName | "auto",
  type: string,
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
): Promise<string> {
  const provider =
    providerName === "auto"
      ? getProvider()
      : (createProviderByName(providerName as AIProviderName) ?? getProvider());

  if (!provider) {
    throw new Error("No AI provider available. Please configure an API key.");
  }

  const { buildPromptForTemplate } = await import("./prompts");
  const { systemPrompt, userPrompt } = buildPromptForTemplate(type as any, jobText, profile, parsed);

  console.log(`[AI Service] generateForProvider: type=${type} provider=${provider.name}`);
  const start = Date.now();

  const apiTypeMap: Record<string, string> = {
    coldEmail:   "content_cold_email",
    proposal:    "content_proposal",
    linkedin:    "content_linkedin",
    coverLetter: "content_cover_letter",
    whatsapp:    "content_whatsapp",
    freelancer:  "content_freelancer",
  };

  const result = await provider.generate({
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: type === "linkedin" || type === "whatsapp" ? 512 : 2048,
    apiType: apiTypeMap[type] || "content_proposal",
  });

  console.log(`[AI Service] Generated ${type} via ${provider.name} in ${Date.now() - start}ms (${result.length} chars)`);
  return result;
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

  const apiTypeMap: Record<string, string> = {
    coldEmail:   "content_cold_email",
    proposal:    "content_proposal",
    linkedin:    "content_linkedin",
    coverLetter: "content_cover_letter",
  };

  const result = await provider.generate({
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: type === "linkedin" ? 512 : 2048,
    apiType: apiTypeMap[type],
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

  console.log(`\n📝 [generateAllTemplates] Starting sequential generation via ${provider.name}`);
  console.log(`   Parsed data: role=${parsed.role}, company=${parsed.company}`);
  const start = Date.now();

  const templates: GeneratedTemplates = {
    coldEmail: "",
    proposal: "",
    linkedin: "",
    coverLetter: "",
  };

  // Generate sequentially with stagger + retry to avoid API rate limits
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    let attempts = 0;
    const maxAttempts = 2;

    console.log(`\n   [${i + 1}/${types.length}] 🔄 Generating "${type}"...`);

    while (attempts < maxAttempts) {
      try {
        const tStart = Date.now();
        const content = await generateTemplate(type, jobText, profile, parsed);
        const elapsed = Date.now() - tStart;
        templates[type] = content;
        console.log(`   [${i + 1}/${types.length}] ✅ "${type}" generated in ${elapsed}ms (${content.length} chars)`);
        break; // success — move to next template
      } catch (error: any) {
        attempts++;
        const errMsg = error?.message || String(error);
        const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("rate");
        const isSafety = errMsg.toLowerCase().includes("safety") || errMsg.toLowerCase().includes("block");

        console.error(`   [${i + 1}/${types.length}] ❌ "${type}" FAILED (attempt ${attempts}/${maxAttempts})`);
        console.error(`      Error: ${errMsg}`);
        if (isRateLimit) console.error(`      🚫 RATE LIMIT detected`);
        if (isSafety)    console.error(`      🛡️  SAFETY BLOCK detected`);

        if (attempts < maxAttempts) {
          const delay = isRateLimit ? 3000 : 1000;
          console.log(`      ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`      💀 Max retries reached — marking "${type}" as FAILED`);
          templates[type] = `[Generation failed for ${type}. Please try again.]`;
        }
      }
    }

    // Small stagger between templates to avoid rate limits
    if (i < types.length - 1) {
      console.log(`   ⏸️  Stagger pause (400ms)...`);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }

  console.log(`\n📝 [generateAllTemplates] DONE in ${Date.now() - start}ms`);
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
      apiType: "job_analysis",
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
