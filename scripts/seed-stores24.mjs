import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scryptSync } from "node:crypto";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function normalizeSlug(input, fallback) {
  const slug = String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return slug || fallback;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run stores24 seed.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const orgName = process.env.SEED_ORG_NAME || "BlueVolt Demo Workspace";
const orgSlug = normalizeSlug(process.env.SEED_ORG_SLUG || orgName, "bluevolt-demo");
const storeName = process.env.SEED_STORE_NAME || "BlueVolt Main Store";
const storeSlug = normalizeSlug(process.env.SEED_STORE_SLUG || storeName, "main-store");
const storeCode = process.env.SEED_STORE_CODE || `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const adminName = process.env.SEED_ADMIN_NAME || "BlueVolt Admin";
const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin@bluevolt.group";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

if (adminPassword === "ChangeMe123!") {
  console.warn("Using default admin password. Set SEED_ADMIN_PASSWORD before production usage.");
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug: orgSlug },
      update: { name: orgName },
      create: { name: orgName, slug: orgSlug },
    });

    const store = await tx.store.upsert({
      where: {
        organization_id_slug: {
          organization_id: organization.id,
          slug: storeSlug,
        },
      },
      update: { name: storeName },
      create: {
        organization_id: organization.id,
        name: storeName,
        slug: storeSlug,
        code: storeCode,
      },
    });

    const user = await tx.user.upsert({
      where: { username: adminUsername },
      update: {
        name: adminName,
        role: "Administrator",
        status: "Active",
        password: hashPassword(adminPassword),
      },
      create: {
        name: adminName,
        username: adminUsername,
        role: "Administrator",
        status: "Active",
        password: hashPassword(adminPassword),
      },
    });

    await tx.userStoreRole.upsert({
      where: {
        user_id_store_id: {
          user_id: user.id,
          store_id: store.id,
        },
      },
      update: {
        active: true,
        role: "Administrator",
      },
      create: {
        user_id: user.id,
        organization_id: organization.id,
        store_id: store.id,
        role: "Administrator",
        active: true,
      },
    });

    const existingProducts = await tx.product.count({
      where: { store_id: store.id },
    });

    if (existingProducts === 0) {
      await tx.product.createMany({
        data: [
          {
            store_id: store.id,
            name: "Rice 5kg",
            barcode: "890100000001",
            price: 450,
            gst_percentage: 5,
            stock: 30,
          },
          {
            store_id: store.id,
            name: "Milk 1L",
            barcode: "890100000002",
            price: 60,
            gst_percentage: 5,
            stock: 80,
          },
          {
            store_id: store.id,
            name: "Sugar 1kg",
            barcode: "890100000003",
            price: 50,
            gst_percentage: 5,
            stock: 45,
          },
        ],
      });
    }

    return {
      organization,
      store,
      user,
      seededProducts: existingProducts === 0,
    };
  });

  console.log("Stores24 seed completed.");
  console.log(`Organization: ${result.organization.name} (${result.organization.slug})`);
  console.log(`Store: ${result.store.name} (id=${result.store.id})`);
  console.log(`Admin: ${result.user.username}`);
  console.log(`Sample products inserted: ${result.seededProducts ? "yes" : "no (already existed)"}`);
}

main()
  .catch((error) => {
    console.error("Stores24 seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
