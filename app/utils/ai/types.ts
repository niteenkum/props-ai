// ─── AI Provider Types ─────────────────────────────────────────────────────
// Shared interface for all AI providers (Gemini, OpenAI, Claude, Ollama)

export type AIProviderName = "gemini" | "openai" | "claude" | "ollama";

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;   // 0.0 - 1.0, default 0.7
  maxTokens?: number;     // max output tokens, default 2048
  // Logging metadata (optional, not sent to AI)
  apiType?:   string;
  jobPostId?: string;
  userEmail?: string;
}

export interface AIProviderAdapter {
  readonly name: AIProviderName;
  generate(options: GenerateOptions): Promise<string>;
}

export type TemplateType = "coldEmail" | "proposal" | "linkedin" | "coverLetter";

export interface GeneratedTemplates {
  coldEmail: string;
  proposal: string;
  linkedin: string;
  coverLetter: string;
}

export interface ParsedJobData {
  role: string;
  company: string;
  contactName: string;
  contactEmail: string;
  matchScore: number;
  tags: string[];
  parsedSummary: string;
  notes: string;
}

export interface AIAnalysisResult extends ParsedJobData {
  generatedTemplates: GeneratedTemplates;
}
