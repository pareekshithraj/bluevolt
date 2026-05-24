import test from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, cleanupOrganization } from "./_db.mjs";

test("store settings persist correctly", async () => {
  const suffix = uniqueSuffix("store-settings");
  const organization = await prisma.organization.create({
    data: {
      name: `Org ${suffix}`,
      slug: `org-${suffix}`,
    },
  });

  try {
    const store = await prisma.store.create({
      data: {
        organization_id: organization.id,
        name: `Store ${suffix}`,
        slug: `store-${suffix}`,
        code: `CODE-${suffix}`,
      },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: {
        gstin: "29ABCDE1234F1Z5",
        address: "123 Retail Avenue",
        default_gst_percentage: 12,
        auto_print_receipt: false,
        include_gst_breakdown_on_receipt: true,
        enable_pos_dark_mode: true,
      },
    });

    const refreshed = await prisma.store.findUnique({
      where: { id: store.id },
      select: {
        gstin: true,
        address: true,
        default_gst_percentage: true,
        auto_print_receipt: true,
        include_gst_breakdown_on_receipt: true,
        enable_pos_dark_mode: true,
      },
    });

    assert.ok(refreshed);
    assert.equal(refreshed.gstin, "29ABCDE1234F1Z5");
    assert.equal(refreshed.address, "123 Retail Avenue");
    assert.equal(refreshed.default_gst_percentage, 12);
    assert.equal(refreshed.auto_print_receipt, false);
    assert.equal(refreshed.include_gst_breakdown_on_receipt, true);
    assert.equal(refreshed.enable_pos_dark_mode, true);
  } finally {
    await cleanupOrganization(organization.id);
  }
});
