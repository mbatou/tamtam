-- ============================================================================
-- ECHO PAYOUT DRIFT FIX (2026-08-23)
-- ============================================================================
-- Audit finding: echo earnings credited to users.pending_balance were not
-- reliably mirrored into the pending_earnings table, and the unlock cron
-- (/api/cron/unlock-earnings) settles ONLY from pending_earnings. Any
-- pending_balance without a matching pending_earnings row therefore never
-- moves to available_balance and can never be withdrawn.
--
-- Root causes fixed here:
--   1. increment_click existed in TWO conflicting versions in the repo — one
--      credited pending_balance, the other credited the dead legacy `balance`
--      column. Both wrote pending_earnings OUTSIDE the transaction (best-effort,
--      from the request handler, after the HTTP response — dropped on serverless
--      freeze). This redefinition is authoritative: it credits pending_balance
--      AND writes pending_earnings ATOMICALLY in the same transaction.
--   2. process_cpa_conversion credited pending_balance but never wrote a
--      pending_earnings row, so 100% of CPA earnings could never unlock.
--   3. sum_echo_balances summed the legacy `balance` column instead of the
--      real liability (available_balance + pending_balance), so reconciliation
--      could not see any of this.
--
-- Idempotent: pure CREATE OR REPLACE; safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. increment_click — atomic budget guard + pending_balance credit + pending_earnings
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_click(
  p_link_id uuid,
  p_campaign_id uuid,
  p_echo_id uuid,
  p_cpc integer,
  p_echo_earnings integer
) RETURNS boolean AS $$
DECLARE
  v_updated integer;
  v_title text;
  v_ends_at timestamptz;
  v_unlock_date date;
BEGIN
  -- Only increment spent if budget allows it (atomic check-and-update)
  UPDATE campaigns
    SET spent = spent + p_cpc
    WHERE id = p_campaign_id
      AND status = 'active'
      AND spent + p_cpc <= budget
  RETURNING title, ends_at INTO v_title, v_ends_at;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- If no row was updated, budget is exhausted — do NOT pay the echo
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  -- Budget was sufficient — proceed with crediting the echo (pending_balance)
  UPDATE tracked_links SET click_count = click_count + 1 WHERE id = p_link_id;

  UPDATE users
    SET pending_balance = COALESCE(pending_balance, 0) + p_echo_earnings,
        total_earned    = COALESCE(total_earned, 0) + p_echo_earnings
    WHERE id = p_echo_id;

  -- Mirror into pending_earnings IN THE SAME TRANSACTION so the unlock cron
  -- can never miss it. unlock_date = min(campaign end, 30 days out).
  v_unlock_date := LEAST(
    COALESCE(v_ends_at::date, (now() + interval '30 days')::date),
    (now() + interval '30 days')::date
  );

  INSERT INTO pending_earnings (
    echo_id, campaign_id, campaign_name, amount_fcfa, click_count, unlock_date, status
  ) VALUES (
    p_echo_id, p_campaign_id, v_title, p_echo_earnings, 1, v_unlock_date, 'pending'
  )
  ON CONFLICT (echo_id, campaign_id) DO UPDATE SET
    -- If the row was already unlocked/paid, re-open it fresh with just the new
    -- earnings (do NOT re-add already-settled amounts). Otherwise accumulate.
    amount_fcfa = CASE WHEN pending_earnings.status = 'pending'
                       THEN pending_earnings.amount_fcfa + EXCLUDED.amount_fcfa
                       ELSE EXCLUDED.amount_fcfa END,
    click_count = CASE WHEN pending_earnings.status = 'pending'
                       THEN pending_earnings.click_count + 1
                       ELSE 1 END,
    status      = 'pending',
    unlocked_at = NULL,
    unlock_date = EXCLUDED.unlock_date,
    campaign_name = COALESCE(EXCLUDED.campaign_name, pending_earnings.campaign_name),
    updated_at  = now();

  -- Auto-complete campaign when budget is fully spent
  UPDATE campaigns SET status = 'completed' WHERE id = p_campaign_id AND spent >= budget;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. process_cpa_conversion — credit pending_balance + write pending_earnings
-- ----------------------------------------------------------------------------
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
  v_title text;
  v_ends_at timestamptz;
  v_unlock_date date;
BEGIN
  -- Lock the campaign row
  SELECT budget - COALESCE(spent, 0), status, title, ends_at
  INTO v_remaining, v_campaign_status, v_title, v_ends_at
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  -- Campaign must be active and have enough budget
  IF v_campaign_status != 'active' OR v_remaining < p_cpa_amount THEN
    UPDATE conversions SET payment_status = 'failed' WHERE id = p_conversion_id;
    RETURN false;
  END IF;

  -- Debit campaign spent
  UPDATE campaigns
  SET spent = COALESCE(spent, 0) + p_cpa_amount
  WHERE id = p_campaign_id;

  -- Credit echo pending_balance
  UPDATE users
  SET pending_balance = COALESCE(pending_balance, 0) + p_echo_earning,
      total_earned    = COALESCE(total_earned, 0) + p_echo_earning
  WHERE id = p_echo_id;

  -- Mirror into pending_earnings so the unlock cron can settle CPA earnings too.
  v_unlock_date := LEAST(
    COALESCE(v_ends_at::date, (now() + interval '30 days')::date),
    (now() + interval '30 days')::date
  );

  INSERT INTO pending_earnings (
    echo_id, campaign_id, campaign_name, amount_fcfa, click_count, unlock_date, status
  ) VALUES (
    p_echo_id, p_campaign_id, v_title, p_echo_earning, 1, v_unlock_date, 'pending'
  )
  ON CONFLICT (echo_id, campaign_id) DO UPDATE SET
    amount_fcfa = CASE WHEN pending_earnings.status = 'pending'
                       THEN pending_earnings.amount_fcfa + EXCLUDED.amount_fcfa
                       ELSE EXCLUDED.amount_fcfa END,
    click_count = CASE WHEN pending_earnings.status = 'pending'
                       THEN pending_earnings.click_count + 1
                       ELSE 1 END,
    status      = 'pending',
    unlocked_at = NULL,
    unlock_date = EXCLUDED.unlock_date,
    campaign_name = COALESCE(EXCLUDED.campaign_name, pending_earnings.campaign_name),
    updated_at  = now();

  -- Mark conversion as paid
  UPDATE conversions
  SET payment_status = 'paid',
      payment_amount = p_cpa_amount,
      echo_earning   = p_echo_earning,
      paid_at        = now()
  WHERE id = p_conversion_id;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. sum_echo_balances — real liability = available_balance + pending_balance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sum_echo_balances() RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(COALESCE(available_balance, 0) + COALESCE(pending_balance, 0)), 0)::BIGINT
  FROM users
  WHERE role = 'echo'
  AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- ----------------------------------------------------------------------------
-- 4. echo_pending_drift — READ-ONLY report of pending_balance not backed by a
--    pending_earnings row (the stuck-earnings class of bug). Used by the
--    reconciliation drift check and by the superadmin backfill route's dry-run.
--    The actual money movement is done by the API route (so it can write
--    auditable wallet_transactions rows), NOT here.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION echo_pending_drift()
RETURNS TABLE(echo_id uuid, echo_name text, pending_balance integer, backed integer, drift integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH pe AS (
    SELECT p.echo_id AS eid, COALESCE(SUM(p.amount_fcfa), 0)::int AS backed
    FROM pending_earnings p
    WHERE p.status = 'pending'
    GROUP BY p.echo_id
  )
  SELECT u.id,
         u.name,
         COALESCE(u.pending_balance, 0)::int,
         COALESCE(pe.backed, 0)::int,
         (COALESCE(u.pending_balance, 0) - COALESCE(pe.backed, 0))::int AS drift
  FROM users u
  LEFT JOIN pe ON pe.eid = u.id
  WHERE u.role = 'echo'
    AND u.deleted_at IS NULL
    AND COALESCE(u.pending_balance, 0) > COALESCE(pe.backed, 0)
  ORDER BY drift DESC;
$$;

REVOKE ALL ON FUNCTION echo_pending_drift() FROM anon, authenticated;
