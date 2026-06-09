// ─── Claude (Anthropic) Provider ───────────────────────────────────────────
// Uses the Anthropic Messages API directly

import { AIProviderAdapter, GenerateOptions } from "../types";

// Model cascade: try these in order until one works
// Claude 4 family first → Claude 3.5 as legacy fallback
const CLAUDE_MODEL_CASCADE = [
  "claude-haiku-4-5",            // Claude Haiku 4.5 — fastest, $1/MTok input (try first)
  "claude-sonnet-4-5",           // Claude Sonnet 4.5 — balanced, $3/MTok input
  "claude-opus-4-5",             // Claude Opus 4.5  — most capable, $5/MTok input
  "claude-3-5-haiku-20241022",   // Claude 3.5 Haiku  — legacy fallback
  "claude-3-5-sonnet-20241022",  // Claude 3.5 Sonnet — legacy fallback
];

export class ClaudeProvider implements AIProviderAdapter {
  readonly name = "claude" as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || CLAUDE_MODEL_CASCADE[0];
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = "https://api.anthropic.com/v1/messages";

    const modelsToTry = this.model === CLAUDE_MODEL_CASCADE[0]
      ? CLAUDE_MODEL_CASCADE          // auto mode: try cascade
      : [this.model];                 // user-specified: respect it, no cascade

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      const body: any = {
        model,
        max_tokens: options.maxTokens ?? 2048,
        messages: [
          { role: "user", content: options.userPrompt },
        ],
      };

      if (options.systemPrompt) {
        body.system = options.systemPrompt;
      }

      if (options.temperature !== undefined) {
        body.temperature = options.temperature;
      }

      const callStart = Date.now();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const durationMs = Date.now() - callStart;

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Claude] API error ${response.status} for model ${model}:`, errorBody);

        // Log the failed call
        if (options.apiType) {
          const { logAiUsage, categoryForApiType } = await import("../usage-logger");
          await logAiUsage({
            apiType:      options.apiType as any,
            category:     categoryForApiType(options.apiType as any),
            model,
            provider:     "claude",
            jobPostId:    options.jobPostId,
            userEmail:    options.userEmail,
            inputTokens:  0,
            outputTokens: 0,
            durationMs,
            success:      false,
            errorMessage: `HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
          }).catch(() => {/* ignore logging errors */});
        }

        // 404 = model not found on this tier → try next in cascade
        if (response.status === 404 && modelsToTry.length > 1) {
          console.warn(`[Claude] Model ${model} not available, trying next in cascade...`);
          lastError = new Error(`Claude API error (${response.status}): ${errorBody}`);
          continue;
        }
        throw new Error(`Claude API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const content = data.content;
      if (!content || content.length === 0) {
        throw new Error("[Claude] No content in response");
      }

      // ─── Log token usage (Anthropic returns counts in data.usage) ──────────
      if (options.apiType) {
        const usage        = data.usage || {};
        const inputTokens  = usage.input_tokens  || 0;
        const outputTokens = usage.output_tokens || 0;

        const { logAiUsage, categoryForApiType } = await import("../usage-logger");
        await logAiUsage({
          apiType:      options.apiType as any,
          category:     categoryForApiType(options.apiType as any),
          model,
          provider:     "claude",
          jobPostId:    options.jobPostId,
          userEmail:    options.userEmail,
          inputTokens,
          outputTokens,
          durationMs,
          success:      true,
        }).catch(() => {/* ignore logging errors */});
      }

      console.log(`[Claude] Success with model: ${model}`);
      // Anthropic returns content as an array of blocks
      return content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("")
        .trim();
    }

    // All models in cascade failed
    throw lastError ?? new Error("[Claude] All models in cascade failed");
  }
}
