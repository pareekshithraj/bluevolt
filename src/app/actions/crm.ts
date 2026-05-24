"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

export async function lookupCustomer(phone: string) {
    try {
        const session = await requireStores24Session();
        const customer = await prisma.customer.findFirst({
            where: {
                phone,
                store_id: Number(session.storeId),
            }
        });
        return { success: true, customer };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to load customer." };
    }
}

export async function registerCustomer(phone: string, name?: string) {
    try {
        const session = await requireStores24Session();
        const customer = await prisma.customer.create({
            data: {
                phone,
                name,
                store_id: Number(session.storeId),
            }
        });
        return { success: true, customer };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to register customer." };
    }
}
