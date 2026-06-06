const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mock analyzeJobCandidacyAction behavior or load it
const { analyzeJobCandidacyAction } = require("./app/actions/ai-actions");

async function main() {
  const userEmail = "niteen.kumar@devstudio.com";
  const text = `Jumpshare is hiring a 𝐅𝐫𝐨𝐧𝐭-𝐄𝐧𝐝 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐫 (𝐑𝐞𝐚𝐜𝐭𝐉𝐒) on remote basis.

🏢 𝐂𝐨𝐦𝐩𝐚𝐧𝐲: Jumpshare
💼 𝐑𝐨𝐥𝐞: Front-End Developer (ReactJS)
🌍 𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧: Remote
🕰️ 𝐓𝐲𝐩𝐞: Full-Time
📈 𝐄𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞: 3+ years in front-end development
🎓 𝐐𝐮𝐚𝐥𝐢𝐟𝐢𝐜𝐚𝐭𝐢𝐨𝐧: Strong expertise in JavaScript (React), HTML5, CSS3

🛠️ 𝐊𝐞𝐲 𝐑𝐞𝐬𝐩𝐨𝐧𝐬𝐢𝐛𝐢𝐥𝐢𝐭𝐢𝐞𝐬:

▪️ Build dynamic, responsive, and pixel-perfect web apps using React, TailwindCSS, jQuery & Redux Toolkit (RTK)
▪️ Translate Figma prototypes into reusable and scalable components
▪️ Contribute to design systems & collaborate closely with UI/UX designers
▪️ Work with RESTful APIs, asynchronous requests & modern build tools
▪️ Participate in rapid release cycles, unit testing & debugging

🔍 𝐑𝐞𝐪𝐮𝐢𝐫𝐞𝐦𝐞𝐧𝐭𝐬 / 𝐒𝐤𝐢𝐥𝐥𝐬:

▪️ 3+ years professional front-end development experience
▪️ Advanced JavaScript (React) skills, plus solid HTML5 & CSS3 knowledge
▪️ Experience with TailwindCSS, RTK Query, Git & cross-browser compatibility
 ▪️ Passion for clean code & exceptional user experiences
▪️ (Bonus: TypeScript or Next.js experience)

📩 𝐇𝐨𝐰 𝐭𝐨 𝐀𝐩𝐩𝐥𝐲:
Send your resume to: farriha@jumpshare.com
USA GIGS`;

  console.log("Analyzing Jumpshare text...");
  const result = await analyzeJobCandidacyAction(text, userEmail);
  console.log("AI Candidacy Result:", JSON.stringify(result, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
