-- Bring deployed databases up to the current Prisma schema.
-- These statements are intentionally idempotent because the original cloud database
-- has previously been synchronized with `prisma db push`.

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "default_gst_percentage" DOUBLE PRECISION NOT NULL DEFAULT 5;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "auto_print_receipt" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "include_gst_breakdown_on_receipt" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "enable_pos_dark_mode" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "store_id" INTEGER,
    "actor_user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_organization_id_fkey'
    ) THEN
        ALTER TABLE "AuditLog"
        ADD CONSTRAINT "AuditLog_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_store_id_fkey'
    ) THEN
        ALTER TABLE "AuditLog"
        ADD CONSTRAINT "AuditLog_store_id_fkey"
        FOREIGN KEY ("store_id") REFERENCES "Store"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_actor_user_id_fkey'
    ) THEN
        ALTER TABLE "AuditLog"
        ADD CONSTRAINT "AuditLog_actor_user_id_fkey"
        FOREIGN KEY ("actor_user_id") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AuditLog_organization_id_createdAt_idx" ON "AuditLog"("organization_id", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_store_id_createdAt_idx" ON "AuditLog"("store_id", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actor_user_id_createdAt_idx" ON "AuditLog"("actor_user_id", "createdAt");

CREATE TABLE IF NOT EXISTS "StudioProject" (
    "id" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "latency" TEXT NOT NULL DEFAULT '4.5ms',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);
