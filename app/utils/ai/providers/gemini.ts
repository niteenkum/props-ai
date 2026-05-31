// ─── Gemini Provider ───────────────────────────────────────────────────────
// Uses the Gemini REST API directly — no SDK needed

import { AIProviderAdapter, GenerateOptions } from "../types";

export class GeminiProvider implements AIProviderAdapter {
  readonly name = "gemini" as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || "gemini-2.0-flash";
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
      },
    };

    // Gemini supports system instructions as a top-level field
    if (options.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Gemini] API error ${response.status}:`, errorBody);
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    // Extract text from response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("[Gemini] No candidates returned in response");
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("[Gemini] No content parts in response");
    }

    return parts.map((p: any) => p.text || "").join("").trim();
  }
}
