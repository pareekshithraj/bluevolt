-- AlterTable
ALTER TABLE "EmployeeMeeting" ADD COLUMN IF NOT EXISTS "audienceUsers" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "EmployeeResource" ADD COLUMN IF NOT EXISTS "audienceUsers" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeMeeting_audienceUsers_idx" ON "EmployeeMeeting"("audienceUsers");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeResource_audienceUsers_idx" ON "EmployeeResource"("audienceUsers");
