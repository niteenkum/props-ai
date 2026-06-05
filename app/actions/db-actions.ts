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
      name: "PropAI (Proposal Organizer)",
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
export async function addJobPostAction(job: Omit<JobPost, "id" | "postedDate" | "status">): Promise<JobPost> {
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
      },
    });
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
    await prisma.jobPost.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Error in deleteJobPostAction:", error);
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

    await prisma.$transaction([
      prisma.userProfile.upsert({
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
      }),
      // Synchronize projects: delete old and create new
      prisma.project.deleteMany({
        where: { userId: user.id }
      }),
      prisma.project.createMany({
        data: (profile.projects || []).map((proj) => ({
          userId: user.id,
          name: proj.name,
          tech: proj.tech,
          description: proj.description,
          links: proj.links || [],
        }))
      })
    ]);
  } catch (error) {
    console.error("Error in saveUserProfileAction:", error);
    throw error;
  }
}
