-- CPA Payment Helper RPCs
-- Run AFTER cpa_pricing_migration.sql (which creates process_cpa_conversion)

-- RPC 1: Atomic brand wallet deduction
CREATE OR REPLACE FUNCTION deduct_brand_balance(
  p_brand_id uuid,
  p_amount integer,
  p_campaign_id uuid,
  p_conversion_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET balance = balance - p_amount
  WHERE id = p_brand_id
  AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance for brand %', p_brand_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: Credit Echo pending balance + log transaction
CREATE OR REPLACE FUNCTION credit_echo_pending(
  p_echo_id uuid,
  p_amount integer,
  p_campaign_id uuid,
  p_conversion_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET pending_balance = COALESCE(pending_balance, 0) + p_amount
  WHERE id = p_echo_id;

  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    description,
    source_id,
    source_type,
    status
  ) VALUES (
    p_echo_id,
    p_amount,
    'cpa_earning',
    'Conversion trackée via Pixel Tamtam',
    p_conversion_id::text,
    'conversion',
    'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow 'duplicate' in payment_status check constraint
ALTER TABLE conversions DROP CONSTRAINT IF EXISTS conversions_payment_status_check;
ALTER TABLE conversions ADD CONSTRAINT conversions_payment_status_check
  CHECK (payment_status IN ('none', 'pending', 'paid', 'failed', 'duplicate'));

-- Mark duplicate conversions (run manually — one-time operation):
--
-- UPDATE conversions
-- SET payment_status = 'duplicate'
-- WHERE campaign_id = '0549a77b-2ae7-41ce-af20-cf65d666bc00'
--   AND payment_status = 'none'
--   AND id NOT IN (
--     'adb0a95e-312c-4e84-ad14-6a23ad1b2888',
--     '3ecc27cd-f53c-4a61-b6bf-5def0f2227f1',
--     '26ea1c97-1578-48d1-af41-b44fa4d213e2',
--     '79af680a-66f5-4d98-abb3-9b24572ed18e',
--     'ff51cc18-3e21-4a43-a33e-a62c647c4b1e',
--     '34e9286e-582a-4008-abf8-4d8b0b2de81a'
--   );
