import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function configuredDatabaseUrl(): string | undefined {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL
  )?.trim();
}

const databaseUrl = configuredDatabaseUrl();

function createUnavailablePrismaClient(reason: string): PrismaClient {
  const throwUnavailable = () => {
    throw new Error(reason);
  };
  const asyncThrowUnavailable = async () => {
    throw new Error(reason);
  };
  const modelProxy = new Proxy(function unavailablePrismaModel() {}, {
    apply: throwUnavailable,
    get: () => asyncThrowUnavailable,
  });

  return new Proxy({} as PrismaClient, {
    get: (_target, property) => {
      if (property === "$disconnect") return async () => undefined;
      if (property === "$connect") return asyncThrowUnavailable;
      if (property === "$executeRaw" || property === "$queryRaw") return asyncThrowUnavailable;
      if (property === Symbol.toStringTag) return "PrismaUnavailable";
      return modelProxy;
    },
  });
}



// Keep database failures short and clear in the UI instead of waiting on long network retries.
const createPrismaClient = () => {
  if (!databaseUrl) return createUnavailablePrismaClient("DATABASE_URL is not set");

  const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const cleanConnectionString = databaseUrl.replace(/[\?&]sslmode=[^&]*/g, "");

  const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 2000, // Detect connectivity issues quickly on serverless cold starts
    idleTimeoutMillis: 15000,
    max: isServerless ? 1 : 5, // Limit to 1 connection per serverless function instance to prevent DB pool exhaustion
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
