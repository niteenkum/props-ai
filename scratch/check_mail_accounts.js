import { prisma } from "../app/utils/prisma.js";

async function main() {
  const accounts = await prisma.mailAccount.findMany();
  console.log("ALL MAIL ACCOUNTS IN DB:", JSON.stringify(accounts, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
