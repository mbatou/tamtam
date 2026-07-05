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

## Supabase CLI workflow (scaffolded — one-time setup required)

The durable fix for schema drift is to stop hand-writing types and snapshots.
The npm scripts are already wired; the one-time link must be done by someone
with a Supabase access token:

```bash
npx supabase@2 login                        # opens browser / takes an access token
npx supabase@2 link --project-ref <ref>     # ref = the id in your dashboard URL
```

After linking, the day-to-day commands are:

```bash
npm run db:pull    # captures the live schema as a migration baseline (supabase/migrations)
npm run db:types   # regenerates types/database.ts from the linked project
```

Commit the outputs of both. From then on:

- New schema changes go through `supabase migration new <name>` + `supabase db push`
  instead of pasting SQL into the dashboard.
- `types/database.ts` becomes the source of truth for row types; the hand-written
  interfaces in `lib/types.ts` and the `supabase/schema.sql` snapshot (plus its
  drift test) can be retired gradually as call sites migrate.
- Optional CI drift check: add `SUPABASE_ACCESS_TOKEN` and the project ref as
  GitHub Actions secrets, then a job can run `npm run db:types` and fail on a
  non-empty `git diff types/database.ts`.

Until the CLI is linked, keep the snapshot + drift test honest.
