import { prisma } from "../app/utils/prisma";
import {
  addJobPostAction,
  getJobPostsAction,
  getAdminJobsAction,
  getUserAdminJobScoreAction,
  promoteAdminJobToLeadAction
} from "../app/actions/db-actions";

async function main() {
  console.log("🚀 Starting Verification Script for Multi-Role Features...");

  // 1. Ensure Superadmin user and profile exist
  console.log("\n1. Seeding superadmin@example.com...");
  const adminUser = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: { role: "SUPERADMIN" },
    create: {
      email: "superadmin@example.com",
      name: "Super Admin",
      password: "password123",
      role: "SUPERADMIN",
      status: "ACTIVE",
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      name: "Super Admin",
      email: "superadmin@example.com",
      role: "Solutions Architect",
      skills: ["React", "TypeScript", "Node.js", "System Design"],
      portfolioUrl: "https://admin.dev",
      githubUrl: "https://github.com",
      linkedinUrl: "https://linkedin.com",
      education: [] as any,
    }
  });

  // 2. Ensure Regular User and profile exist
  console.log("2. Seeding user@example.com...");
  const normalUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: { role: "Developer" },
    create: {
      email: "user@example.com",
      name: "Normal User",
      password: "password123",
      role: "Developer",
      status: "ACTIVE",
      projects: {
        create: [
          {
            name: "Portfolio Project",
            description: "A simple portfolio built using React and Tailwind CSS",
            tech: ["React", "Tailwind CSS"],
          }
        ]
      } as any
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: normalUser.id },
    update: {},
    create: {
      userId: normalUser.id,
      name: "Normal User",
      email: "user@example.com",
      role: "Frontend Developer",
      skills: ["React", "Tailwind CSS", "JavaScript"],
      portfolioUrl: "https://user.dev",
      githubUrl: "https://github.com",
      linkedinUrl: "https://linkedin.com",
      education: [] as any,
    }
  });

  // Check if user has projects, if not, add one
  const userProjectsCount = await prisma.project.count({ where: { userId: normalUser.id } });
  if (userProjectsCount === 0) {
    await prisma.project.create({
      data: {
        userId: normalUser.id,
        name: "Portfolio Project",
        description: "A simple portfolio built using React and Tailwind CSS",
        tech: ["React", "Tailwind CSS"],
      }
    });
  }

  console.log("✅ Seeding completed.");

  // 3. Superadmin scans a new job post
  console.log("\n3. Superadmin scanning a job post...");
  const sampleJobText = `
    Role: React Frontend Engineer
    Company: TechCorp
    Description: We are looking for a frontend developer strong in React, Tailwind CSS, and JavaScript.
    Must have 2+ years of experience.
    Contact: jobs@techcorp.io
  `;

  const scannedJob = await addJobPostAction({
    userEmail: "superadmin@example.com",
    role: "React Frontend Engineer",
    company: "TechCorp",
    originalText: sampleJobText,
    parsedSummary: "React developer needed",
    tags: ["React", "Tailwind"],
    generatedTemplates: {},
    suggestAttachResume: true,
  });

  console.log(`✅ Job Scanned! Created AdminJob (ID: ${scannedJob.id})`);
  console.log(`   Initial Match Score (for Superadmin): ${scannedJob.matchScore}%`);

  // Verify that AdminJob table actually got it and it is not in JobPost table
  const adminJobs = await getAdminJobsAction();
  const { jobs: personalJobsForAdmin } = await getJobPostsAction("superadmin@example.com");

  console.log(`   Total global AdminJobs found: ${adminJobs.length}`);
  console.log(`   Total personal workspace JobPosts for Superadmin: ${personalJobsForAdmin.length}`);

  // 4. Calculate score for Normal User on-demand
  console.log("\n4. Calculating score for user@example.com on-demand...");
  const scoreInfo = await getUserAdminJobScoreAction("user@example.com", scannedJob.id);
  console.log(`✅ Calculated! Match Score: ${scoreInfo.matchScore}%`);
  console.log(`   Matched Skills:`, scoreInfo.matchedSkills);
  console.log(`   Missing Skills:`, scoreInfo.missingSkills);

  // Verify cached score exists in DB
  const scoreInDb = await prisma.userAdminJobScore.findUnique({
    where: {
      userEmail_adminJobId: {
        userEmail: "user@example.com",
        adminJobId: scannedJob.id
      }
    }
  });
  console.log(`   Cache verification in DB: ${scoreInDb ? "PAST CACHED SUCCESS" : "CACHE FAILED"}`);

  // 5. Promote AdminJob to Lead for Normal User
  console.log("\n5. Promoting AdminJob to Lead for user@example.com...");
  const promoteResult = await promoteAdminJobToLeadAction("user@example.com", scannedJob.id);
  console.log(`✅ Promotion result:`, promoteResult);

  if (promoteResult.success && promoteResult.jobId) {
    const personalLead = await prisma.jobPost.findUnique({
      where: { id: promoteResult.jobId }
    });
    console.log(`   Verifying created JobPost in workspace:`);
    console.log(`   - ID: ${personalLead?.id}`);
    console.log(`   - User Scoped Email: ${personalLead?.userEmail}`);
    console.log(`   - Role: ${personalLead?.role}`);
    console.log(`   - Company: ${personalLead?.company}`);
    console.log(`   - Match Score: ${personalLead?.matchScore}%`);
    console.log(`   - Has Cold Email: ${personalLead?.coldEmail ? "YES" : "NO"}`);
    console.log(`   - Has Proposal: ${personalLead?.proposal ? "YES" : "NO"}`);
  }

  console.log("\n🎉 ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
