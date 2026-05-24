"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStores24Session } from "@/lib/stores24/server-context";
import type { Prisma } from "@prisma/client";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Failed to process transaction.";
}

export async function processCheckout(payload: {
    paymentMethod: string;
    totalAmount: number;
    items: { id: number; quantity: number; price: number }[];
    customerId?: number;
}) {
    try {
        const session = await requireStores24Session();
        const storeId = Number(session.storeId);
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Create the base Sale record
            const sale = await tx.sales.create({
                data: {
                    store_id: storeId,
                    bill_number: `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    total_amount: payload.totalAmount,
                    payment_method: payload.paymentMethod,
                    customer_id: payload.customerId || null,
                }
            });

            // 2. Iterate over items to create SaleItems and deduct stock
            for (const item of payload.items) {
                const productUpdate = await tx.product.updateMany({
                    where: {
                        id: item.id,
                        store_id: storeId,
                    },
                    data: { stock: { decrement: item.quantity } }
                });

                if (productUpdate.count === 0) {
                    throw new Error(`Product ${item.id} was not found in this store.`);
                }

                // Create the individual line item associated with the sale
                await tx.saleItem.create({
                    data: {
                        sale_id: sale.id,
                        product_id: item.id,
                        quantity: item.quantity,
                        price: item.price,
                    }
                });
            }

            // 3. Award loyalty points if a customer is linked
            let pointsEarned = 0;
            if (payload.customerId) {
                pointsEarned = Math.floor(payload.totalAmount / 100); // 1 point per 100 INR
                if (pointsEarned > 0) {
                    await tx.customer.updateMany({
                        where: {
                            id: payload.customerId,
                            store_id: storeId,
                        },
                        data: { total_points: { increment: pointsEarned } }
                    });
                }
            }

            return { sale, pointsEarned };
        });

        // Invalidate caches to refresh data across dashboards
        revalidatePath("/stores24/pos");
        revalidatePath("/stores24/dashboard");
        revalidatePath("/stores24/inventory");
        revalidatePath("/stores24/sales");

        return { success: true, billNumber: result.sale.bill_number, pointsEarned: result.pointsEarned };
    } catch (error: unknown) {
        console.error("Checkout failed:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}
