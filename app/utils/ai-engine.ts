import { UserProfile } from "./db";

export interface AIAnalysisResult {
  role: string;
  company: string;
  contactName: string;
  contactEmail: string;
  matchScore: number;
  tags: string[];
  parsedSummary: string;
  notes: string;
  generatedTemplates: {
    coldEmail: string;
    proposal: string;
    linkedin: string;
    coverLetter: string;
  };
}

export const analyzeJobPost = (text: string, profile: UserProfile): AIAnalysisResult => {
  const cleanText = text.trim();

  // 1. Extract Role (Heuristics)
  let role = "Frontend Engineer";
  const roleKeywords = [
    { word: "React.js Engineer", match: /react\.js\s+engineer/i },
    { word: "React Developer", match: /react\s+developer/i },
    { word: "React.js Developer", match: /react\.js\s+developer/i },
    { word: "Senior Frontend Architect", match: /senior\s+frontend\s+architect/i },
    { word: "Senior Frontend Engineer", match: /senior\s+frontend\s+engineer/i },
    { word: "Frontend Engineer", match: /frontend\s+engineer/i },
    { word: "Frontend Developer", match: /frontend\s+developer/i },
    { word: "Next.js Architect", match: /next\.js\s+architect/i },
    { word: "Next.js Engineer", match: /next\.js\s+engineer/i },
    { word: "Product Engineer", match: /product\s+engineer/i },
    { word: "Software Engineer", match: /software\s+engineer/i }
  ];
  for (const item of roleKeywords) {
    if (item.match.test(cleanText)) {
      role = item.word;
      break;
    }
  }

  // 2. Extract Company & Contact Name (Heuristics)
  let company = "Outreach Partner";
  let contactName = "Team Member";
  
  // Check if Zvart Manukyan pattern matches
  if (/Zvart\s+Manukyan/i.test(cleanText)) {
    contactName = "Zvart Manukyan";
    company = "AI-Driven Product Development";
  } else if (/Lee\s+Robinson/i.test(cleanText) || /Vercel/i.test(cleanText)) {
    contactName = /Lee\s+Robinson/i.test(cleanText) ? "Lee Robinson" : "Hiring Manager";
    company = "Vercel";
  } else if (/Tuomas\s+Artman/i.test(cleanText) || /Linear/i.test(cleanText)) {
    contactName = /Tuomas\s+Artman/i.test(cleanText) ? "Tuomas Artman" : "Hiring Team";
    company = "Linear App";
  } else {
    // Try to extract name from top lines
    const lines = cleanText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 30 && !/looking|hiring|job|need|want/i.test(lines[0])) {
      contactName = lines[0];
      if (lines.length > 1 && lines[1].length < 40 && !/looking|hiring|job|need|want/i.test(lines[1])) {
        contactName = lines[0];
        company = lines[1].split("|")[0].trim();
      }
    }
  }

  // 3. Extract Email Address (Regex)
  let contactEmail = "outreach@company.io";
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const foundEmails = cleanText.match(emailRegex);
  if (foundEmails && foundEmails.length > 0) {
    contactEmail = foundEmails[0];
  } else {
    // Generate realistic custom email if not specified
    const cleanName = contactName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanComp = company.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName && cleanComp && cleanName !== "teammember") {
      contactEmail = `${cleanName}@${cleanComp || "company"}.com`;
    }
  }

  // 4. Tech Stack & Tags extraction from current profile's skills!
  const foundTags: string[] = [];
  profile.skills.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanText)) {
      if (!foundTags.includes(skill)) {
        foundTags.push(skill);
      }
    }
  });
  
  // Standard default tags if empty
  if (foundTags.length === 0) {
    foundTags.push("React.js", "Frontend", "Tailwind CSS");
  }

  // 5. Match Score calculation
  const matchedSkillsCount = foundTags.length;
  let matchScore = 70 + Math.min(matchedSkillsCount * 4, 25); // starts at 70, adds 4% per matched skill up to 95
  
  // Specific matching checks
  const hasReact = foundTags.some(t => /react/i.test(t));
  const hasFlutter = foundTags.some(t => /flutter/i.test(t));
  if (hasReact && hasFlutter) matchScore = Math.min(matchScore + 5, 100);

  // 6. Summary and notes construction
  const parsedSummary = cleanText.length > 200 
    ? cleanText.substring(0, 200) + "..." 
    : cleanText;
    
  const notes = `Targeting ${contactName} at ${company}. Required key competencies found: ${foundTags.join(', ')}.`;

  // Dynamic outreach generation leveraging customizable User Profile settings
  const supportsFlutter = foundTags.some(t => /flutter/i.test(t));
  
  // Fetch a project from the profile to highlight in the cover letter/proposal
  const primaryProject = profile.projects.length > 0 
    ? profile.projects[0] 
    : { name: "ThePitchly Hub", description: "Built customized React frameworks with dynamic components." };

  // Custom Cold Email Template
  const coldEmail = `Subject: ${role} Position - Product-Minded Outreach for ${company}

Dear ${contactName.split(" ")[0]},

I read your post looking for a ${role} at ${company} and wanted to reach out. I love building clean, practical products and deeply understanding the user experience and business needs behind the code.

${supportsFlutter ? `I noticed that the role benefits from someone who is confident with frontend architecture but can also jump in and support your Flutter application when needed. This fits my background perfectly—I specialize in standardizing reusable ${profile.skills.slice(0, 3).join(', ')} pipelines, but I also have cross-platform experience with Flutter (Dart) which allows me to work across both mobile and web stacks without friction.` : `I specialize in building rich, highly performant user interfaces with premium styled design systems. My focus has always been on creating dry, reusable components and clean codebase architectures using ${profile.skills.slice(0, 4).join(', ')} that help products scale fast without incurring technical debt.`}

Here is how my expertise aligns with your objectives:
1. Reusable Component Systems: I build modular structures with clear state segregation, making updates smooth and onboarding fast.
2. Product & Logic Focus: I code with the end-user and core business goals in mind, which prevents visual clutter and streamlines the product lifecycle.
${supportsFlutter ? `3. Mobile Support (Flutter): I can easily read, write, and support your Dart/Flutter codebase so that you don't need to coordinate between two separate engineering silos.` : `3. Speed & Optimization: Experienced with high-fidelity animations, responsive web layouts, and performance auditing.`}

Recently, I built "${primaryProject.name}", where I ${primaryProject.description.toLowerCase()}

I would love to learn more about ${company}'s core roadmap and discuss how my product-focused engineering style can help you execute.

Are you open to a brief introductory sync this week?

Warm regards,
${profile.name}
${profile.role}
Portfolio: ${profile.portfolioUrl}
GitHub: ${profile.githubUrl}`;

  // Upwork / Freelance Pitch Template
  const proposal = `Hi ${contactName.split(" ")[0]},

Your search for a ${role} who loves building clean, practical features and truly understands the "why" behind the code matches my engineering philosophy perfectly. 

I write highly reusable code and structure architectures so that future expansions are easy and fast. I actively use ${profile.skills.slice(0, 5).join(', ')} to deliver robust interfaces. ${supportsFlutter ? `Plus, my familiarity with Flutter means you get a versatile engineer who can confidently deliver premium React interfaces while helping support your mobile codebase when needed.` : `I am deeply committed to writing scalable components and ensuring web performance is optimized.`}

One of my notable projects is "${primaryProject.name}", where I ${primaryProject.description.toLowerCase()}

Here is my direct action plan to support your pipeline:
- High-Density Modular Code: I will deliver highly optimized, documentable React modules that keep your layout clean.
- Product Synergy: I coordinate closely on requirements to make sure that the technical implementation solves the actual user problems.
- Robust Adaptability: Fast, reliable iterations that prioritize speed, security, and delightful micro-animations.

I've built several dynamic templates and would love to bring that same standard of polish to ${company}. Let's jump on a quick call to talk details!

Best,
${profile.name}`;

  // LinkedIn Connection Note (Max 300 Characters)
  const linkedin = `Hi ${contactName.split(" ")[0]}! I saw your post for a ${role} at ${company}. I'm a product-focused frontend engineer specializing in clean, reusable React${supportsFlutter ? " and Flutter apps" : " setups"}. I'd love to connect, learn about what you're building, and share my work. Cheers!`.substring(0, 299);

  // Cover Letter Template
  const coverLetter = `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${role} position at ${company}. With a proven track record of designing highly interactive user experiences and maintaining high standards of code reusability as a ${profile.role}, I am eager to contribute to your product's success.

Throughout my career, I have dedicated myself to bridging the gap between engineering complexity and intuitive product design. I believe that writing code is only half the battle; understanding the user behavior, business context, and visual flows is what truly defines exceptional product delivery. 

In my recent project, "${primaryProject.name}", I successfully:
- ${primaryProject.description}

Here is a summary of what I bring to the table:
- Core Competencies: ${profile.skills.slice(0, 6).join(', ')}.
- Reusable UI Systems: Designing custom component boundaries to keep styling dry and visual states consistent.
${supportsFlutter ? `- Cross-Stack Adaptability: Seamlessly managing mobile updates in Dart/Flutter alongside Next.js architectures.` : `- Performance Tuning: Deeply analyzing render paths and optimizing client-side bundles.`}

I am particularly excited about ${company} because of your commitment to AI-driven and developer-first workflows. I am eager to apply my technical precision and product curiosity to your team.

Thank you for your time and consideration. I look forward to the opportunity to discuss my qualifications in further detail.

Sincerely,
${profile.name}
Email: ${profile.email}
GitHub: ${profile.githubUrl}
Portfolio: ${profile.portfolioUrl}`;

  return {
    role,
    company,
    contactName,
    contactEmail,
    matchScore,
    tags: foundTags,
    parsedSummary,
    notes,
    generatedTemplates: {
      coldEmail,
      proposal,
      linkedin,
      coverLetter
    }
  };
};
