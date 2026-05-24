"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

type AuditScope = "store" | "organization";

export async function getRecentAuditLogs(input?: {
  scope?: AuditScope;
  limit?: number;
  actionContains?: string;
  actorContains?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const session = await requireStores24Session();
    const organizationId = Number(session.organizationId);
    const storeId = Number(session.storeId);
    const scope = input?.scope === "organization" ? "organization" : "store";
    const take = Math.max(1, Math.min(input?.limit ?? 30, 100));
    const actionContains = input?.actionContains?.trim();
    const actorContains = input?.actorContains?.trim();
    const dateFrom = input?.dateFrom ? new Date(input.dateFrom) : null;
    const dateTo = input?.dateTo ? new Date(input.dateTo) : null;
    const createdAtFilter =
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          }
        : undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        organization_id: organizationId,
        ...(scope === "store" ? { store_id: storeId } : {}),
        ...(actionContains
          ? {
              action: {
                contains: actionContains,
                mode: "insensitive",
              },
            }
          : {}),
        ...(actorContains
          ? {
              actor: {
                is: {
                  OR: [
                    { name: { contains: actorContains, mode: "insensitive" } },
                    { username: { contains: actorContains, mode: "insensitive" } },
                  ],
                },
              },
            }
          : {}),
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      include: {
        actor: true,
        store: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });

    return {
      success: true,
      scope,
      logs: logs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entity_type,
        entityId: entry.entity_id,
        createdAt: entry.createdAt.toISOString(),
        actorName: entry.actor?.name || null,
        actorUsername: entry.actor?.username || null,
        storeName: entry.store?.name || null,
        metadata: entry.metadata,
      })),
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load audit logs.",
    };
  }
}
