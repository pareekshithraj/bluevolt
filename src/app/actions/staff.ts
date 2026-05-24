"use server";
import { prisma } from "@/lib/prisma";
import { requireStores24Session } from "@/lib/stores24/server-context";
import { hashPassword } from "@/lib/stores24/password";

export async function getStaff() {
    try {
        const session = await requireStores24Session();
        const staff = await prisma.userStoreRole.findMany({
            where: {
                store_id: Number(session.storeId),
                active: true,
            },
            include: {
                user: true,
            },
            orderBy: { user: { name: 'asc' } }
        });
        return {
            success: true,
            staff: staff.map((entry) => ({
                id: entry.user.id,
                name: entry.user.name,
                username: entry.user.username,
                role: entry.role,
                status: entry.user.status,
            })),
        };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch staff." };
    }
}

export async function createStaff(data: { name: string, username: string, role: string, password: string }) {
    try {
        const session = await requireStores24Session();
        const staff = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: data.name,
                    username: data.username,
                    role: data.role,
                    password: hashPassword(data.password),
                }
            });

            await tx.userStoreRole.create({
                data: {
                    user_id: user.id,
                    organization_id: Number(session.organizationId),
                    store_id: Number(session.storeId),
                    role: data.role,
                }
            });

            return user;
        });
        return { success: true, staff };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to create staff." };
    }
}
