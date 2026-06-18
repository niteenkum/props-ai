import { PrismaClient, UserStatus, JobStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment.");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PROFILE = {
  name: "Niteen Kumar",
  role: "Senior Frontend Engineer | Engineering Lead | SaaS Builder",
  email: "niteen.kumar014@gmail.com",
  skills: [
    "React.js", "Next.js", "React Native", "TypeScript", "JavaScript (ES6+)",
    "Tailwind CSS", "Redux", "HTML5", "CSS3",
    "NestJS", "Node.js", "PostgreSQL", "GraphQL",
    "Firebase", "Firestore", "Directus", "Prisma", "REST APIs",
    "Gemini AI", "LLM Pipelines", "HERE Maps API", "Samsara", "GoMotive"
  ],
  portfolioUrl: "https://niteenkumar.dev",
  githubUrl: "https://github.com/niteen-kumar",
  linkedinUrl: "https://linkedin.com/in/niteen-kumar",
};

const DEFAULT_EDUCATION = [
  {
    degree: "B.Tech in Computer Science & Engineering",
    school: "Ramdeobaba University",
    year: "2019 – 2023",
  },
];

const DEFAULT_PROJECTS = [
  {
    name: "ThePitchly (Proposal Organizer)",
    tech: ["Next.js", "React 19", "Tailwind CSS", "Gemini AI", "Prisma", "PostgreSQL"],
    description: "AI-powered job outreach assistant — scans LinkedIn posts, generates cold emails, proposals, LinkedIn notes, and cover letters via Gemini.",
    links: [{ label: "GitHub", url: "https://github.com/niteen-kumar/props-ai" }],
  },
  {
    name: "Flee360 Fleet Management Platform",
    tech: ["React.js", "Radix UI", "Tailwind CSS", "HERE Maps", "Samsara API"],
    description: "Enterprise fleet management dashboard with real-time tracking, driver management, and route optimization.",
    links: [{ label: "Demo", url: "https://flee360.com" }],
  },
  {
    name: "iScuela One (School ERP)",
    tech: ["Next.js 14", "Firebase", "PostgreSQL", "Prisma", "Gemini AI"],
    description: "Multi-board school ERP (CBSE, UK) with academic modules, fee management, SEN, and an AI-powered report assistant.",
    links: [],
  },
  {
    name: "Event Management System",
    tech: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Nodemailer"],
    description: "Full-stack event management platform with vendor portal, admin dashboard, and email notifications.",
    links: [],
  },
];

const DEMO_JOBS = [
  {
    id: "job-seed-1",
    role: "React.js Engineer",
    company: "Zvart Manukyan (AI Product Dev)",
    originalText: "Looking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.",
    parsedSummary: "Product-minded React.js engineer with Flutter support. Focus on reusable code and clean architecture.",
    contactName: "Zvart Manukyan",
    contactEmail: "z.manukyan@product-ai.io",
    matchScore: 96,
    tags: ["React.js", "Frontend", "Flutter", "Reusable Code"],
    status: JobStatus.Draft,
    notes: "Strong focus on clean code and product understanding.",
  },
  {
    id: "job-seed-2",
    role: "Senior Frontend Architect",
    company: "Vercel",
    originalText: "Vercel is looking for a Senior Frontend Architect to lead core template creations and optimize Next.js integrations.",
    parsedSummary: "Lead Next.js App Router integrations, design standards, performance optimization, and custom component libraries.",
    contactName: "Lee Robinson",
    contactEmail: "lrob@vercel.com",
    matchScore: 92,
    tags: ["Next.js", "React 19", "Performance", "Tailwind CSS"],
    status: JobStatus.Generated,
    notes: "Requires deep Next.js performance knowledge.",
  },
  {
    id: "job-seed-3",
    role: "Product Engineer (Next.js)",
    company: "Linear App",
    originalText: "Linear is growing. Looking for a frontend engineer passionate about high-fidelity desktop web apps.",
    parsedSummary: "Build state-synchronized workflows, keyboard-driven UI, and sleek dark interfaces.",
    contactName: "Tuomas Artman",
    contactEmail: "artman@linear.app",
    matchScore: 89,
    tags: ["Linear UX", "React", "State Sync"],
    status: JobStatus.Sent,
    notes: "Highly focused on micro-interactions and high performance.",
  },
];

async function main() {
  console.log("🌱 Seeding database with relational Prisma client operations...\n");

  // 1. Create or update core user (Niteen Kumar)
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_PROFILE.email },
    update: {
      name: DEFAULT_PROFILE.name,
      role: "Developer",
      status: UserStatus.ACTIVE,
    },
    create: {
      email: DEFAULT_PROFILE.email,
      name: DEFAULT_PROFILE.name,
      password: "password123",
      role: "Developer",
      status: UserStatus.ACTIVE,
    },
  });
  console.log("👤 User 'Niteen Kumar' created/updated");

  // 2. Create UserProfile for user
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      name: DEFAULT_PROFILE.name,
      role: DEFAULT_PROFILE.role,
      email: DEFAULT_PROFILE.email,
      skills: DEFAULT_PROFILE.skills,
      portfolioUrl: DEFAULT_PROFILE.portfolioUrl,
      githubUrl: DEFAULT_PROFILE.githubUrl,
      linkedinUrl: DEFAULT_PROFILE.linkedinUrl,
      education: DEFAULT_EDUCATION as any,
    },
    create: {
      userId: user.id,
      name: DEFAULT_PROFILE.name,
      role: DEFAULT_PROFILE.role,
      email: DEFAULT_PROFILE.email,
      skills: DEFAULT_PROFILE.skills,
      portfolioUrl: DEFAULT_PROFILE.portfolioUrl,
      githubUrl: DEFAULT_PROFILE.githubUrl,
      linkedinUrl: DEFAULT_PROFILE.linkedinUrl,
      education: DEFAULT_EDUCATION as any,
    },
  });
  console.log("📝 UserProfile created/updated");

  // 3. Clear and seed User projects
  await prisma.project.deleteMany({
    where: { userId: user.id },
  });
  await prisma.project.createMany({
    data: DEFAULT_PROJECTS.map((proj) => ({
      userId: user.id,
      name: proj.name,
      tech: proj.tech,
      description: proj.description,
      links: proj.links as any,
    })),
  });
  console.log(`💻 Seeded ${DEFAULT_PROJECTS.length} projects`);

  // 4. Seed Job Posts
  for (const job of DEMO_JOBS) {
    await prisma.jobPost.upsert({
      where: { id: job.id },
      update: {
        role: job.role,
        company: job.company,
        originalText: job.originalText,
        parsedSummary: job.parsedSummary,
        contactName: job.contactName,
        contactEmail: job.contactEmail,
        matchScore: job.matchScore,
        tags: job.tags,
        status: job.status,
        notes: job.notes,
      },
      create: {
        id: job.id,
        role: job.role,
        company: job.company,
        originalText: job.originalText,
        parsedSummary: job.parsedSummary,
        contactName: job.contactName,
        contactEmail: job.contactEmail,
        matchScore: job.matchScore,
        tags: job.tags,
        status: job.status,
        notes: job.notes,
      },
    });
  }
  console.log(`💼 Seeded ${DEMO_JOBS.length} job posts`);

  // 5. Seed default skills
  const IT_SKILLS: { name: string; category: string }[] = [
    // Frontend
    { name: "React.js", category: "Frontend" },
    { name: "Next.js", category: "Frontend" },
    { name: "Vue.js", category: "Frontend" },
    { name: "Angular", category: "Frontend" },
    { name: "Svelte", category: "Frontend" },
    { name: "HTML", category: "Frontend" },
    { name: "CSS", category: "Frontend" },
    { name: "Tailwind CSS", category: "Frontend" },
    { name: "TypeScript", category: "Frontend" },
    { name: "JavaScript", category: "Frontend" },
    { name: "Redux", category: "Frontend" },
    { name: "SASS/SCSS", category: "Frontend" },
    { name: "Webpack", category: "Frontend" },
    { name: "Vite", category: "Frontend" },

    // Backend
    { name: "Node.js", category: "Backend" },
    { name: "Express.js", category: "Backend" },
    { name: "Python", category: "Backend" },
    { name: "Django", category: "Backend" },
    { name: "FastAPI", category: "Backend" },
    { name: "Java", category: "Backend" },
    { name: "Spring Boot", category: "Backend" },
    { name: "Go", category: "Backend" },
    { name: "Rust", category: "Backend" },
    { name: "Ruby on Rails", category: "Backend" },
    { name: "PHP", category: "Backend" },
    { name: "Laravel", category: "Backend" },
    { name: "GraphQL", category: "Backend" },
    { name: "REST API", category: "Backend" },

    // Mobile
    { name: "Flutter", category: "Mobile" },
    { name: "React Native", category: "Mobile" },
    { name: "Swift", category: "Mobile" },
    { name: "Kotlin", category: "Mobile" },
    { name: "Dart", category: "Mobile" },
    { name: "iOS Development", category: "Mobile" },
    { name: "Android Development", category: "Mobile" },

    // Database
    { name: "PostgreSQL", category: "Database" },
    { name: "MySQL", category: "Database" },
    { name: "MongoDB", category: "Database" },
    { name: "Redis", category: "Database" },
    { name: "Prisma", category: "Database" },
    { name: "SQL", category: "Database" },
    { name: "Firebase", category: "Database" },
    { name: "Supabase", category: "Database" },

    // DevOps & Cloud
    { name: "Docker", category: "DevOps" },
    { name: "Kubernetes", category: "DevOps" },
    { name: "AWS", category: "DevOps" },
    { name: "GCP", category: "DevOps" },
    { name: "Azure", category: "DevOps" },
    { name: "CI/CD", category: "DevOps" },
    { name: "Terraform", category: "DevOps" },
    { name: "Linux", category: "DevOps" },
    { name: "Nginx", category: "DevOps" },
    { name: "Git", category: "DevOps" },

    // AI / ML
    { name: "Machine Learning", category: "AI/ML" },
    { name: "Deep Learning", category: "AI/ML" },
    { name: "NLP", category: "AI/ML" },
    { name: "Computer Vision", category: "AI/ML" },
    { name: "PyTorch", category: "AI/ML" },
    { name: "TensorFlow", category: "AI/ML" },
    { name: "LLMs / GenAI", category: "AI/ML" },

    // Design / UI
    { name: "Figma", category: "Design" },
    { name: "UI/UX Design", category: "Design" },
    { name: "Adobe XD", category: "Design" },
    { name: "Sketch", category: "Design" },
    { name: "Prototyping", category: "Design" },

    // Testing
    { name: "Jest", category: "Testing" },
    { name: "Cypress", category: "Testing" },
    { name: "Playwright", category: "Testing" },
    { name: "Unit Testing", category: "Testing" },

    // General
    { name: "Agile / Scrum", category: "General" },
    { name: "System Design", category: "General" },
    { name: "Data Structures", category: "General" },
    { name: "Algorithms", category: "General" },
  ];

  await prisma.skill.createMany({
    data: IT_SKILLS,
    skipDuplicates: true,
  });
  console.log(`🧠 Seeded ${IT_SKILLS.length} skills`);

  console.log("\n🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
