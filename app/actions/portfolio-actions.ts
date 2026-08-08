"use server";

// ─── Portfolio Scanner Action ──────────────────────────────────────────────
// Multi-page crawl strategy:
//  1. Fetch the root portfolio URL (homepage)
//  2. Extract all internal links from that page
//  3. Score & filter links to find the most relevant sub-pages
//     (e.g. /projects, /work, /case-studies, individual project pages)
//  4. Fetch those sub-pages in parallel (max 6 additional pages)
//  5. Combine all page texts + all found URLs into one mega-prompt
//  6. Send to Gemini to extract structured project data

import { logAiUsage } from "../utils/ai/usage-logger";

export interface ScannedProject {
  name: string;
  tech: string[];
  description: string;
  links: { label: string; url: string }[];
}

export interface PortfolioScanResult {
  success: boolean;
  projects?: ScannedProject[];
  rawLinks?: string[];
  pageTitle?: string;
  pagesScanned?: string[];   // Which URLs were actually crawled
  error?: string;
}

// ─── Keyword scoring for internal link relevance ────────────────────────────
// Higher score = more likely to contain project info

const HIGH_VALUE_SLUGS = [
  "project", "projects", "work", "works", "portfolio", "case-study",
  "case-studies", "showcase", "apps", "experiments", "lab", "labs",
  "build", "builds", "product", "products",
];

const MEDIUM_VALUE_SLUGS = [
  "about", "skills", "experience", "cv", "resume", "home",
  "tech", "development", "software", "engineering",
];

const LOW_VALUE_SLUGS = [
  "contact", "blog", "post", "article", "tag", "category", "feed",
  "privacy", "terms", "login", "sign", "auth", "admin", "rss",
  "404", "search", "archive", "cdn", "assets", "static",
];

function scoreInternalLink(href: string): number {
  const lower = href.toLowerCase();
  if (LOW_VALUE_SLUGS.some((s) => lower.includes(s))) return -1;
  if (HIGH_VALUE_SLUGS.some((s) => lower.includes(s))) return 10;
  if (MEDIUM_VALUE_SLUGS.some((s) => lower.includes(s))) return 3;
  // Short path segments are often top-level pages (e.g. /work, /3)
  const pathDepth = (href.match(/\//g) || []).length;
  if (pathDepth <= 2) return 5; // shallow paths like /work or /niteen/project-1
  return 1;
}

// ─── HTML → Plain text stripper ──────────────────────────────────────────────

function stripHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(h[1-6]|p|div|section|article|li|tr|blockquote)[^>]*>/gi, "\n");

  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── Extract internal links from raw HTML ────────────────────────────────────

interface ExtractedLinks {
  internal: string[];   // Same-domain links (to crawl further)
  external: string[];   // Off-domain links (GitHub, demo URLs, etc.)
}

function extractAllLinks(html: string, baseUrl: string): ExtractedLinks {
  const linkRegex = /href=["']([^"'#?]+)["']/gi;
  const internal: string[] = [];
  const external: string[] = [];
  let match: RegExpExecArray | null;

  let origin = "";
  try { origin = new URL(baseUrl).origin; } catch { /* ignore */ }

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    try {
      const full = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
      // Check if it's internal (same origin)
      if (full.startsWith(origin + "/") || full === origin) {
        if (!internal.includes(full)) internal.push(full);
      } else if (full.startsWith("http")) {
        if (!external.includes(full)) external.push(full);
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return { internal, external };
}

// ─── Fetch a single page safely ──────────────────────────────────────────────

async function fetchPage(url: string): Promise<{ url: string; text: string; title: string; links: ExtractedLinks } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PortfolioScanner/1.0; +https://thepitchly.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) return null;

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    return {
      url,
      text: stripHtml(html),
      title,
      links: extractAllLinks(html, url),
    };
  } catch {
    return null;
  }
}

// ─── JSON repair for truncated AI responses ──────────────────────────────────
// When Gemini hits the token limit mid-JSON, the output is cut off.
// Strategy:
//  1. Find the last fully-closed top-level object in the array  (last `},` or `}` before EOF)
//  2. Truncate there and close the outer array
//  3. Also handle the case where we're inside a nested string / array

function repairTruncatedJson(raw: string): string {
  let str = raw.trim();

  // Make sure it looks like a JSON array at all
  if (!str.startsWith("[")) {
    // Maybe an object — wrap it
    if (str.startsWith("{")) str = `[${str}]`;
    else throw new Error("Not a JSON array or object");
  }

  // If it already ends with `]` we might just have a whitespace issue
  if (str.endsWith("]")) {
    return str; // Let the caller try JSON.parse; it may already work
  }

  // Find the last position of a complete top-level object: `},` or `}` followed only by whitespace/truncation
  // We scan backwards from the end looking for the last `}` that is at top-level depth=1
  let depth = 0;
  let inString = false;
  let lastCompleteObjEnd = -1;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      if (ch === "\\" ) { i++; continue; } // skip escaped char
      if (ch === '"')   { inString = false; }
      continue;
    }

    if (ch === '"')  { inString = true; continue; }
    if (ch === "{" || ch === "[") { depth++; continue; }
    if (ch === "}" || ch === "]") {
      depth--;
      // A closing `}` at depth=1 means we just finished a top-level object in the array
      if (depth === 1 && ch === "}") {
        lastCompleteObjEnd = i;
      }
    }
  }

  if (lastCompleteObjEnd === -1) {
    // No complete object found — return empty array
    return "[]";
  }

  // Slice to include everything up to and including the last complete object, then close the array
  const truncated = str.slice(0, lastCompleteObjEnd + 1).trimEnd();
  // Remove a trailing comma if present before closing
  const cleaned = truncated.endsWith(",") ? truncated.slice(0, -1) : truncated;
  return cleaned + "]";
}

// ─── Main server action ───────────────────────────────────────────────────────

export async function scanPortfolioAction(
  portfolioUrl: string,
  userEmail?: string,
): Promise<PortfolioScanResult> {
  if (!portfolioUrl?.trim()) {
    return { success: false, error: "No portfolio URL provided." };
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!openrouterKey && !geminiApiKey) {
    return { success: false, error: "No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY." };
  }
  const useOpenRouter = !!openrouterKey;

  console.log(`\n[Portfolio Scanner] ══ Starting multi-page crawl: ${portfolioUrl}`);

  // ─── Step 1: Fetch homepage ───────────────────────────────────────────────
  const homepage = await fetchPage(portfolioUrl);
  if (!homepage) {
    return {
      success: false,
      error: "Could not fetch portfolio. Make sure the URL is publicly accessible.",
    };
  }

  console.log(`[Portfolio Scanner] Homepage fetched: "${homepage.title}" (${homepage.text.length} chars)`);
  console.log(`[Portfolio Scanner] Internal links found: ${homepage.links.internal.length}`);

  // ─── Step 2: Score & pick best sub-pages to crawl ────────────────────────
  const CRAWL_LIMIT = 6; // max additional pages to fetch

  const scoredInternal = homepage.links.internal
    .filter((u) => u !== portfolioUrl && u !== portfolioUrl + "/") // skip homepage itself
    .map((url) => ({ url, score: scoreInternalLink(url) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const pagesToCrawl = scoredInternal.slice(0, CRAWL_LIMIT).map((x) => x.url);

  console.log(`[Portfolio Scanner] Sub-pages to crawl (${pagesToCrawl.length}): ${pagesToCrawl.join(", ")}`);

  // ─── Step 3: Fetch sub-pages in parallel ─────────────────────────────────
  const subPageResults = await Promise.all(pagesToCrawl.map(fetchPage));
  const successfulPages = subPageResults.filter((p): p is NonNullable<typeof p> => p !== null);

  console.log(`[Portfolio Scanner] Sub-pages fetched: ${successfulPages.length}/${pagesToCrawl.length}`);

  // ─── Step 4: Aggregate all content ───────────────────────────────────────
  const allPages = [homepage, ...successfulPages];
  const pagesScanned = allPages.map((p) => p.url);

  // Collect ALL external links across all pages (these are GitHub, demo, etc.)
  const allExternalLinks = new Set<string>();
  allPages.forEach((pg) => pg.links.external.forEach((l) => allExternalLinks.add(l)));

  // Also collect internal links from sub-pages (one more level for individual project pages)
  // For individual project detail pages (e.g. /projects/thepitchly)
  const alreadyCrawled = new Set(pagesScanned);
  const level2Candidates: string[] = [];
  successfulPages.forEach((pg) => {
    pg.links.internal.forEach((url) => {
      if (!alreadyCrawled.has(url)) {
        const score = scoreInternalLink(url);
        if (score >= 5) level2Candidates.push(url); // Only fetch highly relevant ones
      }
    });
  });

  // Fetch up to 4 more deep individual project pages
  const DEEP_LIMIT = 4;
  const uniqueLevel2 = [...new Set(level2Candidates)].slice(0, DEEP_LIMIT);
  if (uniqueLevel2.length > 0) {
    console.log(`[Portfolio Scanner] Level-2 project pages: ${uniqueLevel2.join(", ")}`);
    const deepResults = await Promise.all(uniqueLevel2.map(fetchPage));
    deepResults.forEach((pg) => {
      if (pg) {
        allPages.push(pg);
        pagesScanned.push(pg.url);
        pg.links.external.forEach((l) => allExternalLinks.add(l));
      }
    });
  }

  console.log(`[Portfolio Scanner] Total pages crawled: ${allPages.length}`);
  console.log(`[Portfolio Scanner] Total external links: ${allExternalLinks.size}`);

  // ─── Step 5: Build combined content string ───────────────────────────────
  // Budget: ~3000 chars per page, capped at 20,000 total
  const CHARS_PER_PAGE = 3000;
  const MAX_TOTAL_CHARS = 20000;

  let combinedContent = "";
  for (const pg of allPages) {
    const section = `\n\n=== PAGE: ${pg.title} (${pg.url}) ===\n${pg.text.slice(0, CHARS_PER_PAGE)}`;
    if ((combinedContent + section).length > MAX_TOTAL_CHARS) break;
    combinedContent += section;
  }

  const allExternalLinksArr = [...allExternalLinks].slice(0, 60);

  // ─── Step 6: Call AI ─────────────────────────────────────────────────
  const model = useOpenRouter
    ? (process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash")
    : (process.env.GEMINI_MODEL || "gemini-2.5-flash");

  const systemPrompt = `You are an expert portfolio analyzer. Given the text content scraped from MULTIPLE pages of a developer portfolio website, extract all real projects and return ONLY a valid JSON array — no markdown, no explanation.

Return this exact JSON shape:
[
  {
    "name": "Project Name",
    "tech": ["Tech1", "Tech2", "Tech3"],
    "description": "1-2 sentence description of the project, its purpose, and key impact.",
    "links": [
      { "label": "GitHub", "url": "https://github.com/..." },
      { "label": "Web", "url": "https://..." }
    ]
  }
]

Rules:
- Extract 2-10 real, distinct projects from across ALL the pages.
- For each project, identify its specific tech stack (e.g. "Next.js" not just "React", "PostgreSQL" not just "database"). List at most 8 tech items per project.
- For links, ONLY use URLs from the "FOUND EXTERNAL LINKS" list — never invent URLs.
- Use these link labels: "GitHub", "Web", "Demo", "Play Store", "App Store", "NPM", "Figma", "Video", "Other".
- Avoid duplicating the same project across pages — if you see the same project on multiple pages, merge it into one entry.
- Keep descriptions concise (1-2 sentences max).
- Return ONLY the JSON array. No other text.`;

  const userPrompt = `Portfolio: ${portfolioUrl}
Pages crawled: ${pagesScanned.join(", ")}

${combinedContent}

=== FOUND EXTERNAL LINKS (use ONLY these for project links) ===
${allExternalLinksArr.join("\n")}

Extract all projects across all pages and return the JSON array.`;

  try {
    console.log(`[Portfolio Scanner] Sending to AI (${combinedContent.length} chars content, ${allExternalLinksArr.length} links)...`);

    const callStart = Date.now();
    let rawText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let providerName = "";

    if (useOpenRouter) {
      providerName = "openrouter";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://thepitchly.com",
          "X-Title": "ThePitchly",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(40000),
      });

      const durationMs = Date.now() - callStart;
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Portfolio Scanner] OpenRouter error ${response.status}:`, errText.slice(0, 300));
        return { success: false, error: `AI analysis failed (HTTP ${response.status}).` };
      }
      const data = await response.json();
      inputTokens = data.usage?.prompt_tokens || 0;
      outputTokens = data.usage?.completion_tokens || 0;
      rawText = (data.choices?.[0]?.message?.content ?? "").trim();
    } else {
      providerName = "gemini";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(40000),
      });

      const durationMs = Date.now() - callStart;
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Portfolio Scanner] Gemini error ${response.status}:`, errText.slice(0, 300));
        return { success: false, error: `AI analysis failed (HTTP ${response.status}).` };
      }
      const data = await response.json();
      const usageMeta = data.usageMetadata || {};
      inputTokens = usageMeta.promptTokenCount || 0;
      outputTokens = usageMeta.candidatesTokenCount || 0;
      rawText = (data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") ?? "").trim();
    }

    const durationMs = Date.now() - callStart;

    // Log token usage
    await logAiUsage({
      apiType:      "job_analysis",
      category:     "job_analysis",
      model,
      provider:     providerName,
      userEmail,
      inputTokens,
      outputTokens,
      durationMs,
      success:      true,
    }).catch(() => {/* ignore logging errors */});

    if (!rawText) {
      return { success: false, error: "AI returned empty response." };
    }

    // ─── Strip markdown code fences ────────────────────────────────────────
    let jsonStr = rawText;
    // Remove opening fence (with optional language tag) and closing fence
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    // ─── Attempt to parse, with truncation repair fallback ───────────────────
    let parsed: any[];
    try {
      const rawParsed: any = JSON.parse(jsonStr);
      if (Array.isArray(rawParsed)) {
        parsed = rawParsed;
      } else {
        parsed = rawParsed.projects || Object.values(rawParsed)[0] || [];
      }
    } catch (firstErr) {
      // The response may have been truncated mid-JSON (token limit hit).
      // Try to surgically close any open arrays / objects.
      console.warn("[Portfolio Scanner] JSON parse failed, attempting repair...");
      try {
        const repaired = repairTruncatedJson(jsonStr);
        console.log("[Portfolio Scanner] Repaired JSON (first 300 chars):", repaired.slice(0, 300));
        const rawParsed: any = JSON.parse(repaired);
        if (Array.isArray(rawParsed)) {
          parsed = rawParsed;
        } else {
          parsed = rawParsed.projects || Object.values(rawParsed)[0] || [];
        }
        console.log(`[Portfolio Scanner] ✅ Repair succeeded — recovered ${parsed.length} entries`);
      } catch (repairErr) {
        console.error("[Portfolio Scanner] Repair also failed:", repairErr, "\nRaw (first 600):", rawText.slice(0, 600));
        return { success: false, error: "AI response was truncated and could not be repaired. Please try again." };
      }
    }

    const projects: ScannedProject[] = parsed
      .filter((p) => p && typeof p.name === "string" && p.name.trim())
      .map((p) => ({
        name:        String(p.name || "").trim(),
        tech:        Array.isArray(p.tech) ? p.tech.filter(Boolean).map(String) : [],
        description: String(p.description || "").trim(),
        links:       Array.isArray(p.links)
          ? p.links
              .filter((l: any) => l?.url)
              .map((l: any) => ({ label: String(l.label || "Link"), url: String(l.url || "") }))
          : [],
      }));

    console.log(
      `[Portfolio Scanner] ✅ Done — ${projects.length} projects extracted from ${allPages.length} pages in ${durationMs}ms`,
    );

    return {
      success: true,
      projects,
      rawLinks: allExternalLinksArr,
      pageTitle: homepage.title,
      pagesScanned,
    };
  } catch (err: any) {
    console.error("[Portfolio Scanner] Unexpected error:", err?.message);
    return { success: false, error: err?.message || "Unexpected error during portfolio analysis." };
  }
}
