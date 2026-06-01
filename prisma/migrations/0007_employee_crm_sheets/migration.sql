CREATE TABLE IF NOT EXISTS "EmployeeCrmSheet" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sourceName" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'Pasted sheet',
  "ownerRole" TEXT NOT NULL DEFAULT 'sales',
  "audienceRoles" TEXT NOT NULL DEFAULT 'sales',
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "locked" BOOLEAN NOT NULL DEFAULT true,
  "columns" JSONB,
  "requestedBy" INTEGER,
  "requestedByName" TEXT,
  "approvedBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmployeeCrmSheetRow" (
  "id" SERIAL PRIMARY KEY,
  "sheetId" INTEGER NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Open',
  "statusColor" TEXT NOT NULL DEFAULT 'none',
  "reason" TEXT,
  "notes" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" INTEGER,
  "updatedByName" TEXT,
  "doneAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeCrmSheetRow_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "EmployeeCrmSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_ownerRole_idx" ON "EmployeeCrmSheet"("ownerRole");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_audienceRoles_idx" ON "EmployeeCrmSheet"("audienceRoles");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_status_idx" ON "EmployeeCrmSheet"("status");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_requestedBy_idx" ON "EmployeeCrmSheet"("requestedBy");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheetRow_sheetId_rowNumber_idx" ON "EmployeeCrmSheetRow"("sheetId", "rowNumber");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheetRow_status_idx" ON "EmployeeCrmSheetRow"("status");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheetRow_updatedBy_idx" ON "EmployeeCrmSheetRow"("updatedBy");
