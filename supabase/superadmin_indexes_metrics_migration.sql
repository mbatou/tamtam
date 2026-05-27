-- Superadmin performance indexes + metrics view
-- Run this migration against your Supabase database

-- ============================================================
-- 1. INDEXES FOR HOT TABLES
-- ============================================================

-- campaigns — composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status_batteur
ON campaigns (status, batteur_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_at
ON campaigns (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
ON campaigns (status);

-- brand_leads — CRM page
CREATE INDEX IF NOT EXISTS idx_brand_leads_status
ON brand_leads (status);

CREATE INDEX IF NOT EXISTS idx_brand_leads_created_at
ON brand_leads (created_at DESC);

-- payouts — finances page
CREATE INDEX IF NOT EXISTS idx_payouts_echo_id
ON payouts (echo_id);

CREATE INDEX IF NOT EXISTS idx_payouts_status
ON payouts (status);

CREATE INDEX IF NOT EXISTS idx_payouts_created_at
ON payouts (created_at DESC);

-- blocked_ips — fraud detection
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip
ON blocked_ips (ip_address);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires
ON blocked_ips (expires_at)
WHERE expires_at IS NOT NULL;

-- streak_rewards
CREATE INDEX IF NOT EXISTS idx_streak_rewards_echo_id
ON streak_rewards (echo_id);

-- ============================================================
-- 2. SUPERADMIN METRICS VIEW
-- Single source of truth for all dashboard numbers
-- ============================================================

CREATE OR REPLACE VIEW superadmin_metrics AS
SELECT
  -- Brands
  (SELECT COUNT(*) FROM users
   WHERE role IN ('batteur', 'brand')
   AND deleted_at IS NULL) AS total_brands,
  (SELECT COUNT(*) FROM users
   WHERE role IN ('batteur', 'brand')
   AND deleted_at IS NULL
   AND created_at >= date_trunc('month', NOW())) AS new_brands_this_month,

  -- Échos
  (SELECT COUNT(*) FROM users
   WHERE role = 'echo'
   AND deleted_at IS NULL) AS total_echos,
  (SELECT COUNT(*) FROM users
   WHERE role = 'echo'
   AND deleted_at IS NULL
   AND created_at >= NOW() - INTERVAL '7 days') AS new_echos_this_week,

  -- Campaigns
  (SELECT COUNT(*) FROM campaigns
   WHERE status = 'active') AS active_campaigns,
  (SELECT COUNT(*) FROM campaigns) AS total_campaigns,

  -- Clicks
  (SELECT COUNT(*) FROM clicks
   WHERE is_valid = true) AS total_valid_clicks,
  (SELECT COUNT(*) FROM clicks
   WHERE is_valid = true
   AND created_at >= date_trunc('day', NOW())) AS clicks_today,
  (SELECT COUNT(*) FROM clicks
   WHERE is_valid = true
   AND created_at >= date_trunc('week', NOW())) AS clicks_this_week,

  -- Revenue / GMV
  (SELECT COALESCE(SUM(spent), 0) FROM campaigns) AS total_gmv_fcfa,
  (SELECT COALESCE(SUM(spent), 0) FROM campaigns
   WHERE created_at >= date_trunc('month', NOW())) AS gmv_this_month,

  -- Platform revenue (25% of GMV)
  (SELECT COALESCE(SUM(spent), 0) * 0.25 FROM campaigns) AS platform_revenue_fcfa,
  (SELECT COALESCE(SUM(spent), 0) * 0.25 FROM campaigns
   WHERE created_at >= date_trunc('month', NOW())) AS platform_revenue_this_month,

  -- Echo balances
  (SELECT COALESCE(SUM(available_balance), 0) FROM users
   WHERE role = 'echo' AND deleted_at IS NULL) AS total_echo_available,
  (SELECT COALESCE(SUM(pending_balance), 0) FROM users
   WHERE role = 'echo' AND deleted_at IS NULL) AS total_echo_pending,

  -- Pending payouts
  (SELECT COUNT(*) FROM payouts
   WHERE status = 'pending') AS pending_payouts,

  -- Timestamp
  NOW() AS computed_at;
