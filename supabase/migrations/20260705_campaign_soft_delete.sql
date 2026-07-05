-- Campaign soft-delete column.
--
-- app/api/campaigns/route.ts DELETE has always attempted
--   UPDATE campaigns SET deleted_at = now(), status = 'completed'
-- and silently fallen back to a status-only update because this column was
-- never created in production. Result: deleted campaigns are currently
-- indistinguishable from naturally completed ones.
--
-- After running this, refresh supabase/schema.sql and remove the
-- PENDING_MIGRATION_COLUMNS entry in __tests__/schema-drift.test.ts.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
