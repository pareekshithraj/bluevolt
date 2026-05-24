"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";
import { logStores24AuditEvent } from "@/lib/stores24/audit";

function canManageStore(role: string): boolean {
  return role.toLowerCase().includes("admin");
}

export async function getStoreStaffDirectory() {
  try {
    const session = await requireStores24Session();
    const organizationId = Number(session.organizationId);
    const storeId = Number(session.storeId);

    const orgUsers = await prisma.userStoreRole.findMany({
      where: {
        organization_id: organizationId,
        active: true,
      },
      include: {
        user: true,
      },
      orderBy: {
        user: { name: "asc" },
      },
    });

    const storeAssignments = await prisma.userStoreRole.findMany({
      where: {
        organization_id: organizationId,
        store_id: storeId,
        active: true,
      },
    });

    const assignmentByUserId = new Map(storeAssignments.map((entry) => [entry.user_id, entry]));
    const uniqueUsers = new Map<number, { id: number; name: string; username: string; status: string }>();

    for (const entry of orgUsers) {
      uniqueUsers.set(entry.user.id, {
        id: entry.user.id,
        name: entry.user.name,
        username: entry.user.username,
        status: entry.user.status,
      });
    }

    return {
      success: true,
      canManage: canManageStore(session.role),
      currentStoreId: storeId,
      users: Array.from(uniqueUsers.values()).map((user) => {
        const assignment = assignmentByUserId.get(user.id);
        return {
          ...user,
          assignedToCurrentStore: Boolean(assignment),
          storeRole: assignment?.role ?? null,
        };
      }),
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load store staff directory.",
    };
  }
}

export async function assignUserToCurrentStore(input: { userId: number; role: string }) {
  try {
    const session = await requireStores24Session();
    if (!canManageStore(session.role)) {
      return { success: false, error: "Only administrators can manage store assignments." };
    }

    const organizationId = Number(session.organizationId);
    const storeId = Number(session.storeId);
    const cleanRole = input.role.trim();
    if (!cleanRole) {
      return { success: false, error: "Role is required." };
    }

    const orgMembership = await prisma.userStoreRole.findFirst({
      where: {
        organization_id: organizationId,
        user_id: input.userId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!orgMembership) {
      return { success: false, error: "User is not part of this organization." };
    }

    await prisma.userStoreRole.upsert({
      where: {
        user_id_store_id: {
          user_id: input.userId,
          store_id: storeId,
        },
      },
      update: {
        active: true,
        role: cleanRole,
      },
      create: {
        user_id: input.userId,
        organization_id: organizationId,
        store_id: storeId,
        role: cleanRole,
        active: true,
      },
    });

    await logStores24AuditEvent({
      organizationId,
      storeId,
      actorUserId: Number(session.userId),
      action: "store.assignment.add_or_update",
      entityType: "user_store_role",
      entityId: `${input.userId}:${storeId}`,
      metadata: { role: cleanRole },
    });

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign user to store.",
    };
  }
}

export async function removeUserFromCurrentStore(userId: number) {
  try {
    const session = await requireStores24Session();
    if (!canManageStore(session.role)) {
      return { success: false, error: "Only administrators can manage store assignments." };
    }

    const storeId = Number(session.storeId);
    const organizationId = Number(session.organizationId);
    if (userId === Number(session.userId)) {
      return { success: false, error: "You cannot remove yourself from the active store." };
    }

    const existingAssignment = await prisma.userStoreRole.findFirst({
      where: {
        user_id: userId,
        store_id: storeId,
        active: true,
      },
      select: {
        role: true,
      },
    });

    if (!existingAssignment) {
      return { success: false, error: "Assignment not found." };
    }

    const isRemovingAdmin = existingAssignment.role.toLowerCase().includes("admin");
    if (isRemovingAdmin) {
      const activeStoreAdmins = await prisma.userStoreRole.count({
        where: {
          store_id: storeId,
          active: true,
          role: {
            contains: "admin",
            mode: "insensitive",
          },
        },
      });

      if (activeStoreAdmins <= 1) {
        return { success: false, error: "Cannot remove the last administrator from this store." };
      }

      const activeOrgAdmins = await prisma.userStoreRole.count({
        where: {
          organization_id: organizationId,
          active: true,
          role: {
            contains: "admin",
            mode: "insensitive",
          },
        },
      });

      if (activeOrgAdmins <= 1) {
        return { success: false, error: "Cannot remove the last administrator from this organization." };
      }
    }

    await prisma.userStoreRole.updateMany({
      where: {
        user_id: userId,
        store_id: storeId,
        active: true,
      },
      data: {
        active: false,
      },
    });

    await logStores24AuditEvent({
      organizationId,
      storeId,
      actorUserId: Number(session.userId),
      action: "store.assignment.remove",
      entityType: "user_store_role",
      entityId: `${userId}:${storeId}`,
    });

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove user from store.",
    };
  }
}
