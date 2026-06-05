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
  "attachResume": true
}

The candidate has these skills: ${profile.skills.join(", ")}
Only include tags that appear in both the job post AND the candidate's skills list.

For the "attachResume" field: set to true if the job post explicitly asks for a resume/CV, says "apply with resume", or is a formal job application. Set to false if it's a casual freelance inquiry, a referral request, or doesn't ask for a resume.`;

  const userPrompt = `Analyze this job posting and extract metadata:

---
${jobText}
---`;

  return { systemPrompt, userPrompt };
}

// ─── COLD EMAIL PROMPT ─────────────────────────────────────────────────────

export function buildColdEmailPrompt(
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
) {
  const userPrompt = `Write a professional cold email for this job opportunity.

TARGET JOB:
- Role: ${parsed.role}
- Company: ${parsed.company}
- Contact: ${parsed.contactName}
- Match Score: ${parsed.matchScore}%
- Matched Skills: ${parsed.tags.join(", ")}

ORIGINAL JOB POST:
${jobText.substring(0, 1500)}

${buildProfileContext(profile)}

FORMAT:
- Start with "Subject: [compelling subject line]" on the first line
- Then a blank line
- Then "Dear ${parsed.contactName.split(" ")[0]},"
- 3-4 paragraphs maximum
- Reference 1-2 specific projects from my portfolio that are relevant
- End with a clear call-to-action (suggest a quick call)
- Sign off with my name, role, and links`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
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
