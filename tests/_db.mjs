import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to run tenancy tests.");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false } // Support self-signed or unverified SSL certificates in test environment
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export function uniqueSuffix(prefix = "test") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function cleanupOrganization(organizationId) {
  await prisma.organization.delete({
    where: { id: organizationId },
  });
}
