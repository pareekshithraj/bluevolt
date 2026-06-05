# BlueVolt Security Hardening

## Immediate Actions

1. Rotate the exposed company email password and do not reuse the old value.
2. Rotate the Supabase database password, then update `DATABASE_URL` and `DIRECT_URL` in Vercel.
3. Rotate any employee bootstrap/admin passwords stored in Vercel environment variables.
4. Run `supabase/rls-hardening.sql` against the Supabase database after confirming the production app is using server-side Prisma.

## Git History

The exposed password appears in older commits. After rotating it, remove it from Git history with a history rewrite tool such as `git filter-repo` or BFG, then force-push only after every collaborator knows the branch history will change.

## RLS Notes

BlueVolt currently uses Prisma on the server, not Supabase Auth from the browser. The hardening SQL enables RLS and revokes `anon` / `authenticated` table access so Supabase Data API clients cannot read employee, CRM, payroll, document, or attendance records directly.

