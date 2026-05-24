import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logStores24AuditEvent(input: {
  organizationId: number;
  storeId?: number | null;
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organization_id: input.organizationId,
        store_id: input.storeId ?? null,
        actor_user_id: input.actorUserId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    // Do not block product flows when audit write fails.
    console.error("Failed to write audit log:", error);
  }
}
