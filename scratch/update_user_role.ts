import { prisma } from "../app/utils/prisma";

async function main() {
  const email = "niteen@niteen.dev";
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPERADMIN" },
    create: {
      email,
      name: "Niteen",
      password: "password123",
      role: "SUPERADMIN",
      status: "ACTIVE",
    }
  });
  console.log(`Successfully configured user ${email} with role: ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
