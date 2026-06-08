ALTER TABLE "EmployeeCrmSheet"
ADD COLUMN IF NOT EXISTS "editorRoles" TEXT NOT NULL DEFAULT 'sales';

ALTER TABLE "EmployeeCrmSheet"
ADD COLUMN IF NOT EXISTS "editorUsers" TEXT NOT NULL DEFAULT '';

UPDATE "EmployeeCrmSheet"
SET "editorRoles" = COALESCE(NULLIF("ownerRole", ''), 'sales')
WHERE "editorRoles" = 'sales' AND COALESCE(NULLIF("ownerRole", ''), '') <> '';

CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_editorRoles_idx" ON "EmployeeCrmSheet"("editorRoles");
CREATE INDEX IF NOT EXISTS "EmployeeCrmSheet_editorUsers_idx" ON "EmployeeCrmSheet"("editorUsers");
