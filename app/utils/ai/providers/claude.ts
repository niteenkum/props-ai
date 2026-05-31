// ─── Claude (Anthropic) Provider ───────────────────────────────────────────
// Uses the Anthropic Messages API directly

import { AIProviderAdapter, GenerateOptions } from "../types";

export class ClaudeProvider implements AIProviderAdapter {
  readonly name = "claude" as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || "claude-sonnet-4-20250514";
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = "https://api.anthropic.com/v1/messages";

    const body: any = {
      model: this.model,
      max_tokens: options.maxTokens ?? 2048,
      messages: [
        { role: "user", content: options.userPrompt },
      ],
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    // Anthropic uses a different temperature range but 0-1 works
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Claude] API error ${response.status}:`, errorBody);
      throw new Error(`Claude API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const content = data.content;
    if (!content || content.length === 0) {
      throw new Error("[Claude] No content in response");
    }

    // Anthropic returns content as an array of blocks
    return content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("")
      .trim();
  }
}
