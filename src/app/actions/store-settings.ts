"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";
import { logStores24AuditEvent } from "@/lib/stores24/audit";

const allowedGstValues = new Set([0, 5, 12, 18, 28]);

function canManageSettings(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized.includes("admin") || normalized.includes("manager");
}

export async function getCurrentStoreSettings() {
  try {
    const session = await requireStores24Session();
    const store = (await prisma.store.findFirst({
      where: {
        id: Number(session.storeId),
        organization_id: Number(session.organizationId),
      },
    })) as unknown as {
      id: number;
      name: string;
      gstin: string | null;
      address: string | null;
      default_gst_percentage: number;
      auto_print_receipt: boolean;
      include_gst_breakdown_on_receipt: boolean;
      enable_pos_dark_mode: boolean;
    } | null;

    if (!store) {
      return { success: false, error: "Active store was not found." };
    }

    return { success: true, settings: store };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load store settings.",
    };
  }
}

export async function updateCurrentStoreSettings(input: {
  name: string;
  gstin?: string;
  address?: string;
  defaultGstPercentage: number;
  autoPrintReceipt: boolean;
  includeGstBreakdownOnReceipt: boolean;
  enablePosDarkMode: boolean;
}) {
  try {
    const session = await requireStores24Session();
    if (!canManageSettings(session.role)) {
      return { success: false, error: "You do not have permission to update store settings." };
    }

    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "Store name is required." };
    }

    if (!allowedGstValues.has(input.defaultGstPercentage)) {
      return { success: false, error: "Invalid default GST value." };
    }

    const gstin = input.gstin?.trim() || null;
    const address = input.address?.trim() || null;

    const store = await prisma.store.updateMany({
      where: {
        id: Number(session.storeId),
        organization_id: Number(session.organizationId),
      },
      data: {
        name,
        gstin,
        address,
        default_gst_percentage: input.defaultGstPercentage,
        auto_print_receipt: input.autoPrintReceipt,
        include_gst_breakdown_on_receipt: input.includeGstBreakdownOnReceipt,
        enable_pos_dark_mode: input.enablePosDarkMode,
      } as unknown as never,
    });

    if (store.count === 0) {
      return { success: false, error: "Active store was not found for update." };
    }

    await logStores24AuditEvent({
      organizationId: Number(session.organizationId),
      storeId: Number(session.storeId),
      actorUserId: Number(session.userId),
      action: "store.settings.update",
      entityType: "store",
      entityId: session.storeId,
      metadata: {
        defaultGstPercentage: input.defaultGstPercentage,
        autoPrintReceipt: input.autoPrintReceipt,
        includeGstBreakdownOnReceipt: input.includeGstBreakdownOnReceipt,
        enablePosDarkMode: input.enablePosDarkMode,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update store settings.",
    };
  }
}
