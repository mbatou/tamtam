-- Migration: LUP-113 Lead Generation Campaign Objective
-- Adds landing_pages, leads, ai_generation_cache, ai_usage tables.
-- Extends campaigns with lead generation columns.
-- Creates debit_campaign_for_lead RPC for atomic CPL debit.
-- Rollback: supabase/lead_generation_rollback.sql

-- =====================================================================
-- 1. Extend campaigns table
-- =====================================================================

-- 1a. Update objective CHECK constraint to include 'lead_generation'
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_objective_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_objective_check
  CHECK (objective IN ('awareness', 'traffic', 'lead_generation'));

-- 1b. Add lead generation columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_per_lead_fcfa INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS leads_captured_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS setup_fee_amount_fcfa INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS low_conversion_flagged BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =====================================================================
-- 2. Create ai_generation_cache table
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_generation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input_hash TEXT UNIQUE NOT NULL,
  result JSONB NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_generation_cache ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. Create ai_usage table (cost tracking per brand per month)
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES users(id) NOT NULL,
  month TEXT NOT NULL,  -- format: YYYY-MM
  total_cost_usd NUMERIC(10,6) DEFAULT 0,
  call_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, month)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. Create landing_pages table
-- =====================================================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL UNIQUE,
  batteur_id UUID REFERENCES users(id) NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  subheadline TEXT,
  description TEXT,
  cta_text TEXT NOT NULL,
  brand_color TEXT NOT NULL,
  brand_accent_color TEXT,
  logo_url TEXT,
  form_fields JSONB NOT NULL DEFAULT '[]',
  notification_phone TEXT,
  notification_email TEXT,
  ai_generation_id UUID REFERENCES ai_generation_cache(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- Add FK from campaigns to landing_pages (nullable, set after creation)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS landing_page_id UUID
  REFERENCES landing_pages(id);

-- =====================================================================
-- 5. Create leads table
-- =====================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id UUID REFERENCES landing_pages(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  tracked_link_id UUID REFERENCES tracked_links(id),
  echo_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  custom_fields JSONB,
  ip_address TEXT,
  user_agent TEXT,
  consent_given BOOLEAN NOT NULL,
  fraud_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected', 'flagged')),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  payout_amount INTEGER,
  payout_status TEXT
    CHECK (payout_status IS NULL OR payout_status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. Indexes
-- =====================================================================

-- Landing pages
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_campaign ON landing_pages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_batteur ON landing_pages(batteur_id);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_landing_page ON leads(landing_page_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_phone_dedup ON leads(phone, landing_page_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_echo ON leads(echo_id);
CREATE INDEX IF NOT EXISTS idx_leads_ip_created ON leads(ip_address, created_at);

-- AI cache
CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_generation_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_ai_usage_brand_month ON ai_usage(brand_id, month);

-- =====================================================================
-- 7. RPC: Atomic lead debit (mirrors increment_click pattern)
-- =====================================================================

CREATE OR REPLACE FUNCTION increment_ai_usage_count(
  p_brand_id UUID,
  p_month TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE ai_usage
    SET call_count = call_count + 1
    WHERE brand_id = p_brand_id
      AND month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 8. RPC: Atomic lead debit (mirrors increment_click pattern)
-- =====================================================================

CREATE OR REPLACE FUNCTION debit_campaign_for_lead(
  p_campaign_id UUID,
  p_cpl INTEGER,
  p_echo_id UUID,
  p_echo_earnings INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Atomically debit CPL from campaign budget (only if budget allows)
  UPDATE campaigns
    SET spent = spent + p_cpl,
        leads_captured_count = leads_captured_count + 1
    WHERE id = p_campaign_id
      AND status = 'active'
      AND spent + p_cpl <= budget;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Budget exhausted — do NOT pay the echo, do NOT count the lead
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  -- Budget sufficient — credit the echo
  UPDATE users
    SET balance = balance + p_echo_earnings,
        total_earned = total_earned + p_echo_earnings
    WHERE id = p_echo_id;

  -- Auto-complete campaign when budget is fully spent
  UPDATE campaigns
    SET status = 'completed'
    WHERE id = p_campaign_id
      AND spent >= budget;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
