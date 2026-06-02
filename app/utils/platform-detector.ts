// ─── Platform Detection + Email Extraction ──────────────────────────────────
// Detects the source platform of a job post and extracts contact emails.

export type Platform = "upwork" | "email" | "linkedin" | "generic";

/**
 * Extract the first email address found in text.
 * Returns null if no email is present.
 */
export function extractEmailFromText(text: string): string | null {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Detect the job posting platform from its content.
 * Priority: upwork > linkedin > email > generic
 */
export function detectPlatform(text: string): Platform {
  const lower = text.toLowerCase();

  // Upwork signals
  if (
    lower.includes("upwork.com") ||
    lower.includes("upwork") ||
    lower.includes("freelance proposal") ||
    lower.includes("fixed-price") ||
    lower.includes("hourly rate") ||
    /\$\d+.*\/hr/.test(lower)
  ) {
    return "upwork";
  }

  // LinkedIn signals
  if (
    lower.includes("linkedin.com") ||
    lower.includes("linkedin") ||
    lower.includes("• 1st") ||
    lower.includes("• 2nd") ||
    lower.includes("• 3rd") ||
    lower.includes("connect with") ||
    /follow\n|follow\r/.test(lower)
  ) {
    return "linkedin";
  }

  // Direct email (has email address but no platform markers)
  if (extractEmailFromText(text)) {
    return "email";
  }

  return "generic";
}

/**
 * Human-readable label for the platform.
 */
export function platformLabel(platform: Platform): string {
  switch (platform) {
    case "upwork":   return "Upwork";
    case "email":    return "Direct Email";
    case "linkedin": return "LinkedIn";
    case "generic":  return "General";
  }
}

/**
 * Which template types are relevant for each platform.
 */
export function platformTemplates(platform: Platform): string[] {
  switch (platform) {
    case "upwork":   return ["proposal"];
    case "email":    return ["coldEmail"];
    case "linkedin": return ["linkedin"];
    case "generic":  return ["coldEmail", "proposal", "linkedin", "coverLetter"];
  }
}

/**
 * Heuristic duplicate comparison between two job posts.
 * Returns a confidence score (0–100) and whether they look the same.
 */
export function heuristicCompare(
  existingText: string,
  newText: string,
): { isSame: boolean; confidence: number; reason: string } {
  // Normalize: lowercase, collapse whitespace, strip punctuation
  const normalize = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9\s@.]/g, " ").replace(/\s+/g, " ").trim();

  const a = normalize(existingText);
  const b = normalize(newText);

  // 1. Exact match
  if (a === b) {
    return { isSame: true, confidence: 100, reason: "The job post text is an exact match." };
  }

  // 2. Word-level Jaccard similarity
  const wordsA = new Set(a.split(" ").filter(w => w.length > 2));
  const wordsB = new Set(b.split(" ").filter(w => w.length > 2));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  const jaccard = union.size > 0 ? (intersection.size / union.size) * 100 : 0;

  if (jaccard >= 85) {
    return {
      isSame: true,
      confidence: Math.round(jaccard),
      reason: `${Math.round(jaccard)}% word overlap detected — this looks like the same job post with minor edits.`,
    };
  }

  if (jaccard >= 65) {
    return {
      isSame: false,
      confidence: Math.round(jaccard),
      reason: `Moderate overlap (${Math.round(jaccard)}%) — possibly related but different enough.`,
    };
  }

  return {
    isSame: false,
    confidence: Math.round(jaccard),
    reason: "Posts appear to be different jobs.",
  };
}
