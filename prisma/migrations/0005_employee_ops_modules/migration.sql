ALTER TABLE "EmployeeUser" ADD COLUMN IF NOT EXISTS "compensationStatus" TEXT NOT NULL DEFAULT 'Paid';
CREATE INDEX IF NOT EXISTS "EmployeeUser_compensationStatus_idx" ON "EmployeeUser"("compensationStatus");

ALTER TABLE "EmployeeCrmRecord" ADD COLUMN IF NOT EXISTS "leadRating" TEXT NOT NULL DEFAULT 'Warm';
ALTER TABLE "EmployeeCrmRecord" ADD COLUMN IF NOT EXISTS "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "EmployeeCrmRecord" ADD COLUMN IF NOT EXISTS "reminderAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "EmployeeCrmRecord_reminderAt_idx" ON "EmployeeCrmRecord"("reminderAt");

CREATE TABLE IF NOT EXISTS "EmployeeAttendance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "loginAt" TIMESTAMP(3),
    "logoutAt" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeLeaveRequest" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'Casual',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "reviewedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeLeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeTask" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "assignedTo" INTEGER,
    "assignedName" TEXT,
    "ownerRole" TEXT NOT NULL DEFAULT 'all',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "dueAt" TIMESTAMP(3),
    "proofUrl" TEXT,
    "description" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeePayrollInput" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "payType" TEXT NOT NULL DEFAULT 'Salary',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unpaidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeePayrollInput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeePerformanceReview" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "reviewPeriod" TEXT NOT NULL,
    "reviewerId" INTEGER,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kpiSummary" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeePerformanceReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeDocument" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "employeeName" TEXT,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'General',
    "url" TEXT NOT NULL,
    "visibilityRoles" TEXT NOT NULL DEFAULT 'super_admin,admin,hr',
    "notes" TEXT,
    "uploadedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeAnnouncement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audienceRoles" TEXT NOT NULL DEFAULT 'all',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "publishedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeComment" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" INTEGER,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployeeAttendance_employeeId_idx" ON "EmployeeAttendance"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeAttendance_workDate_idx" ON "EmployeeAttendance"("workDate");
CREATE INDEX IF NOT EXISTS "EmployeeAttendance_status_idx" ON "EmployeeAttendance"("status");
CREATE INDEX IF NOT EXISTS "EmployeeLeaveRequest_employeeId_idx" ON "EmployeeLeaveRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeLeaveRequest_status_idx" ON "EmployeeLeaveRequest"("status");
CREATE INDEX IF NOT EXISTS "EmployeeLeaveRequest_startsAt_idx" ON "EmployeeLeaveRequest"("startsAt");
CREATE INDEX IF NOT EXISTS "EmployeeTask_assignedTo_idx" ON "EmployeeTask"("assignedTo");
CREATE INDEX IF NOT EXISTS "EmployeeTask_ownerRole_idx" ON "EmployeeTask"("ownerRole");
CREATE INDEX IF NOT EXISTS "EmployeeTask_status_idx" ON "EmployeeTask"("status");
CREATE INDEX IF NOT EXISTS "EmployeeTask_dueAt_idx" ON "EmployeeTask"("dueAt");
CREATE INDEX IF NOT EXISTS "EmployeePayrollInput_employeeId_idx" ON "EmployeePayrollInput"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeePayrollInput_payPeriod_idx" ON "EmployeePayrollInput"("payPeriod");
CREATE INDEX IF NOT EXISTS "EmployeePayrollInput_status_idx" ON "EmployeePayrollInput"("status");
CREATE INDEX IF NOT EXISTS "EmployeePerformanceReview_employeeId_idx" ON "EmployeePerformanceReview"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeePerformanceReview_reviewPeriod_idx" ON "EmployeePerformanceReview"("reviewPeriod");
CREATE INDEX IF NOT EXISTS "EmployeePerformanceReview_status_idx" ON "EmployeePerformanceReview"("status");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_documentType_idx" ON "EmployeeDocument"("documentType");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_visibilityRoles_idx" ON "EmployeeDocument"("visibilityRoles");
CREATE INDEX IF NOT EXISTS "EmployeeAnnouncement_audienceRoles_idx" ON "EmployeeAnnouncement"("audienceRoles");
CREATE INDEX IF NOT EXISTS "EmployeeAnnouncement_priority_idx" ON "EmployeeAnnouncement"("priority");
CREATE INDEX IF NOT EXISTS "EmployeeAnnouncement_createdAt_idx" ON "EmployeeAnnouncement"("createdAt");
CREATE INDEX IF NOT EXISTS "EmployeeComment_entityType_entityId_idx" ON "EmployeeComment"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "EmployeeComment_authorId_idx" ON "EmployeeComment"("authorId");
