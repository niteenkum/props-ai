// ─── AI Prompt Templates ───────────────────────────────────────────────────
// All prompt engineering lives here. Provider-agnostic.
// Switching models never breaks prompts.

import { UserProfile } from "../db";
import { ParsedJobData, TemplateType } from "./types";

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
  "summary": "2-3 sentence summary of the role"
}

The candidate has these skills: ${profile.skills.join(", ")}
Only include tags that appear in both the job post AND the candidate's skills list.`;

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

MY PROFILE:
- Name: ${profile.name}
- Current Role: ${profile.role}
- Key Skills: ${profile.skills.slice(0, 10).join(", ")}
- Portfolio: ${profile.portfolioUrl}
- GitHub: ${profile.githubUrl}
${profile.projects.length > 0 ? `- Recent Project: "${profile.projects[0].name}" — ${profile.projects[0].description}` : ""}

FORMAT:
- Start with "Subject: [compelling subject line]" on the first line
- Then a blank line
- Then "Dear ${parsed.contactName.split(" ")[0]},"
- 3-4 paragraphs maximum
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
  const userPrompt = `Write a compelling freelance/Upwork proposal for this opportunity.

TARGET JOB:
- Role: ${parsed.role}
- Company/Client: ${parsed.company}
- Contact: ${parsed.contactName}
- Matched Skills: ${parsed.tags.join(", ")}

ORIGINAL JOB POST:
${jobText.substring(0, 1500)}

MY PROFILE:
- Name: ${profile.name}
- Role: ${profile.role}
- Skills: ${profile.skills.slice(0, 10).join(", ")}
${profile.projects.length > 0 ? `- Recent Project: "${profile.projects[0].name}" — ${profile.projects[0].description}` : ""}

FORMAT:
- Start with "Hi ${parsed.contactName.split(" ")[0]},"
- Open with a specific hook referencing something from their post
- Bullet or numbered list of 3 key value propositions
- Mention a relevant project
- End with enthusiasm and availability
- Sign off casually with my first name`;

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

MY PROFILE:
- Name: ${profile.name}
- Role: ${profile.role}
- Top Skills: ${profile.skills.slice(0, 5).join(", ")}

CRITICAL RULES:
- MUST be under 280 characters total
- Be warm and specific — reference their post
- End with something conversational
- No formal language, no "I hope this finds you well"
- Do NOT include a subject line`;

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

MY PROFILE:
- Name: ${profile.name}
- Role: ${profile.role}
- Email: ${profile.email}
- Skills: ${profile.skills.slice(0, 12).join(", ")}
- Portfolio: ${profile.portfolioUrl}
- GitHub: ${profile.githubUrl}
${profile.projects.map((p, i) => `- Project ${i + 1}: "${p.name}" (${p.tech.join(", ")}) — ${p.description}`).join("\n")}
${profile.education.map(e => `- Education: ${e.degree} from ${e.school} (${e.year})`).join("\n")}

FORMAT:
- Start with "Dear Hiring Team at ${parsed.company},"
- 4-5 strong paragraphs
- Weave in specific projects and skills naturally
- Show genuine enthusiasm for the company
- End with "Sincerely," followed by name, email, and links`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

// ─── PROMPT ROUTER ─────────────────────────────────────────────────────────

export function buildPromptForTemplate(
  type: TemplateType,
  jobText: string,
  profile: UserProfile,
  parsed: ParsedJobData
): { systemPrompt: string; userPrompt: string } {
  switch (type) {
    case "coldEmail":
      return buildColdEmailPrompt(jobText, profile, parsed);
    case "proposal":
      return buildProposalPrompt(jobText, profile, parsed);
    case "linkedin":
      return buildLinkedInPrompt(jobText, profile, parsed);
    case "coverLetter":
      return buildCoverLetterPrompt(jobText, profile, parsed);
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}
