// ─── AI Prompt Templates ───────────────────────────────────────────────────
// All prompt engineering lives here. Provider-agnostic.
// Switching models never breaks prompts.

import { UserProfile } from "../db";
import { ParsedJobData, TemplateType } from "./types";

// ─── Extended platform types (superset of TemplateType) ────────────────────
export type Platform =
  | "proposal"
  | "coldEmail"
  | "linkedin"
  | "coverLetter"
  | "whatsapp"
  | "freelancer";

// ─── SYSTEM PROMPT (shared across all generations) ─────────────────────────

const SYSTEM_PROMPT = `You are PropAI, a world-class professional outreach assistant. You help job seekers craft personalized, compelling outreach messages based on their profile and a target job posting.

Your writing style:
- Professional but warm — never stiff or robotic
- Concise and high-impact — every sentence earns its place
- Personalized — reference specific skills, projects, and the target company
- Natural — reads like a real human wrote it, not a template
- No filler phrases like "I hope this message finds you well" or "I am writing to express my interest"

CRITICAL RULES:
- Output ONLY the message text. No markdown headers, no explanations, no "Here is the email:" prefix
- Do NOT wrap output in code blocks or quotes
- Do NOT add meta-commentary about the content
- Keep the tone authentic and specific to the candidate's real skills`;

// ─── COLD EMAIL SYSTEM PROMPT ────────────────────────────────────────────────
// Dedicated prompt for cold email generation based on B2B cold email best practices.
// Used ONLY for cold outreach — not proposals, LinkedIn, or other templates.

const COLD_EMAIL_SYSTEM_PROMPT = `You are an elite cold email writer for freelancers and independent professionals. Your emails get replies. Your goal: write emails that sound like they came from a sharp, thoughtful human — not a sales machine following a template.

VOICE & TONE:
Write like a peer, not a vendor. Use contractions. Read it aloud. If it sounds like marketing copy, rewrite it.
- "You/your" dominates over "I/we" — lead with THEIR world, not yours
- Confident but not pushy. Conversational but not sloppy
- For founders/C-suite: ultra-brief, peer-level, understated
- For mid-level: slightly more specific value, a bit more detail

PROVEN FRAMEWORKS (choose the best fit):
1. VALUE FIRST (best when you studied their brand/work):
   Observation → Specific improvement spotted → Quick proof/sample → Low-friction ask
   Example shape: "Noticed [specific thing about their work/company]. Most [role]s in [their space] struggle with [problem]. Helped [similar company] with this — [result]. Worth a look?"

2. DIRECT & SHORT (best for job leads, direct applications):
   Match signal → Top 3 proof links with 1-line impact each → Availability → One ask
   No fluff. Get to the point in line 1.

3. TRIGGER → INSIGHT → ASK:
   [Recent company event/post/hire] → That usually means [challenge] → I help with exactly that → Interested?

WRITING PRINCIPLES:
1. Every sentence must earn its place — if it doesn't move the reader toward replying, cut it
2. Personalization must connect to the PROBLEM — the observation leads naturally into why you're reaching out
3. ONE ask, low friction — "Worth a quick look?" beats "Can we schedule a 30-min call?"
4. SHOW IMPACT, not features: Not "I edited this video" → "I edited it, improved pacing, got 65% retention + 100k views"
5. Ruthlessly short — under 150 words total. The best emails feel like they COULD have been shorter
6. Custom subject line every time — never generic "Application for [Role]"

SUBJECT LINE RULES:
- 2-5 words, lowercase, look internal/colleague-sent
- Works: "quick idea for you", "found a small bug", "saas dev - ready now", "frontend help"
- Never: "I hope this finds you well", prospect's name in subject, emojis, urgency tricks
- Pro tip format: "[Role] - [X Yrs] - [One-line value]"

PORTFOLIO/PROOF RULES:
- Send only Top 3 most relevant projects — never a generic portfolio dump
- Each link gets ONE line of impact (result/metric, not description)
- Never send Google Drive links that require "Request Access"
- Show Before/After or results: NOT "I built this" → "Built this, reduced load time 40%, 3x conversions"

QUALITY CHECK:
- Would YOU reply to this if you received it?
- Does every sentence serve the READER, not the sender?
- Is personalization connected to the problem, or just bolted on?
- Is there ONE clear, low-friction ask?
- Does it pass the "read aloud" test?

NEVER:
- Open with "I hope this email finds you well" or "My name is X and I work at Y"
- Use: "synergy", "leverage", "circle back", "best-in-class", "excited to connect", "leading provider"
- Dump features — one proof point beats ten
- Ask for a 30-min call on first touch
- Sound like AI wrote it
- Use bullet points inside the email body
- Start multiple sentences with "I"

OUTPUT FORMAT:
- Line 1: Subject: [2-5 word lowercase subject line]
- Blank line
- Email body — plain prose, NO markdown, NO headers, NO bullet lists
- Sign-off: Name / Role / Portfolio link / LinkedIn
- Output ONLY the email — no explanations, no prefixes`;

// ─── Profile context builder (shared by all prompts) ────────────────────────

function buildProfileContext(profile: UserProfile): string {
  const projectLines = profile.projects.length > 0
    ? profile.projects.map((p, i) =>
        `  Project ${i + 1}: "${p.name}" — ${p.description}${p.tech.length > 0 ? ` (${p.tech.slice(0, 5).join(", ")})` : ""}${p.links?.length ? ` → ${p.links[0].url}` : ""}`
      ).join("\n")
    : "  (no projects listed)";

  const educationLines = profile.education.length > 0
    ? profile.education.map(e => `  ${e.degree} from ${e.school} (${e.year})`).join("\n")
    : "";

  return `
MY PROFILE:
- Name: ${profile.name}
- Current Role: ${profile.role}
- Email: ${profile.email}
- Key Skills: ${profile.skills.join(", ")}
- Portfolio: ${profile.portfolioUrl || "N/A"}
- GitHub: ${profile.githubUrl || "N/A"}
- LinkedIn: ${profile.linkedinUrl || "N/A"}
${profile.resumeText ? `- Summary: ${profile.resumeText.slice(0, 400)}` : ""}

PROJECTS:
${projectLines}
${educationLines ? `\nEDUCATION:\n${educationLines}` : ""}`.trim();
}

// ─── JOB ANALYSIS PROMPT ───────────────────────────────────────────────────

export function buildJobAnalysisPrompt(jobText: string, profile: UserProfile) {
  const systemPrompt = `You are a job posting analyzer. Extract structured metadata from raw job postings. 
  
Output ONLY valid JSON with these exact fields (no markdown, no explanation):
{
  "role": "extracted job title",
  "company": "company name",
  "contactName": "recruiter/poster name if found, else 'Hiring Team'",
  "contactEmail": "email if found, else ''",
  "tags": ["matched", "skill", "tags"],
  "summary": "2-3 sentence summary of the role",
  "attachResume": false
}

The candidate has these skills: ${profile.skills.join(", ")}
Only include tags that appear in both the job post AND the candidate's skills list.

For the "attachResume" field:
- Set to TRUE if: post explicitly says "send resume/CV", "apply with resume", "attach your CV", or it's a formal job application requiring documents
- Set to FALSE if: casual freelance inquiry ("looking for a freelancer"), referral/networking post ("send recommendations"), no mention of resume, or informal outreach
- When in doubt: FALSE — don't force resume on casual outreach`;

  const userPrompt = `Analyze this job posting and extract metadata:

---
${jobText}
---`;

  return { systemPrompt, userPrompt };
}

// ─── PROFESSION DETECTOR ─────────────────────────────────────────────────────
// Reads the candidate's role + skills and returns a rich context block
// that tells the AI HOW to write for this specific type of professional.

function detectProfessionProfile(role: string, skills: string[]): {
  type: string;
  label: string;
  proofLanguage: string;    // what kind of proof resonates most
  subjectExamples: string[];
  highlightHints: string;   // what to emphasize in the email
  avoidHints: string;       // what NOT to say for this profession
  impactMetrics: string;    // examples of metrics/impact this profession uses
} {
  const r = role.toLowerCase();
  const s = skills.map(x => x.toLowerCase()).join(" ");
  const combined = `${r} ${s}`;

  // ── Developer / Engineer ──────────────────────────────────────────────────
  if (/react|angular|vue|next\.?js|node|typescript|javascript|python|backend|frontend|fullstack|full.stack|software engineer|web dev|developer|programmer|coding|api|saas/.test(combined)) {
    return {
      type: "developer",
      label: "Software Developer / Engineer",
      proofLanguage: "GitHub links, live product URLs, technical outcomes (load time, scale, uptime)",
      subjectExamples: ["saas dev - ready now", "found a bug", "quick frontend idea", "react dev available", "your tech stack"],
      highlightHints: "Highlight: tech stack match, specific frameworks used in THEIR stack, a live product you built that's similar to what they need. Mention scale or performance wins if any.",
      avoidHints: "Avoid: vague 'I build websites'. Don't say 'full-stack developer' as an intro — lead with the PROBLEM you solved, not your title.",
      impactMetrics: "Examples: 'reduced load time by 60%', 'scaled to 10k users', '3-month build delivered in 6 weeks', 'zero downtime migration', 'cut API costs by 40%'",
    };
  }

  // ── UI/UX Designer ────────────────────────────────────────────────────────
  if (/figma|ui|ux|design|wireframe|prototype|user experience|product design|interface|branding/.test(combined)) {
    return {
      type: "designer",
      label: "UI/UX / Product Designer",
      proofLanguage: "Figma links, live product screenshots, conversion rate improvements, user testing outcomes",
      subjectExamples: ["quick ux idea", "noticed your onboarding", "found a ux gap", "your signup flow", "design feedback"],
      highlightHints: "Highlight: specific page or flow you noticed in their product, before/after redesign results, conversion or retention improvement. Show you studied THEIR product.",
      avoidHints: "Avoid: 'I create beautiful designs'. Never send Behance/Dribbble as your ONLY proof — add context on what the design achieved.",
      impactMetrics: "Examples: 'redesigned onboarding, increased Day-7 retention by 22%', 'reduced form abandonment 35%', 'improved conversion from 2.1% to 4.8%', 'cut support tickets 40% post-redesign'",
    };
  }

  // ── Video Editor ──────────────────────────────────────────────────────────
  if (/video edit|premiere|after effect|davinci|motion graphic|reels|youtube|content creat|short.form|reel/.test(combined)) {
    return {
      type: "video-editor",
      label: "Video Editor / Motion Designer",
      proofLanguage: "YouTube links with view counts, retention rates, growth metrics on edited videos",
      subjectExamples: ["quick edit idea", "your reel quality", "found a pacing issue", "short form sample", "video feedback"],
      highlightHints: "Highlight: a specific video of THEIRS you watched and one concrete improvement you'd make. Show a sample edit or your most viewed work. Mention the result — views, retention, subscribers gained.",
      avoidHints: "Avoid: generic 'I edit videos'. Never say 'high-quality videos' — that's assumed. Prove it with numbers.",
      impactMetrics: "Examples: 'edited this series, got 65% avg view retention', 'cut grew from 10k to 85k views after style change', 'thumbnail + edit combo hit 2.3M views', '100k views in 48 hours'",
    };
  }

  // ── Content Writer / Copywriter ───────────────────────────────────────────
  if (/content writ|copywrite|seo writ|blog|article|ghostwrit|email copy|newsletter|technical writ/.test(combined)) {
    return {
      type: "writer",
      label: "Content Writer / Copywriter",
      proofLanguage: "Published URLs, organic traffic won, email open/click rates, ranking keywords",
      subjectExamples: ["quick content idea", "found a gap in your blog", "your email copy", "seo opportunity", "content feedback"],
      highlightHints: "Highlight: a specific piece THEY published and one concrete improvement (SEO gap, weak headline, low-CTR hook). Lead with their content, not your credentials.",
      avoidHints: "Avoid: 'I write engaging content'. That's the most overused phrase in cold emails. Show, don't tell.",
      impactMetrics: "Examples: 'article ranked #1 for [keyword], drives 3k/mo organic', 'email sequence at 48% open rate', 'blog series generated 200 leads in Q1', 'landing page copy lifted conversions 2.7x'",
    };
  }

  // ── Digital Marketer / Growth ─────────────────────────────────────────────
  if (/marketing|seo|ppc|paid ad|google ad|facebook ad|meta ad|growth hacking|email marketing|crm|lead gen/.test(combined)) {
    return {
      type: "marketer",
      label: "Digital Marketer / Growth Specialist",
      proofLanguage: "ROAS, CAC, CTR, conversion rates, revenue attributed to campaigns",
      subjectExamples: ["quick ad audit", "your roas looks low", "found a leak in your funnel", "growth idea", "your meta ads"],
      highlightHints: "Highlight: a specific channel or campaign angle THEY might be missing. Lead with a growth lever — something they can act on. Show ROAS or CAC from past work.",
      avoidHints: "Avoid: 'I drive results'. Every marketer says this. Lead with a specific observation about THEIR marketing.",
      impactMetrics: "Examples: '4.2x ROAS on Meta, $12k spend', 'reduced CAC from $180 to $67', '32% CTR on cold email sequence', 'scaled from $5k to $50k/mo ad spend in 4 months'",
    };
  }

  // ── DevOps / Cloud / Infrastructure ──────────────────────────────────────
  if (/devops|aws|gcp|azure|docker|kubernetes|k8s|terraform|ci.?cd|infrastructure|cloud|sre|platform engineer/.test(combined)) {
    return {
      type: "devops",
      label: "DevOps / Cloud Engineer",
      proofLanguage: "Cost savings, uptime improvement, deployment frequency, incident reduction",
      subjectExamples: ["cloud cost audit", "found an infra gap", "your aws setup", "ci/cd improvement", "quick infra idea"],
      highlightHints: "Highlight: a common infrastructure pain point (high AWS bill, slow deploys, no CI/CD) and how you solved it elsewhere. Numbers win here.",
      avoidHints: "Avoid: 'I manage cloud infrastructure'. Too generic. Say what you FIXED and how much it saved/improved.",
      impactMetrics: "Examples: 'cut AWS bill 45%, saved $8k/mo', 'deploy time from 2hrs to 8min', 'zero-downtime migration of 50TB DB', '99.97% uptime SLA maintained for 18 months'",
    };
  }

  // ── Mobile Developer ──────────────────────────────────────────────────────
  if (/ios|android|flutter|react native|swift|kotlin|mobile app|app dev/.test(combined)) {
    return {
      type: "mobile-developer",
      label: "Mobile App Developer",
      proofLanguage: "App Store ratings, DAU/MAU, crash rate, review scores, revenue from apps",
      subjectExamples: ["app idea", "your app store rating", "mobile ux gap", "flutter dev - ready", "quick app audit"],
      highlightHints: "Highlight: a specific UX issue in THEIR app (if public) or a performance win in your past app. App Store rating improvements or DAU growth resonate.",
      avoidHints: "Avoid: 'I build cross-platform apps'. Lead with the problem — slow load, poor onboarding, bad reviews.",
      impactMetrics: "Examples: 'improved App Store rating from 3.1 to 4.6', 'reduced crash rate 90%', 'launched MVP in 6 weeks', 'hit 10k DAU in first month'",
    };
  }

  // ── Default / Generic Professional ────────────────────────────────────────
  return {
    type: "general",
    label: role || "Freelance Professional",
    proofLanguage: "Measurable outcomes, client results, time-to-delivery, cost savings",
    subjectExamples: ["quick idea", "found something useful", "relevant to you", "worth a look", "quick question"],
    highlightHints: "Highlight: the most relevant project from your portfolio and ONE concrete result it achieved. Tie it directly to what they need.",
    avoidHints: "Avoid: listing your skills as features. Show what you DELIVERED, not what you know.",
    impactMetrics: "Examples: delivered X in Y weeks, saved client $Z, increased [metric] by X%, client went from 0 to [milestone]",
  };
}

// ─── COLD EMAIL PROMPT ─────────────────────────────────────────────────────

export function buildColdEmailPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  // ── Profession-aware context ──────────────────────────────────────────────
  const profession = detectProfessionProfile(profile.role, profile.skills);

  // ── Filter projects to those most relevant to the job ────────────────────
  const jobLower = jobText.toLowerCase();
  const topProjects = profile.projects
    .slice(0, 5)
    .sort((a, b) => {
      // Rank projects by how many of their tech tags appear in the job post
      const aScore = a.tech.filter(t => jobLower.includes(t.toLowerCase())).length;
      const bScore = b.tech.filter(t => jobLower.includes(t.toLowerCase())).length;
      return bScore - aScore;
    })
    .slice(0, 3)
    .map(p =>
      `"${p.name}" — ${p.description.slice(0, 110)}${p.tech.length ? ` (${p.tech.slice(0, 4).join(", ")})` : ""}${p.links?.length ? ` → ${p.links[0].url}` : ""}`
    );

  const skillSignal = parsed.tags.length > 0
    ? `Matched skills for this role: ${parsed.tags.join(", ")}`
    : `Key skills: ${profile.skills.slice(0, 6).join(", ")}`;

  const resumeSnippet = profile.resumeText
    ? `\nCandidate summary (from resume): ${profile.resumeText.slice(0, 300)}`
    : "";

  const contactFirst = parsed.contactName !== "Hiring Team"
    ? parsed.contactName.split(" ")[0]
    : "there";

  // ── Detect lead type → pick framework ────────────────────────────────────
  const isDirectLead = jobText.toLowerCase().includes("apply") ||
    jobText.toLowerCase().includes("hiring") ||
    jobText.toLowerCase().includes("looking for") ||
    jobText.toLowerCase().includes("requirement");

  const framework = isDirectLead
    ? "DIRECT & SHORT: Match signal in line 1 → Top relevant project with IMPACT metric → Availability → Low-friction ask"
    : "VALUE FIRST: Observation about their work → Specific improvement you spotted → Relevant proof → Low-friction ask";

  const userPrompt = `Write a B2B cold outreach email. The candidate is a freelance ${profession.label} pitching for work.

━━━ THE OPPORTUNITY ━━━
Role: ${parsed.role}
Company: ${parsed.company}
Contact: ${parsed.contactName} (greet as "Hi ${contactFirst},")
Original post:
${jobText.substring(0, 1200)}

━━━ CANDIDATE PROFESSION PROFILE ━━━
Type: ${profession.label}
${skillSignal}
${resumeSnippet}

Best proof language for this profession: ${profession.proofLanguage}
What to highlight: ${profession.highlightHints}
What to AVOID: ${profession.avoidHints}
Impact metric examples (use real values from projects if available): ${profession.impactMetrics}

Good subject line styles for a ${profession.type}: ${profession.subjectExamples.map(s => `"${s}"`).join(", ")}

━━━ TOP RELEVANT PROJECTS (ranked by job relevance) ━━━
${topProjects.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}

Portfolio: ${profile.portfolioUrl || "N/A"}
LinkedIn: ${profile.linkedinUrl || "N/A"}

━━━ FRAMEWORK TO USE ━━━
${framework}

━━━ HARD RULES ━━━
- Under 150 words total (body only, not counting subject/sign-off)
- Open on THEIR situation — NOT "My name is" or "I am writing to"
- Use profession-appropriate subject line from the examples above (or invent a better one)
- CTA: one line, interest-based — "Worth a quick look?" / "Relevant to you?" / "Open to a quick chat?"
- Show IMPACT numbers wherever possible — NOT "I built X" → "Built X, achieved [result]"
- Projects: mention by name + outcome, not just tech stack
- Sign off: ${profile.name} / ${profile.role} / ${profile.portfolioUrl || ""}${profile.linkedinUrl ? " / " + profile.linkedinUrl : ""}`;

  return { systemPrompt: COLD_EMAIL_SYSTEM_PROMPT, userPrompt };
}

// ─── FREELANCE / UPWORK PROPOSAL ───────────────────────────────────────────


export function buildProposalPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  const userPrompt = `Write a compelling Upwork freelance proposal for this opportunity.

TARGET JOB:
- Role: ${parsed.role}
- Company/Client: ${parsed.company}
- Contact: ${parsed.contactName}
- Matched Skills: ${parsed.tags.join(", ")}

ORIGINAL JOB POST:
${jobText.substring(0, 1500)}

${buildProfileContext(profile)}

FORMAT:
- Start with "Hi ${parsed.contactName.split(" ")[0]},"
- Open with a specific hook referencing something from their post
- 2-3 bullet points of key value propositions (bold the skill/project name)
- Mention 1-2 most relevant projects by name with concrete outcomes
- End with enthusiasm, availability, and invitation to discuss
- Sign off casually with my first name only
- Keep under 350 words total`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

// ─── FREELANCER.COM BID ────────────────────────────────────────────────────

export function buildFreelancerPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  const userPrompt = `Write a winning Freelancer.com bid/proposal for this project.

TARGET PROJECT:
- Role: ${parsed.role}
- Client: ${parsed.company}
- Contact: ${parsed.contactName}
- My Relevant Skills: ${parsed.tags.join(", ")}

PROJECT DESCRIPTION:
${jobText.substring(0, 1500)}

${buildProfileContext(profile)}

FORMAT:
- Open with a direct statement of what I can deliver for them (no greeting needed)
- Short paragraph on my approach/methodology for this specific project
- List 2-3 most relevant projects with brief outcomes
- Mention timeline/availability
- End with a confident CTA
- Keep under 300 words — Freelancer.com bids are short
- Do NOT use formal salutations`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

// ─── LINKEDIN CONNECTION MESSAGE ───────────────────────────────────────────

export function buildLinkedInPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  const userPrompt = `Write a LinkedIn connection request note for this person.

TARGET:
- Role They're Hiring: ${parsed.role}
- Company: ${parsed.company}
- Contact: ${parsed.contactName}
- My Matched Skills: ${parsed.tags.join(", ")}

JOB CONTEXT:
${jobText.substring(0, 500)}

${buildProfileContext(profile)}

CRITICAL RULES:
- MUST be under 280 characters total
- Be warm and specific — reference their post or company
- End with something conversational
- No formal language, no "I hope this finds you well"
- Do NOT include a subject line`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

// ─── WHATSAPP MESSAGE ──────────────────────────────────────────────────────

export function buildWhatsAppPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  const firstName = parsed.contactName !== "Hiring Team"
    ? parsed.contactName.split(" ")[0]
    : "";

  const userPrompt = `Write a short, casual WhatsApp message to pitch myself for this opportunity.

TARGET:
- Role: ${parsed.role}
- Client/Company: ${parsed.company}
${firstName ? `- Contact First Name: ${firstName}` : ""}
- My Relevant Skills: ${parsed.tags.join(", ")}

JOB CONTEXT:
${jobText.substring(0, 800)}

${buildProfileContext(profile)}

FORMAT:
- Start with "Hi${firstName ? ` ${firstName}` : ""}! 👋" 
- 2-3 short sentences max — WhatsApp is conversational
- Mention my name, what I do, and 1 relevant project or skill
- Include my portfolio URL if available
- End with an open question to invite a reply (e.g., "Would love to chat — are you still looking?")
- Tone: friendly, confident, NOT salesy
- NO formal language, NO paragraph breaks, keep it chat-style`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

// ─── COVER LETTER ──────────────────────────────────────────────────────────

export function buildCoverLetterPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  const userPrompt = `Write a professional cover letter for this position.

TARGET JOB:
- Role: ${parsed.role}
- Company: ${parsed.company}
- Matched Skills: ${parsed.tags.join(", ")}

ORIGINAL JOB POST:
${jobText.substring(0, 1500)}

${buildProfileContext(profile)}

FORMAT:
- Start with "Dear Hiring Team at ${parsed.company},"
- 4-5 strong paragraphs
- Weave in specific projects and skills naturally — name them by title
- Show genuine enthusiasm for the company/role
- End with "Sincerely," followed by name, email, and portfolio link`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

// ─── PROMPT ROUTER ─────────────────────────────────────────────────────────

export function buildPromptForTemplate(
  type: TemplateType | Platform,
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
): { systemPrompt: string; userPrompt: string } {
  switch (type) {
    case "coldEmail":    return buildColdEmailPrompt(jobText, profile, parsed);
    case "proposal":     return buildProposalPrompt(jobText, profile, parsed);
    case "linkedin":     return buildLinkedInPrompt(jobText, profile, parsed);
    case "coverLetter":  return buildCoverLetterPrompt(jobText, profile, parsed);
    case "whatsapp":     return buildWhatsAppPrompt(jobText, profile, parsed);
    case "freelancer":   return buildFreelancerPrompt(jobText, profile, parsed);
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}
