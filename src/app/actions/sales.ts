"use server";

import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

export async function getSalesHistory() {
    try {
        const session = await requireStores24Session();
        const storeId = Number(session.storeId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await prisma.sales.findMany({
            where: {
                store_id: storeId,
            },
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { saleItems: true } // Number of distinct items, or we can just return the array
                }
            }
        });

        const todaySales = await prisma.sales.aggregate({
            _sum: { total_amount: true },
            where: { store_id: storeId, date: { gte: today } }
        });

        const paymentMethods = await prisma.sales.groupBy({
            by: ['payment_method'],
            _sum: { total_amount: true },
            where: { store_id: storeId, date: { gte: today } }
        });

        return {
            success: true,
            sales: sales.map(s => ({
                id: s.id,
                billNumber: s.bill_number,
                amount: s.total_amount,
                method: s.payment_method,
                time: processTime(s.date),
                items: s._count.saleItems,
                status: "Completed" // Assume completed for now
            })),
            stats: {
                totalToday: todaySales._sum.total_amount || 0,
                upiTotal: paymentMethods.find(p => p.payment_method === 'UPI')?._sum.total_amount || 0,
                cashTotal: paymentMethods.find(p => p.payment_method === 'Cash')?._sum.total_amount || 0,
                cardTotal: paymentMethods.find(p => p.payment_method === 'Card')?._sum.total_amount || 0,
            }
        };
    } catch (error: unknown) {
        console.error("Failed to fetch sales history:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch sales history." };
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
