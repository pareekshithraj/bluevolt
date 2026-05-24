"use server";
import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";

type FinancialSaleRow = {
    bill_number: string;
    total_amount: number;
    payment_method: string;
    date: Date;
    saleItems: {
        quantity: number;
    }[];
};

type ProductRow = {
    name: string;
    barcode: string;
    stock: number;
    price: number;
};

type TaxSaleItemRow = {
    price: number;
    quantity: number;
    product: {
        name: string;
        gst_percentage: number;
    };
    sale: {
        date: Date;
        bill_number: string;
    };
};

export async function getFinancialReport() {
    try {
        const session = await requireStores24Session();
        const sales = await prisma.sales.findMany({
            where: {
                store_id: Number(session.storeId),
            },
            include: { saleItems: true },
            orderBy: { date: 'desc' }
        }) as FinancialSaleRow[];

        const data = sales.map((sale) => {
            return {
                Date: sale.date.toISOString().split('T')[0],
                Bill_Number: sale.bill_number,
                Payment_Method: sale.payment_method,
                Total_Amount_INR: sale.total_amount
            };
        });

        return { success: true, data };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to generate financial report." };
    }
}

export async function getStockValuationReport() {
    try {
        const session = await requireStores24Session();
        const products = await prisma.product.findMany({
            where: {
                store_id: Number(session.storeId),
            },
            orderBy: { name: 'asc' }
        }) as ProductRow[];

        const data = products.map((product) => {
            return {
                Product_Name: product.name,
                Barcode: product.barcode,
                Current_Stock: product.stock,
                Unit_Price_INR: product.price,
                Total_Value_INR: product.stock * product.price
            };
        });

        return { success: true, data };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to generate stock valuation report." };
    }
}

export async function getLowStockReport() {
    try {
        const session = await requireStores24Session();
        const products = await prisma.product.findMany({
            where: {
                store_id: Number(session.storeId),
                stock: { lte: 10 },
            },
            orderBy: { stock: 'asc' }
        }) as ProductRow[];

        const data = products.map((product) => {
            return {
                Product_Name: product.name,
                Barcode: product.barcode,
                Current_Stock: product.stock,
                Alert_Threshold: 10,
                Supplier_Required: "Yes"
            };
        });

        return { success: true, data };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to generate low stock report." };
    }
}

export async function getTaxReport() {
    try {
        const session = await requireStores24Session();
        const salesItems = await prisma.saleItem.findMany({
            where: {
                sale: {
                    store_id: Number(session.storeId),
                },
            },
            include: { product: true, sale: true }
        }) as TaxSaleItemRow[];

        const data = salesItems.map((item) => {
            const rawPriceBeforeTax = item.price / (1 + (item.product.gst_percentage / 100));
            const taxAmount = (item.price - rawPriceBeforeTax) * item.quantity;

            return {
                Date: item.sale.date.toISOString().split('T')[0],
                Bill_Number: item.sale.bill_number,
                Product: item.product.name,
                Quantity: item.quantity,
                GST_Percentage: `${item.product.gst_percentage}%`,
                Tax_Collected_INR: taxAmount.toFixed(2)
            };
        });

        return { success: true, data };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to generate tax report." };
    }
}
