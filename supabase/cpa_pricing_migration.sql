-- CPA (Cost Per Action) Pricing Model Migration
-- Adds CPA as an alternative pricing model to CPC for campaigns

-- 1. Add pricing model columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'cpc'
    CHECK (pricing_model IN ('cpc', 'cpa')),
  ADD COLUMN IF NOT EXISTS cpa_amount integer DEFAULT NULL
    CHECK (cpa_amount IS NULL OR cpa_amount >= 500),
  ADD COLUMN IF NOT EXISTS cpa_event text DEFAULT NULL
    CHECK (cpa_event IS NULL OR cpa_event ~ '^[a-z_]+$');

-- 2. Add payment tracking columns to conversions
ALTER TABLE conversions
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS payment_amount integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS echo_earning integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz DEFAULT NULL;

-- 3. Enforce: CPA campaigns must have cpa_amount and cpa_event
-- (application-level validation handles this, but add a comment for clarity)
COMMENT ON COLUMN campaigns.pricing_model IS 'cpc = pay per click, cpa = pay per conversion action';
COMMENT ON COLUMN campaigns.cpa_amount IS 'Cost per action in FCFA (min 150). Only for pricing_model=cpa';
COMMENT ON COLUMN campaigns.cpa_event IS 'Which conversion event triggers payment (e.g. purchase, signup). Only for pricing_model=cpa';
COMMENT ON COLUMN conversions.payment_status IS 'CPA payment status: none=not CPA, pending=awaiting, paid=echo credited, failed=error';

-- 4. Index for efficient CPA conversion lookups
CREATE INDEX IF NOT EXISTS idx_conversions_payment_status ON conversions (payment_status) WHERE payment_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_campaigns_pricing_model ON campaigns (pricing_model) WHERE pricing_model = 'cpa';

-- 5. RPC: process_cpa_conversion — atomically debit campaign + credit echo
CREATE OR REPLACE FUNCTION process_cpa_conversion(
  p_conversion_id uuid,
  p_campaign_id uuid,
  p_echo_id uuid,
  p_cpa_amount integer,
  p_echo_earning integer
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining integer;
  v_campaign_status text;
BEGIN
  -- Lock the campaign row
  SELECT budget - COALESCE(spent, 0), status
  INTO v_remaining, v_campaign_status
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  -- Campaign must be active and have enough budget
  IF v_campaign_status != 'active' OR v_remaining < p_cpa_amount THEN
    -- Mark conversion as failed
    UPDATE conversions
    SET payment_status = 'failed'
    WHERE id = p_conversion_id;
    RETURN false;
  END IF;

  -- Debit campaign spent
  UPDATE campaigns
  SET spent = COALESCE(spent, 0) + p_cpa_amount
  WHERE id = p_campaign_id;

  -- Credit echo pending_balance
  UPDATE users
  SET pending_balance = COALESCE(pending_balance, 0) + p_echo_earning,
      total_earned = COALESCE(total_earned, 0) + p_echo_earning
  WHERE id = p_echo_id;

  -- Mark conversion as paid
  UPDATE conversions
  SET payment_status = 'paid',
      payment_amount = p_cpa_amount,
      echo_earning = p_echo_earning,
      paid_at = now()
  WHERE id = p_conversion_id;

  RETURN true;
END;
$$;
