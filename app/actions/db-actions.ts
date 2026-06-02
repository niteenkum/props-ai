"use server";

import { prisma } from "../utils/prisma";
import { JobPost, UserProfile } from "../utils/db";
import { JobStatus } from "@/prisma/client/client";

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
  };
}

// Helper to map DB UserProfile to UI UserProfile type
function mapDbProfile(profile: any): UserProfile {
  return {
    name: profile.name,
    role: profile.role,
    email: profile.email,
    skills: profile.skills,
    portfolioUrl: profile.portfolioUrl,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    resumeFileName: profile.resumeFileName ?? undefined,
    education: profile.education as { degree: string; school: string; year: string }[],
    projects: profile.projects as { name: string; tech: string[]; description: string }[],
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

// 5. Get candidate profile (auto seeds standard defaults if not present)
export async function getUserProfileAction(userEmail?: string): Promise<UserProfile> {
  try {
    const queryEmail = userEmail || "niteen.kumar@devstudio.com";
    
    // 1. Try to find user profile by unique email
    let dbProfile = await prisma.userProfile.findFirst({
      where: { email: queryEmail }
    });

    // 2. If it's the default, try looking by the old ID
    if (!dbProfile && (queryEmail === "niteen.kumar@devstudio.com" || queryEmail === DEFAULT_PROFILE.email)) {
      dbProfile = await prisma.userProfile.findUnique({
        where: { id: "default-profile" }
      });
    }

    if (!dbProfile) {
      // Seed with default profile customized for this user
      const newProfile = await prisma.userProfile.create({
        data: {
          id: userEmail || "default-profile",
          name: userEmail ? userEmail.split("@")[0] : DEFAULT_PROFILE.name,
          role: userEmail ? "Software Engineer" : DEFAULT_PROFILE.role,
          email: queryEmail,
          skills: DEFAULT_PROFILE.skills,
          portfolioUrl: DEFAULT_PROFILE.portfolioUrl,
          githubUrl: DEFAULT_PROFILE.githubUrl,
          linkedinUrl: DEFAULT_PROFILE.linkedinUrl,
          resumeFileName: DEFAULT_PROFILE.resumeFileName || null,
          education: DEFAULT_PROFILE.education as any,
          projects: DEFAULT_PROFILE.projects as any,
        },
      });
      return mapDbProfile(newProfile);
    }
    return mapDbProfile(dbProfile);
  } catch (error) {
    console.error("Error in getUserProfileAction:", error);
    return DEFAULT_PROFILE;
  }
}

// 6. Save/update candidate profile
export async function saveUserProfileAction(profile: UserProfile): Promise<void> {
  try {
    const existing = await prisma.userProfile.findFirst({
      where: { email: profile.email }
    });
    
    const profileId = existing?.id || profile.email || "default-profile";

    await prisma.userProfile.upsert({
      where: { id: profileId },
      update: {
        name: profile.name,
        role: profile.role,
        email: profile.email,
        skills: profile.skills,
        portfolioUrl: profile.portfolioUrl,
        githubUrl: profile.githubUrl,
        linkedinUrl: profile.linkedinUrl,
        resumeFileName: profile.resumeFileName || null,
        education: profile.education as any,
        projects: profile.projects as any,
      },
      create: {
        id: profileId,
        name: profile.name,
        role: profile.role,
        email: profile.email,
        skills: profile.skills,
        portfolioUrl: profile.portfolioUrl,
        githubUrl: profile.githubUrl,
        linkedinUrl: profile.linkedinUrl,
        resumeFileName: profile.resumeFileName || null,
        education: profile.education as any,
        projects: profile.projects as any,
      },
    });
  } catch (error) {
    console.error("Error in saveUserProfileAction:", error);
    throw error;
  }
}
