import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// Keep database failures short and clear in the UI instead of waiting on long network retries.
const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 5,
  options: "-c statement_timeout=15000",
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
