# Database workflow

The schema of record lives in the Supabase project (managed via the dashboard).
The repo tracks two things:

- **`supabase/schema.sql`** — a reference snapshot of the production schema
  ("for context only, not runnable"). Refresh it after any schema change:
  Supabase dashboard → Database → Schema Visualizer/SQL, or `supabase db dump --schema public`.
- **`supabase/migrations/*.sql`** — incremental changes to apply. These are
  currently run by hand in the SQL editor (dashboard → SQL → paste → run).

## Guard rails

`__tests__/schema-drift.test.ts` (runs in CI) parses `supabase/schema.sql` and
asserts that every property of the hand-written row types in `lib/types.ts`
is a real column. When it fails:

- You typo'd or renamed a field in `lib/types.ts` → fix the type.
- You changed the database → refresh `supabase/schema.sql`.
- You added a migration that isn't applied to prod yet → add the column to
  `PENDING_MIGRATION_COLUMNS` in the test, and remove it after applying the
  migration and refreshing the snapshot.

## Pending migrations checklist

| Migration | Status |
|---|---|
| `20260704_webhook_hardening.sql` | No-op on prod (unique constraint already exists) — safe to skip |
| `20260705_wallet_atomics.sql` | Applied 2026-07-05 |
| `20260705_campaign_soft_delete.sql` | Applied 2026-07-05 |

## Recommended upgrade: Supabase CLI workflow

The durable fix for schema drift is to stop hand-writing types and snapshots:

```bash
npm i -D supabase
npx supabase login                 # needs a Supabase access token
npx supabase link --project-ref <your-project-ref>
npx supabase db pull               # captures the live schema as a migration baseline
npx supabase gen types typescript --linked > types/database.ts
```

After that, new schema changes go through `supabase migration new` + `db push`,
`types/database.ts` is regenerated in CI, and `supabase/schema.sql` +
`lib/types.ts` row types can be retired gradually. Until the CLI is linked,
keep the snapshot + drift test honest.
