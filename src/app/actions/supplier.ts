"use server";
import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

export async function getSuppliers() {
    try {
        const session = await requireStores24Session();
        const suppliers = await prisma.supplier.findMany({
            where: {
                store_id: Number(session.storeId),
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, suppliers };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch suppliers." };
    }
}

export async function createSupplier(data: { name: string, contact: string, phone: string, email: string, category: string }) {
    try {
        const session = await requireStores24Session();
        const supplier = await prisma.supplier.create({
            data: {
                ...data,
                store_id: Number(session.storeId),
            }
        });
        return { success: true, supplier };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to create supplier." };
    }
}

export async function deleteSupplier(id: number) {
    try {
        const session = await requireStores24Session();
        const deleted = await prisma.supplier.deleteMany({
            where: {
                id,
                store_id: Number(session.storeId),
            }
        });
        if (deleted.count === 0) {
            return { success: false, error: "Supplier not found for this store." };
        }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete supplier." };
    }
}
