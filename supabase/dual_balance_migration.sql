-- ============================================================================
-- DUAL BALANCE SYSTEM MIGRATION
-- Splits echo balance into available_balance + pending_balance
-- Pending earnings unlock after a configurable delay per campaign
-- ============================================================================

-- ============================================================================
-- 1. ADD DUAL BALANCE COLUMNS TO USERS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS available_balance integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_balance integer DEFAULT 0;

-- ============================================================================
-- 2. MIGRATE EXISTING BALANCES TO AVAILABLE (NEVER lock existing money)
-- ============================================================================

UPDATE users
SET available_balance = COALESCE(balance, 0),
    pending_balance = 0
WHERE role = 'echo';

-- ============================================================================
-- 3. CREATE PENDING_EARNINGS TABLE
-- Tracks per-campaign pending amounts with unlock dates
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  echo_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  campaign_name TEXT,
  amount_fcfa INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'unlocked', 'paid')),
  unlock_date DATE NOT NULL,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(echo_id, campaign_id)
);

ALTER TABLE pending_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Echos see own pending" ON pending_earnings
  FOR SELECT USING (echo_id = auth.uid());

CREATE INDEX idx_pending_echo ON pending_earnings(echo_id);
CREATE INDEX idx_pending_campaign ON pending_earnings(campaign_id);
CREATE INDEX idx_pending_status ON pending_earnings(status);
CREATE INDEX idx_pending_unlock ON pending_earnings(unlock_date) WHERE status = 'pending';

-- Admin full access to pending_earnings
CREATE POLICY "Admin full access pending_earnings" ON pending_earnings
  FOR ALL USING (is_admin());

-- ============================================================================
-- 4. RPC: INCREMENT PENDING BALANCE
-- Adds to pending_balance (called when clicks are recorded)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_pending_balance(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
  UPDATE users
  SET pending_balance = COALESCE(pending_balance, 0) + p_amount
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- 5. RPC: TRANSFER PENDING TO AVAILABLE
-- Moves funds from pending to available when unlock date is reached
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_pending_to_available(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET pending_balance = GREATEST(pending_balance - p_amount, 0),
      available_balance = COALESCE(available_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. RPC: DEDUCT AVAILABLE BALANCE
-- Deducts from available_balance (used for withdrawals)
-- ============================================================================

CREATE OR REPLACE FUNCTION deduct_available_balance(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- Lock row and verify sufficient available balance
  SELECT available_balance INTO v_available
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance: have %, need %', COALESCE(v_available, 0), p_amount;
  END IF;

  UPDATE users
  SET available_balance = available_balance - p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. RPC: INCREMENT AVAILABLE BALANCE
-- Adds to available_balance (for refunds, gamification rewards)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_available_balance(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
  UPDATE users
  SET available_balance = COALESCE(available_balance, 0) + p_amount
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- 8. UPDATE increment_click: Credit pending_balance instead of balance
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_click(
  p_link_id uuid,
  p_campaign_id uuid,
  p_echo_id uuid,
  p_cpc integer,
  p_echo_earnings integer
) RETURNS boolean AS $$
DECLARE
  v_updated integer;
BEGIN
  -- Only increment spent if budget allows it (atomic check-and-update)
  UPDATE campaigns
    SET spent = spent + p_cpc
    WHERE id = p_campaign_id
      AND status = 'active'
      AND spent + p_cpc <= budget;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- If no row was updated, budget is exhausted — do NOT pay the echo
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  -- Budget was sufficient — proceed
  UPDATE tracked_links SET click_count = click_count + 1 WHERE id = p_link_id;

  -- Credit pending_balance instead of balance, still track total_earned
  UPDATE users
  SET pending_balance = pending_balance + p_echo_earnings,
      total_earned = total_earned + p_echo_earnings
  WHERE id = p_echo_id;

  -- Auto-complete campaign when budget is fully spent
  UPDATE campaigns SET status = 'completed' WHERE id = p_campaign_id AND spent >= budget;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. UPDATE increment_echo_balance: Credit available_balance (gamification)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_echo_balance(p_echo_id uuid, p_amount integer)
RETURNS void AS $$
  UPDATE users
  SET available_balance = COALESCE(available_balance, 0) + p_amount,
      total_earned = COALESCE(total_earned, 0) + p_amount
  WHERE id = p_echo_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- 10. UPDATE debit_wallet_for_payout: Debit from available_balance
-- ============================================================================

CREATE OR REPLACE FUNCTION debit_wallet_for_payout(
  p_user_id UUID,
  p_amount INTEGER,
  p_idempotency_key UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Check idempotency
  IF EXISTS (
    SELECT 1 FROM wave_payouts WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN false;
  END IF;

  -- Lock row and check available balance
  SELECT available_balance INTO v_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;

  -- Debit available_balance
  UPDATE users
  SET available_balance = available_balance - p_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. UPDATE refund_wallet_from_payout: Refund to available_balance
-- ============================================================================

CREATE OR REPLACE FUNCTION refund_wallet_from_payout(
  p_payout_id uuid
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_amount integer;
BEGIN
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM wave_payouts
  WHERE payout_id = p_payout_id
    AND payout_status != 'refunded';

  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET available_balance = available_balance + v_amount
    WHERE id = v_user_id;

    UPDATE wave_payouts
    SET payout_status = 'refunded'
    WHERE payout_id = p_payout_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. GAMIFICATION CAPS TABLE (ensure exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gamification_caps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cap_type TEXT NOT NULL UNIQUE CHECK (
    cap_type IN ('daily_per_echo', 'monthly_platform', 'min_withdrawal')
  ),
  max_amount_fcfa INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO gamification_caps (cap_type, max_amount_fcfa)
VALUES
  ('daily_per_echo', 500),
  ('monthly_platform', 50000),
  ('min_withdrawal', 500)
ON CONFLICT (cap_type) DO NOTHING;
