// ─── Gemini Provider ───────────────────────────────────────────────────────
// Uses the Gemini REST API directly — no SDK needed

import { AIProviderAdapter, GenerateOptions } from "../types";
import { logAiUsage, AiApiType, AiCategory, categoryForApiType } from "../usage-logger";

export class GeminiProvider implements AIProviderAdapter {
  readonly name = "gemini" as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || "gemini-2.5-flash";
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: options.jsonMode ? "application/json" : undefined,
        thinkingConfig: options.jsonMode ? { thinkingBudget: 0 } : undefined,
      },
    };

    // Gemini supports system instructions as a top-level field
    if (options.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const callStart = Date.now();

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const durationMs = Date.now() - callStart;

    if (!response.ok) {
      const errorBody = await response.text();
      const status = response.status;
      console.error(`[Gemini] API error ${status}:`, errorBody);

      // Log the failed call
      if (options.apiType) {
        const apiType = options.apiType as AiApiType;
        await logAiUsage({
          apiType,
          category:    categoryForApiType(apiType),
          model:       this.model,
          provider:    "gemini",
          jobPostId:   options.jobPostId,
          userEmail:   options.userEmail,
          inputTokens:  0,
          outputTokens: 0,
          durationMs,
          success:     false,
          errorMessage: `HTTP ${status}: ${errorBody.slice(0, 200)}`,
        });
      }

      if (status === 429) {
        throw new Error(`Gemini 429 rate limit exceeded. Please wait and try again.`);
      }
      throw new Error(`Gemini API error (${status}): ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json();
    console.log("[Gemini] API Response candidates:", JSON.stringify(data.candidates, null, 2));

    // Check for safety blocks (Gemini can return 200 but with blocked content)
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      const blockReason = data.promptFeedback?.blockReason;
      if (blockReason) {
        console.error(`[Gemini] Content blocked — reason: ${blockReason}`);
        throw new Error(`[Gemini] Content blocked by safety filter: ${blockReason}`);
      }
      throw new Error("[Gemini] No candidates returned in response");
    }

    // Check if the candidate was blocked mid-generation
    const finishReason = candidates[0]?.finishReason;
    if (finishReason === "SAFETY") {
      console.error("[Gemini] Response blocked by safety filter");
      throw new Error("[Gemini] Response blocked by safety filter");
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("[Gemini] No content parts in response");
    }

    // ─── Log token usage ──────────────────────────────────────────────────
    if (options.apiType) {
      const usageMeta  = data.usageMetadata || {};
      const inputTokens  = usageMeta.promptTokenCount     || 0;
      const outputTokens = usageMeta.candidatesTokenCount || 0;
      const apiType = options.apiType as AiApiType;

      await logAiUsage({
        apiType,
        category:    categoryForApiType(apiType),
        model:       this.model,
        provider:    "gemini",
        jobPostId:   options.jobPostId,
        userEmail:   options.userEmail,
        inputTokens,
        outputTokens,
        durationMs,
        success:     true,
      }).catch(() => {/* ignore logging errors */});
    }

    return parts.map((p: any) => p.text || "").join("").trim();
  }
}
