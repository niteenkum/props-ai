process.env.DATABASE_URL = "postgresql://postgres.zvxilbynokgcuahfwxbb:Pitchly54321%40@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
import { prisma } from "../app/utils/prisma";

async function main() {
  const accounts = await prisma.mailAccount.findMany();
  console.log("ALL MAIL ACCOUNTS IN DB:", JSON.stringify(accounts, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
