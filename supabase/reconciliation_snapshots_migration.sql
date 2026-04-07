-- =====================================================
-- LUP-112: Reconciliation snapshots, issues, auto-heals, financial snapshots
-- Run this in Supabase SQL Editor
-- =====================================================

-- ---------------------------------------------------------------------------
-- 1. Reconciliation snapshots — periodic cache of reconciliation results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  brand_balance_total BIGINT NOT NULL,
  echo_balance_total BIGINT NOT NULL,
  platform_liabilities_total BIGINT NOT NULL,

  wave_checkouts_total BIGINT NOT NULL,
  wave_checkouts_count INTEGER NOT NULL,
  wave_payouts_total BIGINT NOT NULL,
  wave_payouts_count INTEGER NOT NULL,
  wave_fees_total BIGINT NOT NULL,
  wave_wallet_expected BIGINT NOT NULL,

  total_discrepancy BIGINT NOT NULL DEFAULT 0,
  critical_issues_count INTEGER NOT NULL DEFAULT 0,
  warning_issues_count INTEGER NOT NULL DEFAULT 0,
  info_issues_count INTEGER NOT NULL DEFAULT 0,

  compute_duration_ms INTEGER,
  scan_type TEXT NOT NULL DEFAULT 'full'
);

CREATE INDEX IF NOT EXISTS idx_recon_snapshots_computed ON reconciliation_snapshots(computed_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Reconciliation issues — individual problems found
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES reconciliation_snapshots(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  category TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  description TEXT NOT NULL,
  expected_value BIGINT,
  actual_value BIGINT,
  discrepancy BIGINT,
  suggested_action TEXT,
  auto_healable BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_issues_severity ON reconciliation_issues(severity);
CREATE INDEX IF NOT EXISTS idx_recon_issues_resolved ON reconciliation_issues(resolved);
CREATE INDEX IF NOT EXISTS idx_recon_issues_category ON reconciliation_issues(category);
CREATE INDEX IF NOT EXISTS idx_recon_issues_unresolved ON reconciliation_issues(severity, resolved) WHERE resolved = FALSE;

-- ---------------------------------------------------------------------------
-- 3. Auto-heal log — audit trail for automatic fixes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_auto_heals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES reconciliation_issues(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  before_state JSONB,
  after_state JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_autoheals_created ON reconciliation_auto_heals(created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Daily financial snapshots (P&L)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,

  gross_revenue BIGINT NOT NULL DEFAULT 0,
  tamtam_commission BIGINT NOT NULL DEFAULT 0,
  ambassador_commissions BIGINT NOT NULL DEFAULT 0,
  net_revenue BIGINT NOT NULL DEFAULT 0,

  echo_payouts BIGINT NOT NULL DEFAULT 0,
  wave_checkout_fees BIGINT NOT NULL DEFAULT 0,
  wave_payout_fees BIGINT NOT NULL DEFAULT 0,
  welcome_bonuses BIGINT NOT NULL DEFAULT 0,
  challenge_rewards BIGINT NOT NULL DEFAULT 0,

  clicks_verified INTEGER NOT NULL DEFAULT 0,
  clicks_invalid INTEGER NOT NULL DEFAULT 0,
  brands_active INTEGER NOT NULL DEFAULT 0,
  echos_active INTEGER NOT NULL DEFAULT 0,
  new_brands INTEGER NOT NULL DEFAULT 0,
  new_echos INTEGER NOT NULL DEFAULT 0,

  gross_margin BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_snapshots_date ON financial_snapshots(snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- 5. Alert dedup tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE reconciliation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_auto_heals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_alerts_sent ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SQL Helper Functions (adapted to actual schema)
-- =====================================================

CREATE OR REPLACE FUNCTION sum_brand_balances() RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(balance), 0)::BIGINT
  FROM users
  WHERE role = 'batteur'
  AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION sum_echo_balances() RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(balance), 0)::BIGINT
  FROM users
  WHERE role = 'echo'
  AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Find users where balance != sum(wallet_transactions.amount)
CREATE OR REPLACE FUNCTION find_user_balance_mismatches()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  role TEXT,
  actual_balance BIGINT,
  expected_balance BIGINT,
  transaction_count BIGINT
) AS $$
  SELECT
    u.id,
    u.name,
    u.role,
    COALESCE(u.balance, 0)::BIGINT AS actual_balance,
    COALESCE(SUM(wt.amount), 0)::BIGINT AS expected_balance,
    COUNT(wt.id) AS transaction_count
  FROM users u
  LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
  WHERE u.deleted_at IS NULL
  GROUP BY u.id, u.name, u.role, u.balance
  HAVING COALESCE(u.balance, 0) != COALESCE(SUM(wt.amount), 0);
$$ LANGUAGE sql STABLE;

-- Find wave_checkouts completed but no wallet_transaction logged
CREATE OR REPLACE FUNCTION find_orphan_checkout_credits()
RETURNS TABLE (
  checkout_id UUID,
  user_id UUID,
  amount INTEGER,
  completed_at TIMESTAMPTZ
) AS $$
  SELECT
    wc.id,
    wc.user_id,
    wc.amount,
    wc.completed_at
  FROM wave_checkouts wc
  WHERE wc.checkout_status = 'complete'
  AND wc.completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.source_type = 'wave_checkout'
    AND wt.user_id = wc.user_id
    AND wt.amount = wc.amount
  );
$$ LANGUAGE sql STABLE;

-- Find failed wave_payouts where the echo was debited but never refunded
CREATE OR REPLACE FUNCTION find_failed_payouts_without_refund()
RETURNS TABLE (
  payout_id UUID,
  user_id UUID,
  amount INTEGER,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    wp.id,
    wp.user_id,
    wp.amount,
    wp.created_at
  FROM wave_payouts wp
  WHERE wp.payout_status = 'failed'
  AND EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.source_type = 'wave_payout'
    AND wt.user_id = wp.user_id
    AND wt.amount < 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.source_type = 'wave_payout'
    AND wt.user_id = wp.user_id
    AND wt.type = 'withdrawal_refund'
  );
$$ LANGUAGE sql STABLE;

-- Find campaigns where spent != clicks * cpc
CREATE OR REPLACE FUNCTION find_campaign_accounting_mismatches()
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  campaign_spent INTEGER,
  computed_spent BIGINT,
  clicks_count BIGINT
) AS $$
  SELECT
    c.id,
    c.title,
    COALESCE(c.spent, 0),
    COALESCE((COUNT(cl.id) * c.cpc)::BIGINT, 0),
    COUNT(cl.id)
  FROM campaigns c
  LEFT JOIN tracked_links tl ON tl.campaign_id = c.id
  LEFT JOIN clicks cl ON cl.link_id = tl.id AND cl.is_valid = true
  WHERE c.status != 'draft'
  GROUP BY c.id, c.title, c.spent, c.cpc
  HAVING COALESCE(c.spent, 0) != COALESCE(COUNT(cl.id) * c.cpc, 0);
$$ LANGUAGE sql STABLE;

-- Find completed campaigns without refund for remaining budget
CREATE OR REPLACE FUNCTION find_completed_campaigns_without_refund()
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  budget INTEGER,
  spent INTEGER,
  remaining INTEGER
) AS $$
  SELECT
    c.id,
    c.title,
    c.budget,
    COALESCE(c.spent, 0),
    (c.budget - COALESCE(c.spent, 0))
  FROM campaigns c
  WHERE c.status = 'completed'
  AND (c.budget - COALESCE(c.spent, 0)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.source_id = c.id::TEXT
    AND wt.type = 'campaign_budget_refund'
  );
$$ LANGUAGE sql STABLE;
