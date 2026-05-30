"use server";

import { prisma } from "../utils/prisma";

export interface SkillItem {
  id: string;
  name: string;
  category: string;
}

// Fetch all skills grouped by category
export async function getSkillsAction(): Promise<SkillItem[]> {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return skills.map((s) => ({ id: s.id, name: s.name, category: s.category }));
  } catch (error) {
    console.error("Error in getSkillsAction:", error);
    return [];
  }
}

// Seed default IT skills if none exist
export async function seedSkillsAction(): Promise<{ count: number }> {
  try {
    const existing = await prisma.skill.count();
    if (existing > 0) return { count: existing };

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

    return { count: IT_SKILLS.length };
  } catch (error) {
    console.error("Error in seedSkillsAction:", error);
    return { count: 0 };
  }
}
