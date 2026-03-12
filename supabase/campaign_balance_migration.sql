-- =============================================
-- TAMTAM CAMPAIGN BALANCE LOGIC
-- Atomic balance increment for refunds
-- Run this in Supabase SQL Editor
-- =============================================

-- RPC: Atomically increment a user's balance (used for refunds)
CREATE OR REPLACE FUNCTION increment_balance(
  p_user_id uuid,
  p_amount integer
) RETURNS void AS $$
BEGIN
  UPDATE users SET balance = balance + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
