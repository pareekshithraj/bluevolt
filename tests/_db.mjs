import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to run tenancy tests.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
export const prisma = new PrismaClient({ adapter });

export function uniqueSuffix(prefix = "test") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function cleanupOrganization(organizationId) {
  await prisma.organization.delete({
    where: { id: organizationId },
  });
}
