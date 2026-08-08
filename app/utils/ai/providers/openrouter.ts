// ─── OpenRouter Provider ────────────────────────────────────────────────────
// OpenRouter provides access to 100+ models (GPT-4o, Claude, Llama, Gemini, etc.)
// via a single OpenAI-compatible API endpoint.
// Docs: https://openrouter.ai/docs

import { AIProviderAdapter, GenerateOptions } from "../types";

export class OpenRouterProvider implements AIProviderAdapter {
  readonly name = "openrouter" as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    // Default to a cost-effective, high-quality model
    this.model = model || "google/gemini-2.5-flash";
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = "https://openrouter.ai/api/v1/chat/completions";

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
        "HTTP-Referer": "https://thepitchly.com",    // Required by OpenRouter
        "X-Title": "ThePitchly",                      // Shows in OpenRouter dashboard
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[OpenRouter] API error ${response.status}:`, errorBody);
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("[OpenRouter] No content in response");
    }

    // Log model actually used (OpenRouter may route to different model)
    if (data.model) {
      console.log(`[OpenRouter] Response from model: ${data.model}`);
    }

    return content.trim();
  }
}
