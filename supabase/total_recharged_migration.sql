-- =============================================
-- TAMTAM: Separate total_recharged from balance
-- total_recharged = funds from recharges (used for campaigns)
-- balance = refunded funds / credits (stays on platform)
-- Run this in Supabase SQL Editor
-- =============================================

-- Add total_recharged column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_recharged integer DEFAULT 0;

-- Backfill: set total_recharged from completed payments history
UPDATE users u SET total_recharged = COALESCE((
  SELECT SUM(p.amount) FROM payments p
  WHERE p.user_id = u.id AND p.status = 'completed'
), 0);

-- RPC: Atomically decrement total_recharged (used for campaign spending)
CREATE OR REPLACE FUNCTION decrement_recharged(
  p_user_id uuid,
  p_amount integer
) RETURNS void AS $$
BEGIN
  UPDATE users SET total_recharged = total_recharged - p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Atomically increment total_recharged (used for recharges/topups)
CREATE OR REPLACE FUNCTION increment_recharged(
  p_user_id uuid,
  p_amount integer
) RETURNS void AS $$
BEGIN
  UPDATE users SET total_recharged = total_recharged + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
