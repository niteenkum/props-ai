"use server";

import { prisma } from "../utils/prisma";
import { JobPost, UserProfile } from "../utils/db";
import { JobStatus } from "@prisma/client";

// Helper to map DB JobPost to UI JobPost type
function mapDbJob(job: any): JobPost {
  return {
    id: job.id,
    role: job.role,
    company: job.company,
    originalText: job.originalText,
    parsedSummary: job.parsedSummary,
    contactName: job.contactName ?? undefined,
    contactEmail: job.contactEmail ?? undefined,
    matchScore: job.matchScore,
    postedDate: job.postedDate.toISOString(),
    tags: job.tags,
    status: job.status as "Draft" | "Generated" | "Sent" | "Interviewing" | "Declined",
    notes: job.notes ?? undefined,
    generatedTemplates: {
      coldEmail: job.coldEmail ?? undefined,
      proposal: job.proposal ?? undefined,
      linkedin: job.linkedin ?? undefined,
      coverLetter: job.coverLetter ?? undefined,
    },
    suggestAttachResume: job.suggestAttachResume ?? undefined,
  };
}

// Helper to map DB UserProfile to UI UserProfile type
function mapDbProfile(profile: any, projects: any[] = []): UserProfile {
  return {
    name:             profile.name,
    role:             profile.role,
    email:            profile.email,
    skills:           profile.skills,
    portfolioUrl:     profile.portfolioUrl,
    githubUrl:        profile.githubUrl,
    linkedinUrl:      profile.linkedinUrl,
    resumeFileName:   profile.resumeFileName   ?? undefined,
    resumeText:       profile.resumeText        ?? undefined,
    resumePdfBase64:  profile.resumePdfBase64   ?? undefined,
    education: profile.education as { degree: string; school: string; year: string }[],
    projects: projects.map((p: any) => ({
      name: p.name,
      tech: p.tech,
      description: p.description,
      links: p.links || [],
    })),
  };
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Niteen Kumar",
  role: "React & Frontend Architect",
  email: "niteen.kumar@devstudio.com",
  skills: [
    "React.js",
    "React",
    "Next.js",
    "Tailwind CSS",
    "TypeScript",
    "JavaScript",
    "Flutter",
    "Dart",
    "CSS",
    "HTML",
    "SaaS",
    "Mobile Development",
    "UI/UX",
    "Reusable Code",
    "Component Library",
  ],
  portfolioUrl: "https://niteenkumar.dev",
  githubUrl: "https://github.com/niteenkumar",
  linkedinUrl: "https://linkedin.com/in/niteenkumar",
  resumeFileName: "Niteen_Kumar_Resume_Frontend.pdf",
  education: [
    { degree: "B.Tech in Computer Science & Engineering", school: "State Technical University", year: "2019 - 2023" },
  ],
  projects: [
    {
      name: "ThePitchly (Proposal Organizer)",
      tech: ["Next.js", "React 19", "Tailwind CSS v4", "Radix UI"],
      description: "Architected a premium midnight-themed job outreach assistant with dynamic parsing capabilities.",
    },
    {
      name: "Flee360 Platform",
      tech: ["React.js", "Radix UI", "Tailwind CSS"],
      description: "Co-developed an enterprise fleet management dashboard with highly-reusable rounded card sidebar menus.",
    },
  ],
};

// 1. Fetch all job posts from PostgreSQL
export async function getJobPostsAction(): Promise<JobPost[]> {
  try {
    const dbJobs = await prisma.jobPost.findMany({
      orderBy: { postedDate: "desc" },
    });
    return dbJobs.map(mapDbJob);
  } catch (error) {
    console.error("Error in getJobPostsAction:", error);
    return [];
  }
}

// 1a. Fetch a single job post by ID
export async function getJobByIdAction(id: string): Promise<JobPost | null> {
  try {
    const job = await prisma.jobPost.findUnique({ where: { id } });
    return job ? mapDbJob(job) : null;
  } catch (error) {
    console.error("Error in getJobByIdAction:", error);
    return null;
  }
}

// 1b. Find existing jobs by contact email (for duplicate detection)
export async function getJobsByEmailAction(email: string): Promise<JobPost[]> {
  try {
    const dbJobs = await prisma.jobPost.findMany({
      where: { contactEmail: { equals: email, mode: "insensitive" } },
      orderBy: { postedDate: "desc" },
    });
    return dbJobs.map(mapDbJob);
  } catch (error) {
    console.error("Error in getJobsByEmailAction:", error);
    return [];
  }
}

// 2. Add a new job post scan
export async function addJobPostAction(
  job: Omit<JobPost, "id" | "postedDate" | "status"> & { waMessageId?: string }
): Promise<JobPost> {
  try {
    const dbJob = await prisma.jobPost.create({
      data: {
        role: job.role,
        company: job.company,
        originalText: job.originalText,
        parsedSummary: job.parsedSummary,
        contactName: job.contactName || null,
        contactEmail: job.contactEmail || null,
        matchScore: job.matchScore,
        tags: job.tags,
        status: JobStatus.Draft,
        notes: job.notes || null,
        coldEmail: job.generatedTemplates?.coldEmail || null,
        proposal: job.generatedTemplates?.proposal || null,
        linkedin: job.generatedTemplates?.linkedin || null,
        coverLetter: job.generatedTemplates?.coverLetter || null,
        suggestAttachResume: typeof job.suggestAttachResume === "boolean" ? job.suggestAttachResume : null,
        ...(job.waMessageId ? {
          whatsappSource: {
            connect: { whatsappMessageId: job.waMessageId }
          }
        } : {})
      },
    });

    if (job.waMessageId) {
      await prisma.whatsAppMessage.update({
        where: { whatsappMessageId: job.waMessageId },
        data: {
          status: "lead",
          jobPostId: dbJob.id,
        }
      });
    }

    return mapDbJob(dbJob);
  } catch (error) {
    console.error("Error in addJobPostAction:", error);
    throw error;
  }
}

// 3. Update an existing job post
export async function updateJobPostAction(job: JobPost): Promise<void> {
  try {
    await prisma.jobPost.update({
      where: { id: job.id },
      data: {
        role: job.role,
        company: job.company,
        originalText: job.originalText,
        parsedSummary: job.parsedSummary,
        contactName: job.contactName || null,
        contactEmail: job.contactEmail || null,
        matchScore: job.matchScore,
        tags: job.tags,
        status: job.status as JobStatus,
        notes: job.notes || null,
        coldEmail: job.generatedTemplates?.coldEmail || null,
        proposal: job.generatedTemplates?.proposal || null,
        linkedin: job.generatedTemplates?.linkedin || null,
        coverLetter: job.generatedTemplates?.coverLetter || null,
      },
    });
  } catch (error) {
    console.error("Error in updateJobPostAction:", error);
    throw error;
  }
}

// 4. Delete a job post scan
export async function deleteJobPostAction(id: string): Promise<void> {
  try {
    // Reset any linked WhatsApp message status
    const waMsg = await prisma.whatsAppMessage.findFirst({
      where: { jobPostId: id }
    });
    if (waMsg) {
      await prisma.whatsAppMessage.update({
        where: { id: waMsg.id },
        data: {
          status: waMsg.aiScore && waMsg.aiScore >= 55 ? "analyzed" : "skipped",
          jobPostId: null
        }
      });
    }

    await prisma.jobPost.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Error in deleteJobPostAction:", error);
    throw error;
  }
}

/**
 * Bulk delete job posts by their IDs.
 * Resets status of any connected WhatsAppMessage records.
 */
export async function deleteJobPostsAction(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  try {
    // Reset any linked WhatsApp message status
    const waMsgs = await prisma.whatsAppMessage.findMany({
      where: { jobPostId: { in: ids } }
    });
    
    for (const msg of waMsgs) {
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          status: msg.aiScore && msg.aiScore >= 55 ? "analyzed" : "skipped",
          jobPostId: null
        }
      });
    }

    const result = await prisma.jobPost.deleteMany({
      where: { id: { in: ids } }
    });
    return result.count;
  } catch (error) {
    console.error("Error in deleteJobPostsAction:", error);
    throw error;
  }
}

// 5. Get candidate profile — always look up via User.email (login email) → userId → UserProfile
export async function getUserProfileAction(userEmail?: string): Promise<UserProfile> {
  try {
    const loginEmail = userEmail || "niteen@niteen.dev";

    // Single clean path: User (login email) → profile (userId FK) + projects
    const user = await prisma.user.findUnique({
      where:   { email: loginEmail },
      include: { profile: true, projects: true },
    });

    if (!user || !user.profile) {
      return DEFAULT_PROFILE;
    }

    return mapDbProfile(user.profile, user.projects);
  } catch (error) {
    console.error("Error in getUserProfileAction:", error);
    return DEFAULT_PROFILE;
  }
}

// 6. Save/update candidate profile
export async function saveUserProfileAction(profile: UserProfile, userEmail?: string): Promise<void> {
  try {
    const targetEmail = userEmail || profile.email || "niteen.kumar014@gmail.com";

    // Find User by email
    const user = await prisma.user.findUnique({
      where: { email: targetEmail }
    });

    if (!user) {
      throw new Error(`User not found for email ${targetEmail}`);
    }

    // Run sequentially — no need for a transaction lock here.
    // (Previously used $transaction which timed out after 5s for large resume payloads)
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        name:             profile.name,
        role:             profile.role,
        email:            profile.email,
        skills:           profile.skills,
        portfolioUrl:     profile.portfolioUrl,
        githubUrl:        profile.githubUrl,
        linkedinUrl:      profile.linkedinUrl,
        resumeFileName:   profile.resumeFileName   || null,
        resumeText:       profile.resumeText        || null,
        resumePdfBase64:  profile.resumePdfBase64   || null,
        education:        profile.education as any,
      },
      create: {
        userId:           user.id,
        name:             profile.name,
        role:             profile.role,
        email:            profile.email,
        skills:           profile.skills,
        portfolioUrl:     profile.portfolioUrl,
        githubUrl:        profile.githubUrl,
        linkedinUrl:      profile.linkedinUrl,
        resumeFileName:   profile.resumeFileName   || null,
        resumeText:       profile.resumeText        || null,
        resumePdfBase64:  profile.resumePdfBase64   || null,
        education:        profile.education as any,
      },
    });

    // Synchronize projects: delete old ones then insert new ones
    await prisma.project.deleteMany({ where: { userId: user.id } });
    if ((profile.projects || []).length > 0) {
      await prisma.project.createMany({
        data: (profile.projects || []).map((proj) => ({
          userId:      user.id,
          name:        proj.name,
          tech:        proj.tech,
          description: proj.description,
          links:       proj.links || [],
        })),
      });
    }
  } catch (error) {
    console.error("Error in saveUserProfileAction:", error);
    throw error;
  }
}

// ─── WhatsApp DB Actions ───────────────────────────────────────────────────────

export interface WAMessageInput {
  userEmail: string;
  groupId: string;
  groupName: string;
  whatsappMessageId: string;
  senderPhone: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

/**
 * Bulk-upsert WhatsApp messages. Already-existing messages (by whatsappMessageId)
 * are skipped. Returns the IDs of newly inserted records.
 */
export async function upsertWAMessagesAction(messages: WAMessageInput[]): Promise<string[]> {
  if (!messages.length) return [];
  const newIds: string[] = [];
  for (const msg of messages) {
    try {
      const created = await prisma.whatsAppMessage.upsert({
        where: { whatsappMessageId: msg.whatsappMessageId },
        update: {}, // never overwrite existing analysed records
        create: {
          userEmail: msg.userEmail,
          groupId: msg.groupId,
          groupName: msg.groupName,
          whatsappMessageId: msg.whatsappMessageId,
          senderPhone: msg.senderPhone,
          senderName: msg.senderName,
          text: msg.text,
          timestamp: msg.timestamp,
          status: "raw",
        },
      });
      // Only count records that were just created (createdAt ≈ now)
      if (Math.abs(created.createdAt.getTime() - Date.now()) < 5000) {
        newIds.push(created.id);
      }
    } catch {}
  }
  return newIds;
}

/**
 * Look up existing JobPosts by contactEmail or contactPhone.
 * Used for targeted duplicate detection before calling AI.
 */
export async function getJobPostsByContactAction(
  userEmail: string,
  contactEmail?: string,
  contactPhone?: string
): Promise<{ id: string; role: string; company: string; originalText: string }[]> {
  if (!contactEmail && !contactPhone) return [];
  const conditions: any[] = [];
  if (contactEmail) conditions.push({ contactEmail });
  if (contactPhone) conditions.push({ contactPhone });

  // We don't have a userEmail filter on JobPost — query globally and return top 5
  const results = await prisma.jobPost.findMany({
    where: { OR: conditions },
    select: { id: true, role: true, company: true, originalText: true },
    take: 5,
  });
  return results;
}

export interface WAAnalysisResult {
  status: "skipped" | "analyzed" | "duplicate" | "lead";
  aiScore?: number;
  aiRole?: string;
  aiCompany?: string;
  aiExplanation?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  isDuplicate?: boolean;
  duplicateOfJobId?: string;
  jobPostId?: string;
}

/**
 * Save AI analysis result back onto a WhatsAppMessage record.
 */
export async function updateWAMessageAnalysisAction(
  whatsappMessageId: string,
  result: WAAnalysisResult
): Promise<void> {
  await prisma.whatsAppMessage.update({
    where: { whatsappMessageId },
    data: {
      status: result.status,
      aiScore: result.aiScore,
      aiRole: result.aiRole,
      aiCompany: result.aiCompany,
      aiExplanation: result.aiExplanation,
      matchedSkills: result.matchedSkills ?? [],
      missingSkills: result.missingSkills ?? [],
      isDuplicate: result.isDuplicate ?? false,
      duplicateOfJobId: result.duplicateOfJobId,
      jobPostId: result.jobPostId,
    },
  });
}

/**
 * Auto-create a JobPost from an analyzed WhatsApp message (score >= 55).
 * Returns the new JobPost id.
 */
export async function createJobPostFromWAAction(params: {
  waMessageId: string; // whatsappMessageId (not DB id)
  role: string;
  company: string;
  originalText: string;
  contactEmail?: string;
  contactCc?: string;
  contactBcc?: string;
  contactPhone?: string;
  upworkJobUrl?: string;
  applyUrl?: string;
  matchScore: number;
  matchExplanation?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
}): Promise<string> {
  // Build tags array — include URL hints so the UI can surface them
  const tags: string[] = [];
  if (params.upworkJobUrl) tags.push(`upwork:${params.upworkJobUrl}`);
  if (params.applyUrl)     tags.push(`apply:${params.applyUrl}`);
  if (params.contactCc)    tags.push(`cc:${params.contactCc}`);
  if (params.contactBcc)   tags.push(`bcc:${params.contactBcc}`);

  const job = await prisma.jobPost.create({
    data: {
      role: params.role,
      company: params.company,
      originalText: params.originalText,
      parsedSummary: params.matchExplanation ?? "",
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      matchScore: params.matchScore,
      status: "Draft",
      tags,
      matchExplanation: params.matchExplanation,
      matchedSkills: params.matchedSkills ?? [],
      missingSkills: params.missingSkills ?? [],
      whatsappSource: {
        connect: { whatsappMessageId: params.waMessageId },
      },
    },
  });
  return job.id;
}

/**
 * Get all WhatsApp messages for a group (for displaying in UI).
 * Includes related jobPost so we always have jobPostId even for older records.
 */
export async function getWAMessagesForGroupAction(
  userEmail: string,
  groupId: string
): Promise<any[]> {
  const msgs = await prisma.whatsAppMessage.findMany({
    where: { userEmail, groupId },
    orderBy: { timestamp: "desc" },
    include: { jobPost: { select: { id: true } } },
  });
  // Backfill jobPostId from relation if the FK column is null (old records)
  return msgs.map((m) => ({
    ...m,
    jobPostId: m.jobPostId ?? m.jobPost?.id ?? null,
  }));
}


/**
 * Given a list of whatsappMessageIds, return the set that already exist in DB.
 * Used to find "new" messages that haven't been analyzed yet.
 */
export async function getExistingWAMessageIdsAction(
  userEmail: string,
  groupId: string,
  messageIds: string[]
): Promise<string[]> {
  if (!messageIds.length) return [];
  const existing = await prisma.whatsAppMessage.findMany({
    where: {
      userEmail,
      groupId,
      whatsappMessageId: { in: messageIds },
    },
    select: { whatsappMessageId: true },
  });
  return existing.map((m) => m.whatsappMessageId);
}
/**
 * Delete WhatsApp messages by their whatsappMessageIds.
 * Optionally also deletes connected JobPost records.
 */
export async function deleteWAMessagesAction(
  userEmail: string,
  whatsappMessageIds: string[],
  alsoDeleteJobPosts: boolean
): Promise<{ deletedMessages: number; deletedJobPosts: number }> {
  if (!whatsappMessageIds.length) return { deletedMessages: 0, deletedJobPosts: 0 };

  // First, fetch job post IDs linked to these messages (if needed)
  let deletedJobPosts = 0;
  if (alsoDeleteJobPosts) {
    const msgs = await prisma.whatsAppMessage.findMany({
      where: { userEmail, whatsappMessageId: { in: whatsappMessageIds } },
      select: { jobPostId: true },
    });
    const jobPostIds = msgs.map((m) => m.jobPostId).filter(Boolean) as string[];
    if (jobPostIds.length) {
      const result = await prisma.jobPost.deleteMany({
        where: { id: { in: jobPostIds } },
      });
      deletedJobPosts = result.count;
    }
  }

  // Delete the messages themselves
  const result = await prisma.whatsAppMessage.deleteMany({
    where: { userEmail, whatsappMessageId: { in: whatsappMessageIds } },
  });

  return { deletedMessages: result.count, deletedJobPosts };
}
