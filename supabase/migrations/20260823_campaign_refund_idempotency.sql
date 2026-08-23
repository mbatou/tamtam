-- F7: atomic, exactly-once end-of-campaign budget refunds.
--
-- THE BUG
-- Four call sites refund a campaign's unspent budget to the brand
-- (click route pre/post-budget-exhaustion, the expiry cron, superadmin
-- stop/reject). Each did check-then-act with a DIFFERENT idempotency guard:
--   * app/r/[code]/route.ts      -> ilike '%fin de campagne%'
--   * superadmin/campaigns       -> ilike '%arrêtée%'
--   * cron/unlock-earnings       -> NO GUARD AT ALL
-- Because the text patterns don't match each other, a campaign stopped by an
-- admin and later expired by the cron could be refunded twice; two concurrent
-- clicks hitting the exhausted-budget path could both pass the SELECT before
-- either INSERTed. Amounts were also computed from a stale campaign.spent
-- snapshot read earlier in the request.
--
-- THE FIX
-- One RPC owns completion refunds: it locks the campaign row, recomputes the
-- remaining budget from current data, and credits + writes the ledger row in a
-- single transaction. Idempotency is an exact source_type match (not text),
-- backed by a unique index so even a direct SQL insert can't double-refund.

-- ---------------------------------------------------------------------------
-- 1. Stamp historical completion refunds with the dedicated source_type so the
--    new exact-match guard recognises campaigns already refunded under the old
--    text-matching scheme (otherwise deploying this could re-refund them).
--    Budget-reduction and landing-page-fee refunds are deliberately excluded:
--    those are separate, legitimately-repeatable refunds.
-- ---------------------------------------------------------------------------
UPDATE wallet_transactions
SET source_type = 'campaign_completion_refund'
WHERE type = 'campaign_budget_refund'
  AND source_type IS DISTINCT FROM 'campaign_completion_refund'
  AND source_id IS NOT NULL
  AND (
    description ILIKE '%fin de campagne%'
    OR description ILIKE '%stopped campaign%'
    OR description ILIKE '%arrêtée%'
    OR description ILIKE '%rejected campaign%'
    OR description ILIKE '%campagne mise en pause%'
    OR description ILIKE '%campagne terminée%'
    OR description ILIKE '%suppression campagne%'
  );

-- ---------------------------------------------------------------------------
-- 2. Enforce one completion refund per campaign at the database level.
--    If duplicates already exist they are REPORTED, not deleted — a duplicate
--    is real money the platform over-refunded and needs a human decision.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  dup_count integer;
  dup_list text;
BEGIN
  SELECT count(*), string_agg(source_id || ' (x' || n || ')', ', ')
  INTO dup_count, dup_list
  FROM (
    SELECT source_id, count(*) AS n
    FROM wallet_transactions
    WHERE source_type = 'campaign_completion_refund'
    GROUP BY source_id
    HAVING count(*) > 1
  ) d;

  IF COALESCE(dup_count, 0) > 0 THEN
    RAISE WARNING 'F7: % campaign(s) already have duplicate completion refunds — unique index NOT created. Investigate: %',
      dup_count, dup_list;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS wallet_tx_one_completion_refund_per_campaign
      ON wallet_transactions (source_id)
      WHERE source_type = 'campaign_completion_refund';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. The single entry point for end-of-campaign refunds.
--    Returns the amount actually refunded: 0 when already refunded or when
--    nothing is left to refund. Safe to call from every completion path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_campaign_remaining(
  p_campaign_id uuid,
  p_reason text DEFAULT 'fin de campagne',
  p_created_by uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign   record;
  v_remaining  integer;
  v_already    boolean;
BEGIN
  -- Lock the campaign: concurrent callers for the same campaign serialize here,
  -- so the winner's ledger row is visible to the loser's check below.
  SELECT id, batteur_id, title, budget, COALESCE(spent, 0) AS spent
  INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND OR v_campaign.batteur_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE source_id = p_campaign_id::text
      AND source_type = 'campaign_completion_refund'
  ) INTO v_already;

  IF v_already THEN
    RETURN 0;
  END IF;

  -- Recomputed from the locked row — never a stale caller-side snapshot.
  v_remaining := v_campaign.budget - v_campaign.spent;

  IF v_remaining <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE users
  SET balance = COALESCE(balance, 0) + v_remaining
  WHERE id = v_campaign.batteur_id;

  INSERT INTO wallet_transactions (
    user_id, amount, type, description, source_id, source_type, created_by, status
  ) VALUES (
    v_campaign.batteur_id,
    v_remaining,
    'campaign_budget_refund',
    'Remboursement ' || p_reason || ': ' || COALESCE(v_campaign.title, p_campaign_id::text)
      || ' (' || v_remaining || ' FCFA non dépensés)',
    p_campaign_id::text,
    'campaign_completion_refund',
    p_created_by,
    'completed'
  );

  RETURN v_remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_campaign_remaining(uuid, text, uuid) FROM anon, authenticated;
