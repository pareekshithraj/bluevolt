ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "employeeType" TEXT NOT NULL DEFAULT 'Full-time';
ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "employmentStart" TIMESTAMP(3);
ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "employmentEnd" TIMESTAMP(3);
ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "workStartTime" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "workEndTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "EmployeeUser_employeeType_idx" ON "EmployeeUser"("employeeType");
CREATE INDEX IF NOT EXISTS "EmployeeUser_lastSeenAt_idx" ON "EmployeeUser"("lastSeenAt");
