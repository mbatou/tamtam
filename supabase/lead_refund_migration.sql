-- Migration: Add refund_campaign_for_lead RPC
-- Reverses debit_campaign_for_lead: returns CPL to campaign budget,
-- decrements leads_captured_count, claws back echo earnings.
-- Run after lead_generation_migration.sql

CREATE OR REPLACE FUNCTION refund_campaign_for_lead(
  p_campaign_id UUID,
  p_cpl INTEGER,
  p_echo_id UUID,
  p_echo_earnings INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Return CPL to campaign budget and decrement lead count
  UPDATE campaigns
    SET spent = GREATEST(0, spent - p_cpl),
        leads_captured_count = GREATEST(0, leads_captured_count - 1)
    WHERE id = p_campaign_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  -- Claw back echo earnings (floor at 0 to avoid negative balance)
  IF p_echo_id IS NOT NULL AND p_echo_earnings > 0 THEN
    UPDATE users
      SET balance = GREATEST(0, balance - p_echo_earnings),
          total_earned = GREATEST(0, total_earned - p_echo_earnings)
      WHERE id = p_echo_id;
  END IF;

  -- Re-activate campaign if it was auto-completed due to budget exhaustion
  UPDATE campaigns
    SET status = 'active'
    WHERE id = p_campaign_id
      AND status = 'completed'
      AND spent < budget;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
