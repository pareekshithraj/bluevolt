"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";
import { logStores24AuditEvent } from "@/lib/stores24/audit";
import { Prisma } from "@prisma/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function buildStoreCode(): string {
  return `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function getOrganizationStores() {
  try {
    const session = await requireStores24Session();
    const organization = await prisma.organization.findUnique({
      where: { id: Number(session.organizationId) },
      select: { name: true },
    });
    const stores = await prisma.store.findMany({
      where: {
        organization_id: Number(session.organizationId),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      stores,
      currentStoreId: Number(session.storeId),
      organizationId: Number(session.organizationId),
      organizationName: organization?.name || "Workspace",
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load stores.",
    };
  }
}

export async function createStore(data: { name: string; slug?: string }) {
  try {
    const session = await requireStores24Session();
    const role = session.role.toLowerCase();
    if (!role.includes("admin")) {
      return { success: false, error: "Only administrators can create stores." };
    }

    const baseName = data.name.trim();
    if (!baseName) {
      return { success: false, error: "Store name is required." };
    }

    const requestedSlug = data.slug?.trim() || baseName;
    const cleanSlug = slugify(requestedSlug);
    if (!cleanSlug) {
      return { success: false, error: "Store slug is invalid." };
    }

    const store = await prisma.store.create({
      data: {
        organization_id: Number(session.organizationId),
        name: baseName,
        slug: cleanSlug,
        code: buildStoreCode(),
      },
    });

    await prisma.userStoreRole.upsert({
      where: {
        user_id_store_id: {
          user_id: Number(session.userId),
          store_id: store.id,
        },
      },
      update: {
        active: true,
        role: "Administrator",
      },
      create: {
        user_id: Number(session.userId),
        organization_id: Number(session.organizationId),
        store_id: store.id,
        role: "Administrator",
        active: true,
      },
    });
    await logStores24AuditEvent({
      organizationId: Number(session.organizationId),
      storeId: store.id,
      actorUserId: Number(session.userId),
      action: "store.create",
      entityType: "store",
      entityId: store.id.toString(),
      metadata: {
        name: store.name,
        slug: store.slug,
        code: store.code,
      },
    });

    return { success: true, store };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Store slug or code already exists. Try another name." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create store.",
    };
  }
}
