import { cookies } from "next/headers";
import { getSessionCookieName, readSessionToken, type Stores24SessionPayload } from "@/lib/stores24/session";
import { prisma } from "@/lib/prisma";

export async function getStores24Session(): Promise<Stores24SessionPayload | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(getSessionCookieName())?.value);
}

export async function requireStores24Session(): Promise<Stores24SessionPayload> {
  const session = await getStores24Session();
  if (!session) {
    throw new Error("Authentication required.");
  }

  const assignment = await prisma.userStoreRole.findFirst({
    where: {
      user_id: Number(session.userId),
      organization_id: Number(session.organizationId),
      store_id: Number(session.storeId),
      active: true,
      user: { status: "Active" },
    },
    include: {
      store: true,
    },
  });

  if (!assignment) {
    throw new Error("Your store access is no longer active. Please sign in again.");
  }

  return {
    ...session,
    organizationId: assignment.organization_id.toString(),
    storeId: assignment.store_id.toString(),
    storeName: assignment.store.name,
    role: assignment.role,
  };
}
