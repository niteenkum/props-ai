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

const statusMap: Record<string, JobStatus> = {
  draft: JobStatus.Draft,
  generated: JobStatus.Generated,
  sent: JobStatus.Sent,
  interviewing: JobStatus.Interviewing,
  declined: JobStatus.Declined,
};

// 1. Fetch job posts from PostgreSQL with pagination, search, and status filtering
export async function getJobPostsAction(
  params: {
    userEmail?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } | string
): Promise<{
  jobs: JobPost[];
  totalCount: number;
  stats?: {
    total: number;
    avgMatch: number;
    active: number;
    generated: number;
  };
}> {
  try {
    let userEmail: string | undefined;
    let page = 1;
    let limit = 10;
    let search = "";
    let status = "all";

    if (typeof params === "string") {
      userEmail = params;
      limit = 1000000; // fetch all (for backwards compatibility)
    } else if (params) {
      userEmail = params.userEmail;
      page = params.page || 1;
      limit = params.limit || 10;
      search = params.search || "";
      status = params.status || "all";
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (userEmail) {
      where.userEmail = userEmail;
    }

    if (status && status !== "all") {
      const enumVal = statusMap[status.toLowerCase()];
      if (enumVal) {
        where.status = enumVal;
      }
    }

    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { role: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q, mode: "insensitive" } },
        { parsedSummary: { contains: q, mode: "insensitive" } },
      ];
    }

    const [dbJobs, totalCount, allStats] = await Promise.all([
      prisma.jobPost.findMany({
        where,
        orderBy: { postedDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.jobPost.count({ where }),
      prisma.jobPost.findMany({
        where: userEmail ? { userEmail } : undefined,
        select: { matchScore: true, status: true }
      })
    ]);

    const total = allStats.length;
    const avgMatch = total > 0 ? Math.round(allStats.reduce((sum, j) => sum + j.matchScore, 0) / total) : 0;
    const active = allStats.filter(j => j.status === "Sent" || j.status === "Interviewing").length;
    const generated = allStats.filter(j => j.status === "Generated" || j.status === "Sent").length;

    return {
      jobs: dbJobs.map(mapDbJob),
      totalCount,
      stats: {
        total,
        avgMatch,
        active,
        generated,
      }
    };
  } catch (error) {
    console.error("Error in getJobPostsAction:", error);
    return { jobs: [], totalCount: 0 };
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

// 1b. Find existing jobs by contact email (for duplicate detection, scoped by userEmail)
export async function getJobsByEmailAction(email: string, userEmail?: string): Promise<JobPost[]> {
  try {
    const dbJobs = await prisma.jobPost.findMany({
      where: { 
        contactEmail: { equals: email, mode: "insensitive" },
        ...(userEmail ? { userEmail } : {})
      },
      orderBy: { postedDate: "desc" },
    });
    return dbJobs.map(mapDbJob);
  } catch (error) {
    console.error("Error in getJobsByEmailAction:", error);
    return [];
  }
}

// 2. Add a new job post scan (handles superadmin vs user routing)
export async function addJobPostAction(
  job: Omit<JobPost, "id" | "postedDate" | "status"> & { waMessageId?: string; userEmail?: string }
): Promise<JobPost> {
  try {
    // Check if the user is a SUPERADMIN
    let isSuperAdmin = false;
    if (job.userEmail) {
      const user = await prisma.user.findUnique({ where: { email: job.userEmail } });
      if (user && user.role === "SUPERADMIN") {
        isSuperAdmin = true;
      }
    }

    if (isSuperAdmin && job.userEmail) {
      // 1. Create in AdminJob table
      const dbAdminJob = await prisma.adminJob.create({
        data: {
          role: job.role,
          company: job.company,
          originalText: job.originalText,
          parsedSummary: job.parsedSummary || "",
          contactName: job.contactName || null,
          contactEmail: job.contactEmail || null,
          contactPhone: (job as any).contactPhone || null,
          tags: job.tags,
          linkedin: (job as any).linkedin || job.generatedTemplates?.linkedin || null,
          linkedinJobId: (job as any).linkedinJobId || null,
          ...(job.waMessageId ? {
            whatsappSource: {
              connect: { whatsappMessageId: job.waMessageId }
            }
          } : {})
        }
      });

      // 2. Immediately calculate candidacy score for the Superadmin and cache it
      const { analyzeJobCandidacyAction } = await import("./ai-actions");
      const analysis = await analyzeJobCandidacyAction(job.originalText, job.userEmail);

      const matchScore = analysis.success ? (analysis.score ?? 50) : 50;
      const matchedSkills = analysis.success ? (analysis.matchedSkills ?? []) : [];
      const missingSkills = analysis.success ? (analysis.missingSkills ?? []) : [];
      const explanation = analysis.success ? (analysis.explanation ?? "") : "";
      const suggestAttachResume = analysis.success ? (analysis.suggestAttachResume ?? false) : false;

      await prisma.userAdminJobScore.create({
        data: {
          userEmail: job.userEmail,
          adminJobId: dbAdminJob.id,
          matchScore,
          matchedSkills,
          missingSkills,
          explanation,
          suggestAttachResume,
        }
      });

      // 3. Update WhatsApp Message link if applicable
      if (job.waMessageId) {
        await prisma.whatsAppMessage.update({
          where: { whatsappMessageId: job.waMessageId },
          data: {
            status: "lead",
            adminJobId: dbAdminJob.id,
          }
        });
      }

      // Return mapped JobPost so type compatibility is preserved
      return {
        id: dbAdminJob.id,
        role: dbAdminJob.role,
        company: dbAdminJob.company,
        originalText: dbAdminJob.originalText,
        parsedSummary: dbAdminJob.parsedSummary,
        contactName: dbAdminJob.contactName ?? undefined,
        contactEmail: dbAdminJob.contactEmail ?? undefined,
        matchScore,
        postedDate: dbAdminJob.postedDate.toISOString(),
        tags: dbAdminJob.tags,
        status: "Draft",
        notes: explanation || undefined,
        suggestAttachResume,
      };
    } else {
      // Create personal JobPost lead
      const dbJob = await prisma.jobPost.create({
        data: {
          userEmail: job.userEmail || null,
          role: job.role,
          company: job.company,
          originalText: job.originalText,
          parsedSummary: job.parsedSummary,
          contactName: job.contactName || null,
          contactEmail: job.contactEmail || null,
          contactPhone: (job as any).contactPhone || null,
          matchScore: job.matchScore,
          tags: job.tags,
          status: JobStatus.Draft,
          notes: job.notes || null,
          coldEmail: job.generatedTemplates?.coldEmail || null,
          proposal: job.generatedTemplates?.proposal || null,
          linkedin: (job as any).linkedin || job.generatedTemplates?.linkedin || null,
          linkedinJobId: (job as any).linkedinJobId || null,
          coverLetter: job.generatedTemplates?.coverLetter || null,
          suggestAttachResume: typeof job.suggestAttachResume === "boolean" ? job.suggestAttachResume : null,
          matchedSkills: (job as any).matchedSkills || [],
          missingSkills: (job as any).missingSkills || [],
          matchExplanation: (job as any).matchExplanation || job.notes || null,
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
    }
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
  userEmail: string; // user email context
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
  const tags: string[] = ["WhatsApp"];
  if (params.upworkJobUrl) tags.push(`upwork:${params.upworkJobUrl}`);
  if (params.applyUrl)     tags.push(`apply:${params.applyUrl}`);
  if (params.contactCc)    tags.push(`cc:${params.contactCc}`);
  if (params.contactBcc)   tags.push(`bcc:${params.contactBcc}`);

  // Check if the user is a SUPERADMIN
  const user = await prisma.user.findUnique({ where: { email: params.userEmail } });
  const isSuperAdmin = user?.role === "SUPERADMIN";

  if (isSuperAdmin) {
    const dbAdminJob = await prisma.adminJob.create({
      data: {
        role: params.role,
        company: params.company,
        originalText: params.originalText,
        parsedSummary: params.matchExplanation ?? "",
        contactEmail: params.contactEmail,
        contactPhone: params.contactPhone,
        tags,
        linkedin: params.upworkJobUrl || params.applyUrl || null,
        whatsappSource: {
          connect: { whatsappMessageId: params.waMessageId }
        }
      }
    });

    // Immediately cache the score for the superadmin
    await prisma.userAdminJobScore.create({
      data: {
        userEmail: params.userEmail,
        adminJobId: dbAdminJob.id,
        matchScore: params.matchScore,
        matchedSkills: params.matchedSkills ?? [],
        missingSkills: params.missingSkills ?? [],
        explanation: params.matchExplanation,
      }
    });

    await prisma.whatsAppMessage.update({
      where: { whatsappMessageId: params.waMessageId },
      data: {
        status: "lead",
        adminJobId: dbAdminJob.id,
      }
    });

    return dbAdminJob.id;
  } else {
    const job = await prisma.jobPost.create({
      data: {
        userEmail: params.userEmail,
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

    await prisma.whatsAppMessage.update({
      where: { whatsappMessageId: params.waMessageId },
      data: {
        status: "lead",
        jobPostId: job.id,
      }
    });

    return job.id;
  }
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
    include: { 
      jobPost: { select: { id: true } },
      adminJob: { select: { id: true } }
    },
  });
  // Backfill jobPostId/adminJobId from relation if FK column is null
  return msgs.map((m) => ({
    ...m,
    jobPostId: m.jobPostId ?? m.jobPost?.id ?? m.adminJobId ?? m.adminJob?.id ?? null,
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

// ─── ADMIN JOB & SCORE ACTIONS ──────────────────────────────────────────────

export async function getAdminJobsAction(): Promise<any[]> {
  try {
    const jobs = await prisma.adminJob.findMany({
      orderBy: { postedDate: "desc" },
    });
    return jobs.map(j => ({
      id: j.id,
      role: j.role,
      company: j.company,
      originalText: j.originalText,
      parsedSummary: j.parsedSummary,
      contactName: j.contactName ?? undefined,
      contactEmail: j.contactEmail ?? undefined,
      contactPhone: j.contactPhone ?? undefined,
      postedDate: j.postedDate.toISOString(),
      tags: j.tags,
      linkedin: j.linkedin ?? undefined,
      linkedinJobId: j.linkedinJobId ?? undefined,
      createdAt: j.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error in getAdminJobsAction:", error);
    return [];
  }
}

export async function getUserAdminJobScoreAction(
  userEmail: string,
  adminJobId: string
): Promise<{
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation?: string;
  suggestAttachResume?: boolean;
}> {
  try {
    const cached = await prisma.userAdminJobScore.findUnique({
      where: {
        userEmail_adminJobId: { userEmail, adminJobId }
      }
    });

    if (cached) {
      return {
        matchScore: cached.matchScore,
        matchedSkills: cached.matchedSkills,
        missingSkills: cached.missingSkills,
        explanation: cached.explanation ?? undefined,
        suggestAttachResume: cached.suggestAttachResume ?? undefined,
      };
    }

    // Compute and cache
    const adminJob = await prisma.adminJob.findUnique({ where: { id: adminJobId } });
    if (!adminJob) {
      throw new Error(`AdminJob not found: ${adminJobId}`);
    }

    const { analyzeJobCandidacyAction } = await import("./ai-actions");
    const analysis = await analyzeJobCandidacyAction(adminJob.originalText, userEmail);

    const matchScore = analysis.success ? (analysis.score ?? 50) : 50;
    const matchedSkills = analysis.success ? (analysis.matchedSkills ?? []) : [];
    const missingSkills = analysis.success ? (analysis.missingSkills ?? []) : [];
    const explanation = analysis.success ? (analysis.explanation ?? "") : "";
    const suggestAttachResume = analysis.success ? (analysis.suggestAttachResume ?? false) : false;

    const created = await prisma.userAdminJobScore.create({
      data: {
        userEmail,
        adminJobId,
        matchScore,
        matchedSkills,
        missingSkills,
        explanation,
        suggestAttachResume,
      }
    });

    return {
      matchScore: created.matchScore,
      matchedSkills: created.matchedSkills,
      missingSkills: created.missingSkills,
      explanation: created.explanation ?? undefined,
      suggestAttachResume: created.suggestAttachResume ?? undefined,
    };
  } catch (error) {
    console.error("Error in getUserAdminJobScoreAction:", error);
    return {
      matchScore: 50,
      matchedSkills: [],
      missingSkills: [],
      explanation: "Unable to calculate score at this time.",
    };
  }
}

export async function promoteAdminJobToLeadAction(
  userEmail: string,
  adminJobId: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const adminJob = await prisma.adminJob.findUnique({ where: { id: adminJobId } });
    if (!adminJob) {
      return { success: false, error: "Scanned job not found." };
    }

    // Check if user already has a JobPost for this to avoid duplicates
    const existing = await prisma.jobPost.findFirst({
      where: {
        userEmail,
        role: adminJob.role,
        company: adminJob.company,
      }
    });
    if (existing) {
      return { success: false, error: "This job is already in your workspace as a lead." };
    }

    // Get score from cache or calculate it
    const scoreInfo = await getUserAdminJobScoreAction(userEmail, adminJobId);

    // Call analyzeAndGenerateAction to generate templates (coldEmail, proposal, etc.) tailored to this user's profile
    const { analyzeAndGenerateAction } = await import("./ai-actions");
    const aiResult = await analyzeAndGenerateAction(adminJob.originalText, userEmail);

    let templates: any = {};
    if (aiResult.success && aiResult.result) {
      templates = aiResult.result.generatedTemplates ?? {};
    }

    // Create the personal JobPost lead
    const newJob = await prisma.jobPost.create({
      data: {
        userEmail,
        role: adminJob.role,
        company: adminJob.company,
        originalText: adminJob.originalText,
        parsedSummary: scoreInfo.explanation || adminJob.parsedSummary || "",
        contactName: adminJob.contactName,
        contactEmail: adminJob.contactEmail,
        contactPhone: adminJob.contactPhone,
        matchScore: scoreInfo.matchScore,
        tags: adminJob.tags,
        status: "Draft",
        notes: scoreInfo.explanation || null,
        coldEmail: templates.coldEmail || null,
        proposal: templates.proposal || null,
        linkedin: adminJob.linkedin,
        linkedinJobId: adminJob.linkedinJobId,
        coverLetter: templates.coverLetter || null,
        suggestAttachResume: scoreInfo.suggestAttachResume,
        matchedSkills: scoreInfo.matchedSkills,
        missingSkills: scoreInfo.missingSkills,
        matchExplanation: scoreInfo.explanation,
      }
    });

    return { success: true, jobId: newJob.id };
  } catch (err: any) {
    console.error("Error promoting admin job to lead:", err);
    return { success: false, error: err?.message || "Failed to promote job to lead." };
  }
}

/**
 * Fetches all imported job keys for a specific user to prevent duplicate imports
 * and map them to their corresponding JobPost workspace IDs.
 */
export async function getImportedJobKeysAction(userEmail: string): Promise<Record<string, string>> {
  try {
    const imported = await prisma.jobPost.findMany({
      where: { userEmail },
      select: { id: true, role: true, company: true }
    });
    const mapping: Record<string, string> = {};
    imported.forEach(j => {
      const key = `${j.company?.toLowerCase() || ""}:${j.role.toLowerCase()}`;
      mapping[key] = j.id;
    });
    return mapping;
  } catch (error) {
    console.error("Error in getImportedJobKeysAction:", error);
    return {};
  }
}

/**
 * Add a single new project to the user's profile without overwriting existing ones.
 */
export async function addUserProjectAction(
  userEmail: string,
  project: { name: string; tech: string[]; description: string; links?: { label: string; url: string }[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return { success: false, error: "User not found." };

    await prisma.project.create({
      data: {
        userId: user.id,
        name: project.name,
        tech: project.tech,
        description: project.description,
        links: project.links || [],
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error in addUserProjectAction:", error);
    return { success: false, error: error?.message || "Failed to save project." };
  }
}


