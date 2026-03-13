-- Fix: prevent campaign overspending
-- The old increment_click blindly added CPC to spent without checking budget.
-- This version returns false if the budget would be exceeded, preventing overspend.

-- Drop and recreate with budget enforcement
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

  -- Budget was sufficient — proceed with crediting the echo
  UPDATE tracked_links SET click_count = click_count + 1 WHERE id = p_link_id;
  UPDATE users SET balance = balance + p_echo_earnings, total_earned = total_earned + p_echo_earnings WHERE id = p_echo_id;

  -- Auto-complete campaign when budget is fully spent
  UPDATE campaigns SET status = 'completed' WHERE id = p_campaign_id AND spent >= budget;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
