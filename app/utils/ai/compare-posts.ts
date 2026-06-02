// ─── AI-powered duplicate post comparison ───────────────────────────────────
// Uses the project's existing provider-agnostic AI service.

import { isAIAvailable } from "./service";

// We need direct access to the provider for a custom prompt
// Import the factory indirectly by re-using the service's internal logic
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
import { ClaudeProvider } from "./providers/claude";
import { OllamaProvider } from "./providers/ollama";
import type { AIProviderAdapter } from "./types";

function getCompareProvider(): AIProviderAdapter | null {
  const providerName = (process.env.AI_PROVIDER || "").toLowerCase();

  switch (providerName) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      return key ? new GeminiProvider(key, process.env.GEMINI_MODEL) : null;
    }
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      return key ? new OpenAIProvider(key, process.env.OPENAI_MODEL, process.env.OPENAI_BASE_URL) : null;
    }
    case "claude": {
      const key = process.env.ANTHROPIC_API_KEY;
      return key ? new ClaudeProvider(key, process.env.ANTHROPIC_MODEL) : null;
    }
    case "ollama":
      return new OllamaProvider(process.env.OLLAMA_HOST, process.env.OLLAMA_MODEL);
  }

  // Auto-detect
  if (process.env.GEMINI_API_KEY) return new GeminiProvider(process.env.GEMINI_API_KEY);
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider(process.env.OPENAI_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeProvider(process.env.ANTHROPIC_API_KEY);

  return null;
}

export default async function aiComparePosts(
  existingText: string,
  newText: string,
): Promise<{ isSame: boolean; confidence: number; reason: string } | null> {
  if (!isAIAvailable()) return null;

  const provider = getCompareProvider();
  if (!provider) return null;

  const systemPrompt = `You are a duplicate job post detector. You compare two job postings and determine if they represent the SAME job opportunity. Respond ONLY with valid JSON, no markdown code blocks.`;

  const userPrompt = `Compare these two job postings and determine if they are the SAME job opportunity (possibly with minor edits, copy-paste differences, or slight rewording).

POST A:
"""
${existingText.slice(0, 2000)}
"""

POST B:
"""
${newText.slice(0, 2000)}
"""

Respond in valid JSON only (no code blocks):
{ "isSame": true or false, "confidence": number 0-100, "reason": "one sentence explanation" }`;

  try {
    const rawResponse = await provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 256,
    });

    // Strip possible markdown code blocks
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return {
      isSame: !!parsed.isSame,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
      reason: parsed.reason || "AI comparison completed.",
    };
  } catch (err) {
    console.warn("[AI Compare] Failed to parse AI response:", err);
    return null;
  }
}
