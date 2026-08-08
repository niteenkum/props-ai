// ─── AI Email Reply Service ──────────────────────────────────────────────────
// Generates an AI-drafted reply to an email thread.
// Uses the existing AI provider (Gemini / OpenAI / Claude / etc.).

import { getProvider } from "./service";
import { UserProfile }  from "../db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThreadMessageContext {
  direction: "sent" | "received";
  fromEmail: string;
  toEmail:   string;
  body:      string;
  sentAt:    string; // ISO
}

export interface GenerateEmailReplyOptions {
  /** Last N messages of the thread (sorted oldest → newest) */
  threadMessages:   ThreadMessageContext[];
  /** Full user profile for context */
  profile:          UserProfile;
  /** Job role title, e.g. "Full Stack Developer" */
  jobRole:          string;
  /** Company name, e.g. "CareerXperts Consulting" */
  jobCompany:       string;
  /** The recruiter / contact email (who we are replying to) */
  recipientEmail:   string;
  /** Optional custom instruction from candidate */
  customPrompt?:    string;
  /** Cumulative history of all user instructions given during this session */
  userInstructions?: string[];
  /** Optional chat history for ongoing refinement */
  chatHistory?:     { role: "user" | "assistant"; content: string }[];
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional email reply writer helping a job seeker respond to recruiter emails.

Your goal: write a concise, professional, and human-sounding email reply on behalf of the candidate.

RULES:
- Output ONLY clean, natural email body text.
- Do NOT use ANY markdown syntax — NO asterisks for bolding (e.g. do NOT write **bold**), NO headers (##), NO code blocks. Write standard plain text email copy!
- Write in first person as the candidate.
- Be warm, confident, and direct — sound like a real human software architect/engineer writing an email.
- Keep it structured with natural line breaks.
- If the recruiter asked specific questions, answer them using the candidate's profile and user instructions.
- Preserve ALL details from cumulative user instructions (e.g. salary numbers, locations, notice periods, tone preferences).
- Reference real skills and projects from the profile naturally.
- Do NOT use filler openers like "I hope this email finds you well" or "Thank you for reaching out."
- End with a clear, low-friction next step or question.`;

// ─── Context Builder ──────────────────────────────────────────────────────────

function stripQuotedReplies(body: string): string {
  if (!body) return "";
  // Strip common email client quote headers like "---- On ... wrote ----", "On ... wrote:", "> "
  return body
    .split(/----+\s*On\s+.*wrote\s*----+/i)[0]
    .split(/On\s+.*wrote:/i)[0]
    .replace(/^>.*$/gm, "")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim();
}

function buildThreadContext(messages: ThreadMessageContext[]): string {
  if (messages.length === 0) return "No prior messages.";

  return messages
    .map((m, i) => {
      const role = m.direction === "sent" ? "ME (Candidate)" : "RECRUITER";
      const date = new Date(m.sentAt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
      });
      const cleanBody = stripQuotedReplies(m.body).slice(0, 800);
      return `[${i + 1}] ${role} (${date}):\n${cleanBody}`;
    })
    .join("\n\n---\n\n");
}

function buildProfileContext(profile: UserProfile): string {
  const skills = profile.skills.slice(0, 15).join(", ");
  const projects = profile.projects
    .slice(0, 5)
    .map(p => `• ${p.name}: ${p.description}`)
    .join("\n");

  return [
    `Name: ${profile.name}`,
    `Role: ${profile.role}`,
    `Skills: ${skills}`,
    `Projects:\n${projects}`,
    profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : "",
    profile.linkedinUrl  ? `LinkedIn: ${profile.linkedinUrl}`   : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generate an AI-drafted email reply for a job thread.
 * Returns the plain text draft (no subject, no headers).
 */
export async function generateEmailReply(
  options: GenerateEmailReplyOptions,
): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No AI provider configured. Please add a GEMINI_API_KEY or other provider key.");
  }

  const {
    threadMessages, profile, jobRole, jobCompany, recipientEmail,
    customPrompt, userInstructions = [], chatHistory,
  } = options;

  // Combine single customPrompt with userInstructions array if not present
  const allInstructions = [...userInstructions];
  if (customPrompt && customPrompt.trim() && !allInstructions.includes(customPrompt.trim())) {
    allInstructions.push(customPrompt.trim());
  }

  // Take last 10 messages sorted oldest → newest
  const context = threadMessages.slice(-10);

  // Find the most recent recruiter message
  const lastRecruiterMsg = [...context].reverse().find(m => m.direction === "received");
  const latestRecruiterText = lastRecruiterMsg ? stripQuotedReplies(lastRecruiterMsg.body) : "No direct message received.";

  let formattedChatHistory = "";
  if (chatHistory && chatHistory.length > 0) {
    formattedChatHistory = "\n=== PREVIOUS DRAFTS & CHAT HISTORY ===\n" +
      chatHistory.map(c => `${c.role === "user" ? "Candidate Instruction" : "Previous Draft"}: ${c.content}`).join("\n");
  }

  let instructionsSection = "";
  if (allInstructions.length > 0) {
    instructionsSection = `
=== ALL CUMULATIVE CANDIDATE INSTRUCTIONS (INCORPORATE ALL OF THESE) ===
${allInstructions.map((inst, idx) => `[Instruction ${idx + 1}] "${inst}"`).join("\n")}

* CRITICAL: Convert any informal phrasing/Hinglish into professional English.
* You MUST retain and incorporate ALL details (salary, location, notice period, etc.) from ALL instructions above!
`;
  }

  const userPrompt = `
You are writing an email reply on behalf of candidate ${profile.name} (${profile.role}).

=== TARGET RECRUITER & JOB ===
Recruiter Email: ${recipientEmail}
Role: ${jobRole}
Company: ${jobCompany}

=== LATEST RECRUITER MESSAGE (MOST RECENT - ANSWER THIS) ===
${latestRecruiterText}

=== CANDIDATE PROFILE ===
${buildProfileContext(profile)}

=== FULL EMAIL THREAD (CHRONOLOGICAL) ===
${buildThreadContext(context)}
${formattedChatHistory}
${instructionsSection}
=== TASK ===
Write a polished, professional plain text email reply from ${profile.name}'s perspective that:
1. Directly answers the recruiter's specific questions from their latest message.
2. Incorporates ALL cumulative candidate instructions and details listed above.
3. Uses natural, human, professional tone (no filler phrases like "hope this finds you well").
4. Plain text ONLY — absolutely NO markdown symbols (*, **, ##).

Output ONLY the email body text.
`.trim();

  console.log(`[AI Email Reply] Generating reply via ${provider.name} — thread length: ${context.length}, has customPrompt: ${Boolean(customPrompt)}`);
  const start = Date.now();

  const result = await provider.generate({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.65,
    maxTokens:   750,
    apiType:     "email_reply",
  });

  console.log(`[AI Email Reply] Generated in ${Date.now() - start}ms (${result.length} chars)`);
  return result.trim();
}

