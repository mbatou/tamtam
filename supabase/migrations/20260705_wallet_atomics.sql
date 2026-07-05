-- Atomic brand-wallet debit for lib/wallet.ts.
-- Replaces the read-modify-write pattern (SELECT balance → UPDATE balance)
-- that could race under concurrent requests. The single UPDATE both checks
-- and decrements; it returns false (and mutates nothing) when the balance
-- doesn't cover the amount.
--
-- The app code falls back to the legacy pattern until this is applied,
-- so this migration can be run before or after deploying the code.

CREATE OR REPLACE FUNCTION public.debit_brand_budget(p_user_id uuid, p_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'debit_brand_budget: amount must be a positive integer (got %)', p_amount;
  END IF;

  UPDATE users
  SET balance = balance - p_amount
  WHERE id = p_user_id
    AND deleted_at IS NULL
    AND balance >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_brand_budget(uuid, integer) FROM anon, authenticated;
