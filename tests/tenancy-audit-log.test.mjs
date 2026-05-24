import test from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, cleanupOrganization } from "./_db.mjs";

test("audit log supports scope and action filtering", async () => {
  const suffix = uniqueSuffix("audit");
  const organization = await prisma.organization.create({
    data: {
      name: `Org ${suffix}`,
      slug: `org-${suffix}`,
    },
  });

  try {
    const storeA = await prisma.store.create({
      data: {
        organization_id: organization.id,
        name: `Store A ${suffix}`,
        slug: `store-a-${suffix}`,
        code: `CODE-A-${suffix}`,
      },
    });

    const storeB = await prisma.store.create({
      data: {
        organization_id: organization.id,
        name: `Store B ${suffix}`,
        slug: `store-b-${suffix}`,
        code: `CODE-B-${suffix}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: `User ${suffix}`,
        username: `user-${suffix}@example.com`,
        role: "Administrator",
        password: "scrypt:test:test",
        status: "Active",
      },
    });

    await prisma.auditLog.createMany({
      data: [
        {
          organization_id: organization.id,
          store_id: storeA.id,
          actor_user_id: user.id,
          action: "store.switch",
          entity_type: "store",
          entity_id: String(storeA.id),
        },
        {
          organization_id: organization.id,
          store_id: storeB.id,
          actor_user_id: user.id,
          action: "store.settings.update",
          entity_type: "store",
          entity_id: String(storeB.id),
        },
      ],
    });

    const storeScoped = await prisma.auditLog.findMany({
      where: {
        organization_id: organization.id,
        store_id: storeA.id,
      },
    });
    assert.equal(storeScoped.length, 1);
    assert.equal(storeScoped[0].action, "store.switch");

    const filteredByAction = await prisma.auditLog.findMany({
      where: {
        organization_id: organization.id,
        action: {
          contains: "settings",
          mode: "insensitive",
        },
      },
    });
    assert.equal(filteredByAction.length, 1);
    assert.equal(filteredByAction[0].store_id, storeB.id);
  } finally {
    await cleanupOrganization(organization.id);
  }
});
