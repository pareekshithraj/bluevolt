"use server";
import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

export async function getPurchaseOrders() {
    try {
        const session = await requireStores24Session();
        const purchases = await prisma.purchaseOrder.findMany({
            where: {
                store_id: Number(session.storeId),
            },
            include: { supplier: true },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, purchases };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch purchase orders." };
    }
}

export async function createPurchaseOrder(data: { po_number: string, supplier_id: number, items_count: number, total_amount: number }) {
    try {
        const session = await requireStores24Session();
        const po = await prisma.purchaseOrder.create({
            data: {
                ...data,
                store_id: Number(session.storeId),
            }
        });
        return { success: true, po };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase order." };
    }
}
