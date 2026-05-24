"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

type StockAlertRow = {
    id: number;
    name: string;
    stock: number;
};

type SaleMovementRow = {
    id: number;
    quantity: number;
    product: {
        name: string;
    };
    sale: {
        bill_number: string;
        date: Date;
    };
};

export async function getInventoryData() {
    try {
        const session = await requireStores24Session();
        const storeId = Number(session.storeId);
        // 1. Fetch products with low stock (Threshold is 10 for now)
        const stockAlerts = await prisma.product.findMany({
            where: {
                store_id: storeId,
                stock: {
                    lte: 10
                }
            },
            orderBy: { stock: 'asc' },
            select: {
                id: true,
                name: true,
                stock: true,
                // We simulate a threshold of 10 for all items in this basic version
            }
        }) as StockAlertRow[];

        const mappedAlerts = stockAlerts.map((product) => {
            let status = "Low";
            if (product.stock === 0) status = "Depleted";
            else if (product.stock <= 5) status = "Critical";

            return {
                id: product.id,
                name: product.name,
                current: product.stock,
                threshold: 10,
                status
            };
        });

        // 2. Fetch movement history (latest 50 sale items to act as OUT movements)
        // In a fully developed app, you would have an InventoryMovement table for IN/OUT.
        // For now, we will use SaleItems for OUT movements.
        const saleMovements = await prisma.saleItem.findMany({
            take: 50,
            where: {
                sale: {
                    store_id: storeId,
                },
            },
            orderBy: { sale: { date: 'desc' } },
            include: {
                product: true,
                sale: true
            }
        }) as SaleMovementRow[];

        const recentHistory = saleMovements.map((item) => ({
            id: item.id,
            type: "OUT",
            product: item.product.name,
            qty: item.quantity,
            reason: `Sale ${item.sale.bill_number}`,
            time: processTime(item.sale.date),
            user: "System" // We don't have cashier logged in yet
        }));

        return {
            success: true,
            stockAlerts: mappedAlerts,
            recentHistory
        };

    } catch (error: unknown) {
        console.error("Failed to fetch inventory data:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch inventory data." };
    }
}

function processTime(date: Date) {
    return new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        day: 'numeric',
        month: 'short'
    }).format(date);
}
