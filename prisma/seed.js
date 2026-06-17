const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://niteenkumar@localhost:5432/props_ai_db";
const pool = new Pool({ connectionString });

const DEFAULT_USER_ID = "default-user-uuid-1111-2222-3333";
const DEFAULT_PROFILE_ID = "default-profile-uuid-1111-2222-3333";

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
    id: "proj-seed-1",
    name: "ThePitchly (Proposal Organizer)",
    tech: ["Next.js", "React 19", "Tailwind CSS", "Gemini AI", "Prisma", "PostgreSQL"],
    description: "AI-powered job outreach assistant — scans LinkedIn posts, generates cold emails, proposals, LinkedIn notes, and cover letters via Gemini.",
    links: [{ label: "GitHub", url: "https://github.com/niteen-kumar/props-ai" }],
  },
  {
    id: "proj-seed-2",
    name: "Flee360 Fleet Management Platform",
    tech: ["React.js", "Radix UI", "Tailwind CSS", "HERE Maps", "Samsara API"],
    description: "Enterprise fleet management dashboard with real-time tracking, driver management, and route optimization.",
    links: [{ label: "Demo", url: "https://flee360.com" }],
  },
  {
    id: "proj-seed-3",
    name: "iScuela One (School ERP)",
    tech: ["Next.js 14", "Firebase", "PostgreSQL", "Prisma", "Gemini AI"],
    description: "Multi-board school ERP (CBSE, UK) with academic modules, fee management, SEN, and an AI-powered report assistant.",
    links: [],
  },
  {
    id: "proj-seed-4",
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
    status: "Draft",
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
    status: "Generated",
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
    status: "Sent",
    notes: "Highly focused on micro-interactions and high performance.",
  },
];

async function main() {
  console.log("🌱 Seeding database via direct PostgreSQL pool queries...");

  try {
    // 1. Insert or Update core User
    await pool.query(`
      INSERT INTO "User" (id, email, password, name, role, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    `, [DEFAULT_USER_ID, DEFAULT_PROFILE.email, "password123", DEFAULT_PROFILE.name, "Developer"]);
    console.log("👤 User 'Niteen Kumar' created/updated");

    // 2. Insert or Update UserProfile
    await pool.query(`
      INSERT INTO "UserProfile" (id, "userId", name, role, email, skills, "portfolioUrl", "githubUrl", "linkedinUrl", "resumeFileName", "resumeText", education)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, $10::jsonb)
      ON CONFLICT ("userId") DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, skills = EXCLUDED.skills, education = EXCLUDED.education
    `, [
      DEFAULT_PROFILE_ID,
      DEFAULT_USER_ID,
      DEFAULT_PROFILE.name,
      DEFAULT_PROFILE.role,
      DEFAULT_PROFILE.email,
      DEFAULT_PROFILE.skills,
      DEFAULT_PROFILE.portfolioUrl,
      DEFAULT_PROFILE.githubUrl,
      DEFAULT_PROFILE.linkedinUrl,
      JSON.stringify(DEFAULT_EDUCATION)
    ]);
    console.log("📝 UserProfile created/updated");

    // 3. Clear and insert Projects
    await pool.query('DELETE FROM "Project" WHERE "userId" = $1', [DEFAULT_USER_ID]);
    for (const proj of DEFAULT_PROJECTS) {
      await pool.query(`
        INSERT INTO "Project" (id, "userId", name, tech, description, links)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `, [
        proj.id,
        DEFAULT_USER_ID,
        proj.name,
        proj.tech,
        proj.description,
        JSON.stringify(proj.links)
      ]);
    }
    console.log(`💻 Seeded ${DEFAULT_PROJECTS.length} projects`);

    // 4. Seed Job Posts
    for (const j of DEMO_JOBS) {
      await pool.query(`
        INSERT INTO "JobPost" (id, role, company, "originalText", "parsedSummary", "contactName", "contactEmail", "matchScore", tags, status, notes, "postedDate")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"JobStatus", $11, NOW())
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, company = EXCLUDED.company
      `, [
        j.id, j.role, j.company, j.originalText, j.parsedSummary,
        j.contactName, j.contactEmail, j.matchScore,
        j.tags, j.status, j.notes
      ]);
    }
    console.log(`💼 Seeded ${DEMO_JOBS.length} job posts`);

    console.log("\n🎉 Database seed complete!");
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
