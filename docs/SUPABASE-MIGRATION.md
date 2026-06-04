# Supabase Migration

BlueVolt uses Prisma with PostgreSQL, so Supabase can run the same database schema.

## 1. Create the Supabase project

Create a Supabase project, then open:

`Project Settings -> Database -> Connection string`

Use the pooled/session connection string for the app. Keep `sslmode=require`.

Example shape:

```text
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

## 2. Set local environment

Create or update `.env`:

```text
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
AUTH_SECRET="<long-random-secret>"
EMPLOYEE_BOOTSTRAP_EMAIL="pareekshithraj@schools24.in"
EMPLOYEE_BOOTSTRAP_PASSWORD="<temporary-private-password>"
```

Do not reuse exposed passwords from GitHub history.

## 3. Apply the schema

For a new Supabase database:

```bash
npm run db:migrate
```

If Prisma reports that an old database was previously pushed outside Prisma Migrate, use the idempotent sync command:

```bash
npm run db:sync
```

## 4. Seed optional Stores24 demo data

```bash
npm run seed:stores24
```

## 5. Update Vercel

In Vercel project settings, replace the production `DATABASE_URL` with the Supabase connection string.

Keep these configured:

```text
AUTH_SECRET
EMPLOYEE_BOOTSTRAP_EMAIL
EMPLOYEE_BOOTSTRAP_PASSWORD
STUDIO_ADMIN_EMAIL
STUDIO_ADMIN_PASSWORD
```

Redeploy after changing environment variables.

## Notes

- Store uploaded PDFs, Excel sheets, PPTs, signatures, and ID-card images in object storage, not in Postgres rows.
- The free Supabase database limit is tight for heavy CRM sheet history. Upgrade before large imports or long-term production use.
- Rotate the old Neon password and the exposed company email password; removing the code does not remove secrets from Git history.
