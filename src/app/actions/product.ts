"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStores24Session } from "@/lib/stores24/server-context";
import { Prisma } from "@prisma/client";

export async function getProducts() {
    try {
        const session = await requireStores24Session();
        const products = await prisma.product.findMany({
            where: { store_id: Number(session.storeId) },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, products };
    } catch (error: unknown) {
        console.error("Failed to fetch products:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch products." };
    }
}

export async function createProduct(data: { name: string, barcode: string, price: number, gst_percentage: number, stock: number }) {
    try {
        const session = await requireStores24Session();
        const product = await prisma.product.create({
            data: {
                store_id: Number(session.storeId),
                name: data.name,
                barcode: data.barcode,
                price: data.price,
                gst_percentage: data.gst_percentage,
                stock: data.stock,
            }
        });
        revalidatePath("/stores24/products");
        return { success: true, product };
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: "A product with this barcode already exists." };
        }
        return { success: false, error: error instanceof Error ? error.message : "Failed to create product." };
    }
}

export async function deleteProduct(id: number) {
    try {
        const session = await requireStores24Session();
        const deleted = await prisma.product.deleteMany({
            where: {
                id,
                store_id: Number(session.storeId),
            }
        });
        if (deleted.count === 0) {
            return { success: false, error: "Product not found for this store." };
        }
        revalidatePath("/stores24/products");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete product." };
    }
}
