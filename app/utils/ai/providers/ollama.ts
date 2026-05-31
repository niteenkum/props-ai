// ─── Ollama (Local) Provider ───────────────────────────────────────────────
// Connects to a locally running Ollama instance

import { AIProviderAdapter, GenerateOptions } from "../types";

export class OllamaProvider implements AIProviderAdapter {
  readonly name = "ollama" as const;
  private baseUrl: string;
  private model: string;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = baseUrl || "http://localhost:11434";
    this.model = model || "llama3";
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;

    // Combine system + user prompts for Ollama's generate endpoint
    let prompt = "";
    if (options.systemPrompt) {
      prompt += `<|system|>\n${options.systemPrompt}\n<|end|>\n`;
    }
    prompt += `<|user|>\n${options.userPrompt}\n<|end|>\n<|assistant|>\n`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false, // we want the full response at once
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Ollama] API error ${response.status}:`, errorBody);
      throw new Error(`Ollama API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error("[Ollama] No response text returned");
    }

    return data.response.trim();
  }
}
