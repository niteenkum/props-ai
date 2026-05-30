-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('Draft', 'Generated', 'Sent', 'Interviewing', 'Declined');

-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "parsedSummary" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "matchScore" INTEGER NOT NULL,
    "postedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "coldEmail" TEXT,
    "proposal" TEXT,
    "linkedin" TEXT,
    "coverLetter" TEXT,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL DEFAULT 'default-profile',
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "skills" TEXT[],
    "portfolioUrl" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "resumeFileName" TEXT,
    "education" JSONB NOT NULL,
    "projects" JSONB NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
