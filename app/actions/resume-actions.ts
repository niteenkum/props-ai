"use server";

// ─── Resume AI Parsing Action ──────────────────────────────────────────────
// Uses Gemini's multimodal API (inlineData with application/pdf) to parse the
// uploaded resume PDF and auto-fill all UserProfile fields in one shot.

import type { UserProfile } from "../utils/db";
import { logAiUsage } from "../utils/ai/usage-logger";

interface ParsedResumeResult {
  success: boolean;
  profile?: Partial<UserProfile>;
  error?: string;
}

/**
 * Parse a resume PDF with Gemini and return structured profile data.
 * @param pdfBase64 – raw base64-encoded PDF bytes (no data-URL prefix)
 * @param fileName  – original file name (e.g. "resume.pdf")
 */
export async function parseResumeWithAIAction(
  pdfBase64: string,
  fileName: string
): Promise<ParsedResumeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Gemini API key is not configured." };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are an expert resume parser. Your job is to extract structured data from a resume PDF and return ONLY a valid JSON object — no markdown, no extra text.

Return this exact JSON shape:
{
  "name": "Full Name",
  "role": "Current or most recent job title / expertise",
  "email": "email@example.com",
  "portfolioUrl": "https://...",
  "githubUrl": "https://github.com/...",
  "linkedinUrl": "https://linkedin.com/in/...",
  "skills": ["Skill1", "Skill2", "..."],
  "education": [
    { "degree": "Degree Name", "school": "University Name", "year": "YYYY - YYYY" }
  ],
  "projects": [
    { 
      "name": "Project Name", 
      "tech": ["Tech1", "Tech2"], 
      "description": "One-line description of the project.",
      "links": [
        { "label": "GitHub | Web | App Store | Play Store | Demo | etc.", "url": "https://..." }
      ]
    }
  ],
  "resumeText": "Full plain-text content of the resume..."
}

Rules:
- skills: extract ALL technical skills, programming languages, frameworks, tools, platforms. Be exhaustive — include soft skills if technical. Return 10-25 skills minimum.
- education: list from most recent first.
- projects: list up to 6 featured or notable projects. If no projects section, infer from work experience. For each project, look for any URLs mentioned in or next to it (like demo URLs, GitHub repositories, or Store links) and populate the "links" array. Map appropriate labels like "GitHub", "Web", "Play Store", "App Store", "Demo", or "Other".
- resumeText: include the entire readable text content from the resume.
- If a field is not found, use empty string "" or empty array [].
- Return ONLY the JSON object. No explanation.`;

  const userPrompt = `Parse this resume PDF file named "${fileName}" and return the structured JSON profile.`;

  try {
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
              },
            },
            { text: userPrompt },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.1, // low — structured extraction
        maxOutputTokens: 4096,
      },
    };

    const callStart = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Resume Parser] Gemini error ${response.status}:`, errText);
      return {
        success: false,
        error: `AI parsing failed (${response.status}). Please fill in details manually.`,
      };
    }

    const data = await response.json();
    const usageMeta = data.usageMetadata || {};
    const inputTokens  = usageMeta.promptTokenCount     || 0;
    const outputTokens = usageMeta.candidatesTokenCount || 0;
    await logAiUsage({
      apiType:     "pdf_parse",
      category:    "pdf_reading",
      model,
      inputTokens,
      outputTokens,
      durationMs:  Date.now() - callStart,
      success:     true,
    });
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return { success: false, error: "AI returned no candidates." };
    }

    const rawText = candidates[0]?.content?.parts
      ?.map((p: any) => p.text || "")
      .join("")
      .trim();

    if (!rawText) {
      return { success: false, error: "AI returned empty response." };
    }

    // Strip possible markdown code fences
    let jsonStr = rawText;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[Resume Parser] JSON parse failed:", e, "\nRaw:", rawText.slice(0, 500));
      return { success: false, error: "AI response was not valid JSON. Please fill in manually." };
    }

    const profile: Partial<UserProfile> = {
      name:          parsed.name          || "",
      role:          parsed.role          || "",
      email:         parsed.email         || "",
      portfolioUrl:  parsed.portfolioUrl  || "",
      githubUrl:     parsed.githubUrl     || "",
      linkedinUrl:   parsed.linkedinUrl   || "",
      skills:        Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [],
      education:     Array.isArray(parsed.education)
        ? parsed.education.map((e: any) => ({
            degree: e.degree || "",
            school: e.school || "",
            year:   e.year   || "",
          }))
        : [],
      projects:      Array.isArray(parsed.projects)
        ? parsed.projects.map((p: any) => ({
            name:        p.name        || "",
            tech:        Array.isArray(p.tech) ? p.tech : [],
            description: p.description || "",
            links:       Array.isArray(p.links)
              ? p.links.map((l: any) => ({
                  label: l.label || "Link",
                  url:   l.url   || "",
                }))
              : [],
          }))
        : [],
      resumeText:    typeof parsed.resumeText === "string" ? parsed.resumeText : rawText,
      resumeFileName: fileName,
    };

    console.log(`[Resume Parser] ✅ Parsed resume for "${parsed.name}" — ${profile.skills?.length} skills, ${profile.projects?.length} projects`);
    return { success: true, profile };
  } catch (error) {
    console.error("[Resume Parser] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error during parsing.",
    };
  }
}
