import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

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

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 5,
    options: "-c statement_timeout=15000",
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
