-- Fix: Definitive refund_wallet_from_payout RPC
-- Replaces conflicting versions from wave_integration and dual_balance migrations.
-- Accepts 3 params to match the Wave webhook caller.
-- Idempotent: checks wallet_transactions for existing refund before processing.

CREATE OR REPLACE FUNCTION refund_wallet_from_payout(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key uuid
) RETURNS boolean AS $$
DECLARE
  v_payout_status text;
  v_wave_payout_id uuid;
  v_already_refunded boolean;
BEGIN
  -- Find the wave_payout by idempotency_key
  SELECT id, payout_status INTO v_wave_payout_id, v_payout_status
  FROM wave_payouts
  WHERE idempotency_key = p_idempotency_key;

  IF v_wave_payout_id IS NULL THEN
    RETURN false;
  END IF;

  -- Only refund failed/reversed payouts
  IF v_payout_status NOT IN ('failed', 'reversed') THEN
    RETURN false;
  END IF;

  -- Idempotency: skip if already refunded
  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE source_id = v_wave_payout_id::text
    AND type = 'withdrawal_refund'
    AND status = 'completed'
  ) INTO v_already_refunded;

  IF v_already_refunded THEN
    RETURN false;
  END IF;

  -- Restore available_balance (dual-balance model)
  UPDATE users
  SET available_balance = available_balance + p_amount
  WHERE id = p_user_id;

  -- Mark wave_payout as refunded
  UPDATE wave_payouts
  SET payout_status = 'refunded'
  WHERE id = v_wave_payout_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a single-param overload for manual refunds by wave_payout ID
CREATE OR REPLACE FUNCTION refund_wallet_from_payout(
  p_wave_payout_id uuid
) RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_amount integer;
  v_payout_status text;
  v_already_refunded boolean;
BEGIN
  SELECT user_id, amount, payout_status
  INTO v_user_id, v_amount, v_payout_status
  FROM wave_payouts
  WHERE id = p_wave_payout_id;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_payout_status NOT IN ('failed', 'reversed') THEN
    RETURN false;
  END IF;

  -- Idempotency
  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE source_id = p_wave_payout_id::text
    AND type = 'withdrawal_refund'
    AND status = 'completed'
  ) INTO v_already_refunded;

  IF v_already_refunded THEN
    RETURN false;
  END IF;

  UPDATE users
  SET available_balance = available_balance + v_amount
  WHERE id = v_user_id;

  UPDATE wave_payouts
  SET payout_status = 'refunded'
  WHERE id = p_wave_payout_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
