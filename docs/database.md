# Database workflow

The schema of record lives in the Supabase project. The repo tracks:

- **`types/database.ts`** — GENERATED types from the live schema (source of
  truth for row shapes). Refresh after any schema change: `npm run db:types`,
  then commit. The project is CLI-linked (done 2026-07-05).
- **`supabase/migrations/*.sql`** — incremental changes, currently run by
  hand in the SQL editor (dashboard → SQL → paste → run).
- **`supabase/schema.sql`** — human-readable reference snapshot (superseded
  by the generated types for correctness; kept as documentation).

## Guard rails

1. **`types/type-sync.ts` (compile-time, strongest)** — binds every
   hand-written row interface in `lib/types.ts` to the generated types.
   `npm run typecheck` fails naming the exact column if a type references a
   column that doesn't exist. After a schema change, `npm run db:types` +
   commit; the compiler then tells you what code needs updating.
2. `__tests__/schema-drift.test.ts` (runtime, legacy) — same idea against
   the schema.sql snapshot; kept as belt-and-suspenders while the snapshot
   exists.

When the compile check fails: you typo'd a field in `lib/types.ts` (fix the
type) or the database changed (run `npm run db:types`, commit, then fix any
code the compiler flags).

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
