ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "departmentId" INTEGER;
ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "managerId" INTEGER;
CREATE INDEX IF NOT EXISTS "EmployeeUser_departmentId_idx" ON "EmployeeUser"("departmentId");
CREATE INDEX IF NOT EXISTS "EmployeeUser_managerId_idx" ON "EmployeeUser"("managerId");

ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;

CREATE TABLE IF NOT EXISTS "EmployeeDepartment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" INTEGER,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeNotification" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "targetRoles" TEXT NOT NULL DEFAULT 'all',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeExpenseClaim" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claimDate" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reviewerId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeExpenseClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeAuditEvent" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeDepartment_name_key" ON "EmployeeDepartment"("name");
CREATE INDEX IF NOT EXISTS "EmployeeDepartment_active_idx" ON "EmployeeDepartment"("active");
CREATE INDEX IF NOT EXISTS "EmployeeDepartment_managerId_idx" ON "EmployeeDepartment"("managerId");
CREATE INDEX IF NOT EXISTS "EmployeeNotification_employeeId_idx" ON "EmployeeNotification"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeNotification_targetRoles_idx" ON "EmployeeNotification"("targetRoles");
CREATE INDEX IF NOT EXISTS "EmployeeNotification_readAt_idx" ON "EmployeeNotification"("readAt");
CREATE INDEX IF NOT EXISTS "EmployeeExpenseClaim_employeeId_idx" ON "EmployeeExpenseClaim"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeExpenseClaim_status_idx" ON "EmployeeExpenseClaim"("status");
CREATE INDEX IF NOT EXISTS "EmployeeExpenseClaim_claimDate_idx" ON "EmployeeExpenseClaim"("claimDate");
CREATE INDEX IF NOT EXISTS "EmployeeAuditEvent_actorId_idx" ON "EmployeeAuditEvent"("actorId");
CREATE INDEX IF NOT EXISTS "EmployeeAuditEvent_entityType_entityId_idx" ON "EmployeeAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "EmployeeAuditEvent_createdAt_idx" ON "EmployeeAuditEvent"("createdAt");
