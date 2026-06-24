-- Fix: Definitive refund_wallet_from_payout RPC
-- Drops ALL old overloads, then creates exactly two clean versions.
-- Run this in Supabase SQL editor to replace the broken functions.

-- 1. Drop all existing overloads
DROP FUNCTION IF EXISTS refund_wallet_from_payout(uuid, integer, uuid);
DROP FUNCTION IF EXISTS refund_wallet_from_payout(uuid);
DROP FUNCTION IF EXISTS refund_wallet_from_payout(uuid, integer);

-- 2. Three-param overload: used by Wave webhook (handlePayoutFailed)
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
  SELECT id, payout_status INTO v_wave_payout_id, v_payout_status
  FROM wave_payouts
  WHERE idempotency_key = p_idempotency_key;

  IF v_wave_payout_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_payout_status NOT IN ('failed', 'reversed') THEN
    RETURN false;
  END IF;

  -- Idempotency: skip if already refunded (source_id is text)
  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE source_id = v_wave_payout_id::text
    AND type = 'withdrawal_refund'
    AND status = 'completed'
  ) INTO v_already_refunded;

  IF v_already_refunded THEN
    RETURN false;
  END IF;

  UPDATE users
  SET available_balance = available_balance + p_amount
  WHERE id = p_user_id;

  UPDATE wave_payouts
  SET payout_status = 'refunded'
  WHERE id = v_wave_payout_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Single-param overload: used by superadmin manual refund
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
