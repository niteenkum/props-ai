// ─── OpenAI Provider ───────────────────────────────────────────────────────
// Works with OpenAI API and any OpenAI-compatible endpoint (e.g. Together, Groq)

import { AIProviderAdapter, GenerateOptions } from "../types";

export class OpenAIProvider implements AIProviderAdapter {
  readonly name = "openai" as const;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model?: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.model = model || "gpt-4o-mini";
    this.baseUrl = baseUrl || "https://api.openai.com/v1";
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const messages: any[] = [];

    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }

    messages.push({ role: "user", content: options.userPrompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[OpenAI] API error ${response.status}:`, errorBody);
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("[OpenAI] No content in response");
    }

    return content.trim();
  }
}
