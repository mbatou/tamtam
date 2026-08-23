-- F7 remediation: recover money lost to double completion-refunds, then
-- install the unique index that the duplicates were blocking.
--
-- Confirmed in production (2026-08-23), 10,015 FCFA over-refunded:
--   * BoostMate Inc  b1db54dd… : deleted (14:46 "suppression campagne") then
--     completed (14:54 "campagne terminée") — two paths, two wordings, neither
--     guard saw the other. 20,000 F refunded on a 10,000 F budget.
--   * GOFAR HOLDING  c176a9a4… : click route refunded the 15 F leftover, then
--     the expiry cron — which had no guard at all — refunded it again. 30 F on
--     a 15 F remainder.
--
-- Both scenarios are already impossible (refund_campaign_remaining locks the
-- campaign row and checks the ledger inside that lock). This script cleans up
-- the historical damage.
--
-- PRINCIPLES
--   * Nothing is deleted. Duplicate refund rows stay in the ledger and in the
--     brand's transaction history — they are real financial records. The
--     superseded ones are re-stamped 'campaign_completion_refund_duplicate' so
--     the canonical row is unique and the index can be created.
--   * The correcting debit is booked as 'legacy_reconciliation' with a negative
--     amount, which offsets the erroneous refund in money-in reporting
--     (superadmin/datalab counts campaign_budget_refund and
--     legacy_reconciliation as money-in).
--   * Idempotent: re-running corrects nothing twice (guarded on the audit row).
--   * A debit is clamped to the brand's available balance so no account is
--     driven negative; any shortfall is reported for a human decision.

DO $$
DECLARE
  r            record;
  v_balance    integer;
  v_debit      integer;
  v_corrected  integer := 0;
  v_recovered  integer := 0;
BEGIN
  FOR r IN
    WITH ranked AS (
      SELECT
        wt.id,
        wt.source_id,
        wt.amount,
        row_number() OVER (PARTITION BY wt.source_id ORDER BY wt.created_at) AS rn
      FROM wallet_transactions wt
      WHERE wt.source_type = 'campaign_completion_refund'
        AND wt.source_id IN (
          SELECT source_id FROM wallet_transactions
          WHERE source_type = 'campaign_completion_refund'
          GROUP BY source_id HAVING count(*) > 1
        )
    )
    SELECT
      ranked.source_id                                   AS campaign_id,
      c.batteur_id                                       AS brand_id,
      c.title                                            AS campaign_title,
      SUM(ranked.amount) FILTER (WHERE ranked.rn > 1)    AS overage,
      array_agg(ranked.id) FILTER (WHERE ranked.rn > 1)  AS duplicate_tx_ids
    FROM ranked
    JOIN campaigns c ON c.id::text = ranked.source_id
    GROUP BY ranked.source_id, c.batteur_id, c.title
  LOOP
    -- Already corrected? (idempotency guard)
    IF EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE source_id = r.campaign_id
        AND source_type = 'refund_correction'
    ) THEN
      CONTINUE;
    END IF;

    -- Demote the superseded duplicates (kept, not deleted)
    UPDATE wallet_transactions
    SET source_type = 'campaign_completion_refund_duplicate'
    WHERE id = ANY (r.duplicate_tx_ids);

    SELECT COALESCE(balance, 0) INTO v_balance FROM users WHERE id = r.brand_id;
    v_debit := LEAST(r.overage, GREATEST(v_balance, 0));

    IF v_debit < r.overage THEN
      RAISE WARNING 'Campaign % (brand %): overage % F exceeds balance % F — recovering only % F, shortfall % F needs a manual decision',
        r.campaign_id, r.brand_id, r.overage, v_balance, v_debit, r.overage - v_debit;
    END IF;

    IF v_debit > 0 THEN
      UPDATE users SET balance = COALESCE(balance, 0) - v_debit WHERE id = r.brand_id;

      INSERT INTO wallet_transactions (
        user_id, amount, type, description, source_id, source_type, status
      ) VALUES (
        r.brand_id,
        -v_debit,
        'legacy_reconciliation',
        'Correction: remboursement de fin de campagne comptabilisé en double ('
          || COALESCE(r.campaign_title, r.campaign_id) || ')',
        r.campaign_id,
        'refund_correction',
        'completed'
      );

      v_recovered := v_recovered + v_debit;
    END IF;

    v_corrected := v_corrected + 1;
  END LOOP;

  RAISE NOTICE 'F7 remediation: % campaign(s) corrected, % FCFA recovered', v_corrected, v_recovered;
END $$;

-- With the duplicates demoted, the canonical refund per campaign is unique —
-- install the guard that could not be created before.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_tx_one_completion_refund_per_campaign
  ON wallet_transactions (source_id)
  WHERE source_type = 'campaign_completion_refund';
