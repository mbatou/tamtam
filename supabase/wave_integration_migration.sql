-- ============================================================================
-- LUP-111: Wave API Integration — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. wave_checkouts — tracks Wave Checkout Sessions (brand recharge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wave_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_id UUID REFERENCES payments(id),
  wave_checkout_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  client_reference TEXT,
  checkout_status TEXT NOT NULL DEFAULT 'open',
  payment_status TEXT,
  wave_launch_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_wave_checkouts_user ON wave_checkouts(user_id);
CREATE INDEX idx_wave_checkouts_wave_id ON wave_checkouts(wave_checkout_id);
CREATE INDEX idx_wave_checkouts_payment ON wave_checkouts(payment_id);
CREATE INDEX idx_wave_checkouts_status ON wave_checkouts(checkout_status);

-- ---------------------------------------------------------------------------
-- 2. wave_payouts — tracks Wave Payouts (écho withdrawal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wave_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID REFERENCES payouts(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  wave_payout_id TEXT UNIQUE,
  idempotency_key UUID NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  mobile TEXT NOT NULL,
  client_reference TEXT,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  receipt_url TEXT,
  wave_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_wave_payouts_user ON wave_payouts(user_id);
CREATE INDEX idx_wave_payouts_payout ON wave_payouts(payout_id);
CREATE INDEX idx_wave_payouts_wave_id ON wave_payouts(wave_payout_id);
CREATE INDEX idx_wave_payouts_idempotency ON wave_payouts(idempotency_key);
CREATE INDEX idx_wave_payouts_status ON wave_payouts(payout_status);

-- ---------------------------------------------------------------------------
-- 3. wave_webhook_events — idempotent webhook event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wave_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wave_events_type ON wave_webhook_events(event_type);
CREATE INDEX idx_wave_events_processed ON wave_webhook_events(processed);

-- ---------------------------------------------------------------------------
-- 4. Atomic wallet credit for checkout completion (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION credit_wallet_from_checkout(
  p_user_id UUID,
  p_amount INTEGER,
  p_wave_checkout_id TEXT,
  p_payment_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_already_processed BOOLEAN;
BEGIN
  -- Check if already processed (idempotency)
  SELECT EXISTS(
    SELECT 1 FROM wave_checkouts
    WHERE wave_checkout_id = p_wave_checkout_id
    AND checkout_status = 'complete'
  ) INTO v_already_processed;

  IF v_already_processed THEN
    RETURN false;
  END IF;

  -- Credit user balance atomically
  UPDATE users
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  -- Mark checkout as complete
  UPDATE wave_checkouts
  SET checkout_status = 'complete',
      payment_status = 'succeeded',
      completed_at = now()
  WHERE wave_checkout_id = p_wave_checkout_id;

  -- Mark associated payment as completed
  IF p_payment_id IS NOT NULL THEN
    UPDATE payments
    SET status = 'completed',
        completed_at = now()
    WHERE id = p_payment_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 5. Atomic wallet debit for payout (prevents race conditions)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION debit_wallet_for_payout(
  p_user_id UUID,
  p_amount INTEGER,
  p_idempotency_key UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_already_exists BOOLEAN;
BEGIN
  -- Check if idempotency key already used
  SELECT EXISTS(
    SELECT 1 FROM wave_payouts
    WHERE idempotency_key = p_idempotency_key
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN false;
  END IF;

  -- Lock the user row and check balance
  SELECT balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN false;
  END IF;

  -- Debit atomically
  UPDATE users
  SET balance = balance - p_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 6. Refund wallet on payout failure
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refund_wallet_from_payout(
  p_user_id UUID,
  p_amount INTEGER,
  p_idempotency_key UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_payout_status TEXT;
BEGIN
  -- Only refund if payout is in failed state
  SELECT payout_status INTO v_payout_status
  FROM wave_payouts
  WHERE idempotency_key = p_idempotency_key;

  IF v_payout_status IS NULL OR v_payout_status NOT IN ('failed', 'reversed') THEN
    RETURN false;
  END IF;

  -- Credit back
  UPDATE users
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 7. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE wave_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API routes use createServiceClient)
-- No user-facing RLS policies needed since all access goes through API routes
