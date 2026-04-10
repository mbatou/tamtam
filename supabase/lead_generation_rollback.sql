-- Rollback: LUP-113 Lead Generation Campaign Objective
-- Run this to safely remove all lead generation tables and columns.
-- Safe: uses IF EXISTS / DROP IF EXISTS throughout.
-- Order: drop dependents first, then parent tables, then columns.

-- =====================================================================
-- 1. Drop RPC functions
-- =====================================================================
DROP FUNCTION IF EXISTS debit_campaign_for_lead(uuid, integer, uuid, integer);

-- =====================================================================
-- 2. Drop indexes (before tables, in case of partial index deps)
-- =====================================================================
DROP INDEX IF EXISTS idx_leads_landing_page;
DROP INDEX IF EXISTS idx_leads_phone_dedup;
DROP INDEX IF EXISTS idx_leads_campaign;
DROP INDEX IF EXISTS idx_leads_echo;
DROP INDEX IF EXISTS idx_leads_ip_created;
DROP INDEX IF EXISTS idx_landing_pages_slug;
DROP INDEX IF EXISTS idx_landing_pages_campaign;
DROP INDEX IF EXISTS idx_landing_pages_batteur;
DROP INDEX IF EXISTS idx_ai_cache_hash;
DROP INDEX IF EXISTS idx_ai_usage_brand_month;

-- =====================================================================
-- 3. Drop tables (order: leads depends on landing_pages, landing_pages depends on campaigns)
-- =====================================================================
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS landing_pages;
DROP TABLE IF EXISTS ai_usage;
DROP TABLE IF EXISTS ai_generation_cache;

-- =====================================================================
-- 4. Remove columns added to campaigns
-- =====================================================================
ALTER TABLE campaigns DROP COLUMN IF EXISTS cost_per_lead_fcfa;
ALTER TABLE campaigns DROP COLUMN IF EXISTS leads_captured_count;
ALTER TABLE campaigns DROP COLUMN IF EXISTS setup_fee_paid;
ALTER TABLE campaigns DROP COLUMN IF EXISTS setup_fee_amount_fcfa;
ALTER TABLE campaigns DROP COLUMN IF EXISTS landing_page_id;
ALTER TABLE campaigns DROP COLUMN IF EXISTS low_conversion_flagged;

-- =====================================================================
-- 5. Restore original objective CHECK constraint
--    Drop the new constraint and recreate the old one.
-- =====================================================================
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_objective_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_objective_check
  CHECK (objective IN ('awareness', 'traffic'));

-- =====================================================================
-- NOTE: wallet_transactions.type has no DB CHECK constraint,
-- so no rollback needed there (TypeScript union is the only guard).
-- =====================================================================
