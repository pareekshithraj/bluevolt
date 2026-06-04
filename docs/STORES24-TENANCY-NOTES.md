# Stores24 Tenancy Notes

## What changed

Stores24 now uses multistore tenancy in Prisma:

- `Organization`
- `Store`
- `UserStoreRole`

Core business tables are now store-scoped:

- `Product`
- `Sales`
- `Supplier`
- `PurchaseOrder`
- `Customer`

Operational governance tables:

- `AuditLog` for store/workspace control-plane events

## Database state and migration path

The original cloud database was not previously managed by Prisma Migrate, so `prisma migrate dev` failed with:

- `The current database is not managed by Prisma Migrate.`

To move forward safely, schema sync was applied with:

```bash
npx prisma db push --accept-data-loss
```

A baseline migration was generated for future environments:

- `prisma/migrations/0001_baseline/migration.sql`

Generated with:

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script -o prisma/migrations/0001_baseline/migration.sql
```

## Recommended next step for deployment hygiene

Before using `prisma migrate deploy` in CI/CD, baseline this database by marking the baseline migration as applied:

```bash
npx prisma migrate resolve --applied 0001_baseline
```

Then future schema changes can be shipped with normal Prisma migrations.

## Bootstrap command

For fresh environments, run:

```bash
npm run seed:stores24
```

This creates or updates:

- one organization
- one store
- one admin user
- one user-store assignment
- starter product catalog (if store has no products yet)

The command reads optional `SEED_*` environment variables from `.env`.

## Admin controls now live in settings

The settings page now supports:

- creating stores inside the active organization
- switching active store
- assigning/removing organization users to/from the active store with role selection
- viewing recent audit events with scope toggle (`active store` vs `organization`)
- filtering audit events by action, actor, and date range
- persisting store profile and POS preference settings to the database
- preventing accidental last-admin removal from store/organization assignment workflows

Store create/switch and assignment changes are written to `AuditLog`.
