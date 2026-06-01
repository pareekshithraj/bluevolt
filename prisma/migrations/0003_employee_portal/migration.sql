CREATE TABLE IF NOT EXISTS "EmployeeUser" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "department" TEXT NOT NULL DEFAULT 'General',
    "title" TEXT NOT NULL DEFAULT 'Team Member',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeCrmRecord" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "ownerRole" TEXT NOT NULL DEFAULT 'sales',
    "stage" TEXT NOT NULL DEFAULT 'New',
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "nextAction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCrmRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeApplicant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "roleApplied" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "meetUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeApplicant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeMeeting" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "meetUrl" TEXT,
    "audienceRoles" TEXT NOT NULL DEFAULT 'all',
    "applicantName" TEXT,
    "applicantEmail" TEXT,
    "notes" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMeeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeResource" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'Link',
    "url" TEXT NOT NULL,
    "description" TEXT,
    "audienceRoles" TEXT NOT NULL DEFAULT 'all',
    "tags" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeUser_email_key" ON "EmployeeUser"("email");
CREATE INDEX IF NOT EXISTS "EmployeeUser_role_idx" ON "EmployeeUser"("role");
CREATE INDEX IF NOT EXISTS "EmployeeUser_status_idx" ON "EmployeeUser"("status");
CREATE INDEX IF NOT EXISTS "EmployeeCrmRecord_ownerRole_idx" ON "EmployeeCrmRecord"("ownerRole");
CREATE INDEX IF NOT EXISTS "EmployeeCrmRecord_stage_idx" ON "EmployeeCrmRecord"("stage");
CREATE INDEX IF NOT EXISTS "EmployeeCrmRecord_createdAt_idx" ON "EmployeeCrmRecord"("createdAt");
CREATE INDEX IF NOT EXISTS "EmployeeApplicant_roleApplied_idx" ON "EmployeeApplicant"("roleApplied");
CREATE INDEX IF NOT EXISTS "EmployeeApplicant_stage_idx" ON "EmployeeApplicant"("stage");
CREATE INDEX IF NOT EXISTS "EmployeeMeeting_startsAt_idx" ON "EmployeeMeeting"("startsAt");
CREATE INDEX IF NOT EXISTS "EmployeeMeeting_audienceRoles_idx" ON "EmployeeMeeting"("audienceRoles");
CREATE INDEX IF NOT EXISTS "EmployeeResource_resourceType_idx" ON "EmployeeResource"("resourceType");
CREATE INDEX IF NOT EXISTS "EmployeeResource_audienceRoles_idx" ON "EmployeeResource"("audienceRoles");
CREATE INDEX IF NOT EXISTS "EmployeeResource_createdAt_idx" ON "EmployeeResource"("createdAt");
