export interface JobPost {
  id: string;
  role: string;
  company: string;
  originalText: string;
  parsedSummary: string;
  contactName?: string;
  contactEmail?: string;
  matchScore: number;
  postedDate: string;
  tags: string[];
  status: 'Draft' | 'Generated' | 'Sent' | 'Interviewing' | 'Declined';
  notes?: string;
  generatedTemplates?: Record<string, string | undefined>;
}

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  skills: string[];
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  education: { degree: string; school: string; year: string }[];
  projects: { name: string; tech: string[]; description: string; links?: { label: string; url: string }[] }[];
  resumeFileName?: string;
  resumeText?: string; // Raw extracted text stored in DB, used by Gemini
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Niteen Kumar",
  role: "React & Frontend Architect",
  email: "niteen.kumar@devstudio.com",
  skills: ["React.js", "React", "Next.js", "Tailwind CSS", "TypeScript", "JavaScript", "Flutter", "Dart", "CSS", "HTML", "SaaS", "Mobile Development", "UI/UX", "Reusable Code", "Component Library"],
  portfolioUrl: "https://niteenkumar.dev",
  githubUrl: "https://github.com/niteenkumar",
  linkedinUrl: "https://linkedin.com/in/niteenkumar",
  resumeFileName: "Niteen_Kumar_Resume_Frontend.pdf",
  education: [
    { degree: "B.Tech in Computer Science & Engineering", school: "State Technical University", year: "2019 - 2023" }
  ],
  projects: [
    {
      name: "PropAI (Proposal Organizer)",
      tech: ["Next.js", "React 19", "Tailwind CSS v4", "Radix UI"],
      description: "Architected a premium midnight-themed job outreach assistant with dynamic parsing capabilities.",
      links: [
        { label: "Web", url: "https://propsai.dev" },
        { label: "GitHub", url: "https://github.com/niteenkumar/props-ai" }
      ]
    },
    {
      name: "Flee360 Platform",
      tech: ["React.js", "Radix UI", "Tailwind CSS"],
      description: "Co-developed an enterprise fleet management dashboard with highly-reusable rounded card sidebar menus.",
      links: [
        { label: "Demo", url: "https://flee360.com" }
      ]
    }
  ]
};

const SEED_DATA: JobPost[] = [
  {
    id: "job-1",
    role: "React.js Engineer",
    company: "Zvart Manukyan (AI Product Dev)",
    postedDate: "2026-05-27T13:30:00.000Z", // 1 hour ago
    contactName: "Zvart Manukyan",
    contactEmail: "z.manukyan@product-ai.io",
    matchScore: 96,
    tags: ["React.js", "Frontend", "Flutter", "Reusable Code"],
    status: "Draft",
    parsedSummary: "Looking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code. Confident with frontend, cares about reusable code, and can also support a Flutter app when needed.",
    notes: "Requires standard React expertise + occasional Flutter support. Strong focus on clean code and product understanding.",
    originalText: `View Zvart Manukyan’s profile
Zvart Manukyan

 • 3rd+

Technical Project & Product Manager | AI-Driven Product Development | Ex-Software Engineer

1h • 


Follow
Hey there :)

Looking for a React.js engineer who enjoys building clean, practical things and likes understanding the product behind the code.
Someone who feels confident with frontend, cares about reusable code, and can also support a Flutter app when needed.
Ping me if this sounds like you, or share it with someone who might be a good fit.`,
    generatedTemplates: {
      coldEmail: `Subject: React.js Engineer Position - Occasional Flutter Support / Product-minded Engineer

Dear Zvart,

I came across your post about seeking a React.js engineer who loves building clean, practical products and understands the business behind the code. The hybrid nature of this role—confident frontend delivery with the capacity to support your Flutter ecosystem when needed—resonates deeply with my engineering ethos.

Over the past few years, I've focused on building responsive, premium React.js applications with a strong emphasis on component reusability, structural accessibility, and visual animations. In parallel, I've worked on mobile pipelines, allowing me to dive into Flutter codebases, inspect widgets, manage state, and deploy updates without friction.

Here is how my experience aligns with your specific needs:
1. React & Reusable UI: I build robust design systems utilizing component primitives, keeping code dry and maintainable.
2. Product & Clean Logic: I code with the end-user in mind, actively collaborating on product requirements to ensure technical decisions serve the user experience.
3. Flutter Support: I understand Dart and Flutter architectures, enabling me to support mobile features while driving frontend delivery.

I would love to learn more about the AI-driven projects you're spearheading and how I can help bring them to life. 

Are you open to a brief chat sometime this week?

Best regards,
Niteen Kumar
React & Flutter Specialist
https://github.com/niteenkumar`,
      proposal: `Hi Zvart,

Your request for a React.js Engineer who is product-minded and capable of supporting a Flutter codebase describes my exact technical profile! 

I specialize in building practical, high-fidelity user experiences that emphasize:
1. Reusable Code & Clean Architecture: Writing highly scalable React.js and TypeScript setups that are modular, fast, and documented.
2. Product-Led Engineering: I don't just write code; I seek to deeply understand the product goals and customer journey, resulting in cleaner features and fewer iterations.
3. Cross-Platform Adaptability: I am comfortable navigating and supporting Flutter apps, managing shared states, and implementing mobile UI updates whenever your mobile stack needs support.

I love building clean, responsive widgets and looking at the product holistically. I'd love to chat about your current AI product pipeline and how I can help push your frontend goals forward.

Let me know if you'd be down for a quick call!

Cheers,
Niteen`,
      linkedin: `Hi Zvart! Your post for a product-minded React.js engineer with Flutter support capabilities caught my eye. I specialize in building highly modular, premium React interfaces and have cross-platform experience to support Flutter apps. I'd love to connect and share some of my recent work with you. Cheers!`
    }
  },
  {
    id: "job-2",
    role: "Senior Frontend Architect",
    company: "Vercel",
    postedDate: "2026-05-25T10:15:00.000Z",
    contactName: "Lee Robinson",
    contactEmail: "lrob@vercel.com",
    matchScore: 92,
    tags: ["Next.js", "React 19", "Performance", "Tailwind CSS"],
    status: "Generated",
    parsedSummary: "Help design the future of Next.js App Router integrations. Drive design standards, performance optimization, and custom component libraries.",
    notes: "Requires deep Next.js performance knowledge. Tailwind CSS expertise is highly appreciated.",
    originalText: "Vercel is looking for a Senior Frontend Architect to lead core template creations and optimize Next.js integrations. Apply at vercel.com/careers or contact lrob@vercel.com.",
    generatedTemplates: {
      coldEmail: `Subject: Driving Next.js Excellence - Senior Frontend Architect Application

Dear Lee,

I am writing to express my interest in the Senior Frontend Architect position at Vercel. 

Having extensively worked with Next.js (including the latest features, App Router, and standard React Server Components architectures), I've designed multiple template libraries focused on visual performance, sub-second LCP scores, and robust theme systems.

My approach aligns perfectly with Vercel's standards:
- Next.js Optimization: Crafting fast server actions, client-side route transitions, and responsive widgets.
- Modern CSS Systems: Designing cohesive style architectures using custom-tailored variable maps and CSS layers.
- Developer Experience: Writing dry, reusable component foundations that empower teams to ship features with high fidelity.

I've attached links to my architectural templates and would welcome the opportunity to discuss how I can contribute to Vercel's mission of making the web faster and more beautiful.

Best regards,
Niteen Kumar`
    }
  },
  {
    id: "job-3",
    role: "Product Engineer (Next.js)",
    company: "Linear App",
    postedDate: "2026-05-24T08:00:00.000Z",
    contactName: "Tuomas Artman",
    contactEmail: "artman@linear.app",
    matchScore: 89,
    tags: ["Linear UX", "React", "State Sync", "Obsidian Style"],
    status: "Sent",
    parsedSummary: "Build state-synchronized workflows, keyboard-driven UI elements, and sleek obsidian-dark interfaces for our task planner.",
    notes: "Highly focused on micro-interactions, responsive states, and high performance.",
    originalText: "Linear is growing. Looking for a frontend engineer passionate about high-fidelity desktop web apps, custom shortcut states, and performance. Contact artman@linear.app.",
    generatedTemplates: {}
  }
];

export const getJobPosts = (): JobPost[] => {
  if (typeof window === 'undefined') return SEED_DATA;
  const data = localStorage.getItem('proposalizer_jobs');
  if (!data) {
    localStorage.setItem('proposalizer_jobs', JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return SEED_DATA;
  }
};

export const saveJobPosts = (jobs: JobPost[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('proposalizer_jobs', JSON.stringify(jobs));
};

export const addJobPost = (job: Omit<JobPost, "id" | "postedDate" | "status">): JobPost => {
  const jobs = getJobPosts();
  const newJob: JobPost = {
    ...job,
    id: `job-${Date.now()}`,
    postedDate: new Date().toISOString(),
    status: "Draft"
  };
  jobs.unshift(newJob);
  saveJobPosts(jobs);
  return newJob;
};

export const updateJobPost = (updatedJob: JobPost): void => {
  const jobs = getJobPosts();
  const index = jobs.findIndex(j => j.id === updatedJob.id);
  if (index !== -1) {
    jobs[index] = updatedJob;
    saveJobPosts(jobs);
  }
};

export const deleteJobPost = (id: string): void => {
  const jobs = getJobPosts();
  const filtered = jobs.filter(j => j.id !== id);
  saveJobPosts(filtered);
};

export const getUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const data = localStorage.getItem('proposalizer_profile');
  if (!data) {
    localStorage.setItem('proposalizer_profile', JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_PROFILE;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('proposalizer_profile', JSON.stringify(profile));
};
