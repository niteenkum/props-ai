import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  .finally(() => prisma.$disconnect());
