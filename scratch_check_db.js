const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Querying WhatsApp Messages in DB ===");
  const msgs = await prisma.whatsAppMessage.findMany({
    take: 10,
    select: {
      id: true,
      whatsappMessageId: true,
      status: true,
      jobPostId: true,
    }
  });
  console.log("WhatsApp Messages (last 10):", JSON.stringify(msgs, null, 2));

  console.log("\n=== Querying Job Posts in DB ===");
  const jobs = await prisma.jobPost.findMany({
    take: 10,
    select: {
      id: true,
      role: true,
      company: true,
    }
  });
  console.log("Job Posts (last 10):", JSON.stringify(jobs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
