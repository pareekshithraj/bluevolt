"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionDurationMs,
  readSessionToken,
} from "@/lib/stores24/session";
import { hashPassword, verifyPassword } from "@/lib/stores24/password";
import { logStores24AuditEvent } from "@/lib/stores24/audit";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function persistSession(input: {
  user: { id: number; username: string; name: string; role: string };
  organizationId: number;
  storeId: number;
  storeName: string;
  role: string;
}) {
  const cookieStore = await cookies();
  const { token } = await createSessionToken({
    userId: input.user.id.toString(),
    organizationId: input.organizationId.toString(),
    storeId: input.storeId.toString(),
    storeName: input.storeName,
    username: input.user.username,
    name: input.user.name,
    role: input.role,
  });

  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(getSessionDurationMs() / 1000),
  });
}

function dashboardPathForRole(role: string): string {
  return role === "Cashier" ? "/stores24/pos" : "/stores24/dashboard";
}

export async function registerUser(data: { name: string; username: string; password: string }) {
  try {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      return { success: false, error: "Username or Email is already registered." };
    }

    const workspaceBase = data.name.trim() || data.username.split("@")[0] || "BLUEVOLT";
    const workspaceSlug = workspaceBase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || `bluevolt-${Date.now()}`;
    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: `${workspaceBase} Workspace`,
          slug: `${workspaceSlug}-${Date.now()}`,
        },
      });

      const store = await tx.store.create({
        data: {
          organization_id: organization.id,
          name: `${workspaceBase} Main Store`,
          slug: "main-store",
          code: `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.name,
          username: data.username,
          role: "Administrator",
          password: hashPassword(data.password),
        },
      });

      await tx.userStoreRole.create({
        data: {
          user_id: user.id,
          organization_id: organization.id,
          store_id: store.id,
          role: "Administrator",
        },
      });

      return { organization, store, user };
    });

    await persistSession({
      user: created.user,
      organizationId: created.organization.id,
      storeId: created.store.id,
      storeName: created.store.name,
      role: "Administrator",
    });
    await logStores24AuditEvent({
      organizationId: created.organization.id,
      storeId: created.store.id,
      actorUserId: created.user.id,
      action: "workspace.bootstrap",
      entityType: "workspace",
      entityId: `${created.organization.id}:${created.store.id}`,
      metadata: { source: "register" },
    });

    return {
      success: true,
      user: { id: created.user.id, username: created.user.username, role: created.user.role },
      redirectTo: "/stores24/dashboard",
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Failed to create account.") };
  }
}

export async function loginUser(data: { username: string; password: string }) {
  try {
    const user = await prisma.user.findUnique({ where: { username: data.username } });

    if (!user || !verifyPassword(data.password, user.password)) {
      return { success: false, error: "Invalid username or password." };
    }

    if (user.status === "Inactive") {
      return { success: false, error: "This account has been deactivated. Please contact an administrator." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    let primaryAssignment = await prisma.userStoreRole.findFirst({
      where: {
        user_id: user.id,
        active: true,
      },
      include: {
        store: true,
        organization: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!primaryAssignment) {
      const workspaceBase = user.name.trim() || user.username.split("@")[0] || "BLUEVOLT";
      const workspaceSlug = workspaceBase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || `bluevolt-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: `${workspaceBase} Workspace`,
            slug: `${workspaceSlug}-${Date.now()}`,
          },
        });

        const store = await tx.store.create({
          data: {
            organization_id: organization.id,
            name: `${workspaceBase} Main Store`,
            slug: "main-store",
            code: `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          },
        });

        await tx.userStoreRole.create({
          data: {
            user_id: user.id,
            organization_id: organization.id,
            store_id: store.id,
            role: user.role,
          },
        });
      });

      primaryAssignment = await prisma.userStoreRole.findFirst({
        where: {
          user_id: user.id,
          active: true,
        },
        include: {
          store: true,
          organization: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }

    if (!primaryAssignment) {
      return { success: false, error: "No active store assignment found for this user." };
    }

    await persistSession({
      user,
      organizationId: primaryAssignment.organization.id,
      storeId: primaryAssignment.store.id,
      storeName: primaryAssignment.store.name,
      role: primaryAssignment.role,
    });

    return {
      success: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      redirectTo: dashboardPathForRole(primaryAssignment.role),
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "An authentication error occurred.") };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
  return { success: true };
}

export async function getAccessibleStores() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(getSessionCookieName())?.value;
    if (!sessionToken) {
      return { success: false, error: "Authentication required." };
    }

    const session = await readSessionToken(sessionToken);
    if (!session) {
      return { success: false, error: "Session expired." };
    }

    const assignments = await prisma.userStoreRole.findMany({
      where: {
        user_id: Number(session.userId),
        active: true,
      },
      include: {
        store: true,
        organization: true,
      },
      orderBy: [
        { organization: { name: "asc" } },
        { store: { name: "asc" } },
      ],
    });

    return {
      success: true,
      currentStoreId: Number(session.storeId),
      stores: assignments.map((entry) => ({
        storeId: entry.store_id,
        storeName: entry.store.name,
        organizationId: entry.organization_id,
        organizationName: entry.organization.name,
        role: entry.role,
      })),
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Failed to fetch accessible stores.") };
  }
}

export async function switchActiveStore(targetStoreId: number) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(getSessionCookieName())?.value;
    if (!sessionToken) {
      return { success: false, error: "Authentication required." };
    }

    const session = await readSessionToken(sessionToken);
    if (!session) {
      return { success: false, error: "Session expired." };
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
    });
    if (!user || user.status === "Inactive") {
      return { success: false, error: "User account is not active." };
    }

    const assignment = await prisma.userStoreRole.findFirst({
      where: {
        user_id: user.id,
        store_id: targetStoreId,
        active: true,
      },
      include: {
        store: true,
        organization: true,
      },
    });

    if (!assignment) {
      return { success: false, error: "You do not have access to this store." };
    }

    await persistSession({
      user,
      organizationId: assignment.organization.id,
      storeId: assignment.store.id,
      storeName: assignment.store.name,
      role: assignment.role,
    });
    await logStores24AuditEvent({
      organizationId: assignment.organization.id,
      storeId: assignment.store.id,
      actorUserId: user.id,
      action: "store.switch",
      entityType: "store",
      entityId: assignment.store.id.toString(),
      metadata: {
        username: user.username,
        role: assignment.role,
      },
    });

    return {
      success: true,
      redirectTo: dashboardPathForRole(assignment.role),
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Failed to switch store.") };
  }
}
