import { Pool } from "pg";
// Trigger reload of updated Prisma Client schema
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Bump this version whenever the Prisma schema adds new models.
// It ensures the dev server always creates a fresh client rather than
// reusing a stale global singleton that is missing the new models.
const PRISMA_SCHEMA_VERSION = "v4"; // bumped: added userId to JobPost model

const GLOBAL_KEY = `prisma_${PRISMA_SCHEMA_VERSION}` as const;

const globalForPrisma = globalThis as unknown as {
  [key: string]: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in the environment variables.");
  }
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma[GLOBAL_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma[GLOBAL_KEY] = prisma;
