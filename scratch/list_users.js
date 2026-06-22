const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true
    }
  });
  console.log("Users in Database:", JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
