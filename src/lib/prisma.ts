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

function normalizeDatabaseUrlForPg(value: string): string {
  return value.trim();
}

function sslFromDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const sslMode = url.searchParams.get("sslmode");
    if (!sslMode || sslMode === "disable") return undefined;
    return { rejectUnauthorized: sslMode === "verify-full" };
  } catch {
    return undefined;
  }
}

// Keep database failures short and clear in the UI instead of waiting on long network retries.
const createPrismaClient = () => {
  if (!databaseUrl) return createUnavailablePrismaClient("DATABASE_URL is not set");

  const pool = new Pool({
    connectionString: normalizeDatabaseUrlForPg(databaseUrl),
    ssl: sslFromDatabaseUrl(databaseUrl),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
