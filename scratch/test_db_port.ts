import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Test connection on port 443 (standard HTTPS port)
const connectionString = "postgresql://postgres.zvxilbynokgcuahfwxbb:Pitchly54321%40@aws-1-ap-southeast-1.pooler.supabase.com:443/postgres";
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing connection to Supabase pooler on port 443...");
  const count = await prisma.user.count();
  console.log(`Success! Total registered users: ${count}`);
}

main()
  .catch(err => {
    console.error("Database connection failed on port 443:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
