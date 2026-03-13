-- BRAND LEADS TABLE
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS brand_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  message text,
  status text CHECK (status IN ('new', 'contacted', 'converted', 'rejected')) DEFAULT 'new',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_leads_status ON brand_leads(status);
CREATE INDEX IF NOT EXISTS idx_brand_leads_email ON brand_leads(email);
CREATE INDEX IF NOT EXISTS idx_brand_leads_created ON brand_leads(created_at);

-- RLS
ALTER TABLE brand_leads ENABLE ROW LEVEL SECURITY;

-- Only admins/superadmins can access brand_leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_leads' AND policyname = 'Admin full access brand_leads') THEN
    CREATE POLICY "Admin full access brand_leads" ON brand_leads FOR ALL USING (is_admin());
  END IF;
END $$;

-- Allow anonymous inserts (public lead form)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_leads' AND policyname = 'Anyone can submit leads') THEN
    CREATE POLICY "Anyone can submit leads" ON brand_leads FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Ensure increment_balance RPC exists (used by campaign rejection refund)
CREATE OR REPLACE FUNCTION increment_balance(
  p_user_id uuid,
  p_amount integer
) RETURNS void AS $$
BEGIN
  UPDATE users SET balance = balance + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update process_payout to handle completed_at and failure_reason
CREATE OR REPLACE FUNCTION process_payout(
  p_payout_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_echo_id uuid;
  v_amount integer;
BEGIN
  SELECT echo_id, amount INTO v_echo_id, v_amount
  FROM payouts WHERE id = p_payout_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found or not pending';
  END IF;

  IF p_status = 'sent' THEN
    UPDATE payouts SET status = 'sent', completed_at = now() WHERE id = p_payout_id;
    UPDATE users SET balance = balance - v_amount WHERE id = v_echo_id;
  ELSIF p_status = 'failed' THEN
    UPDATE payouts SET status = 'failed', failure_reason = p_reason, completed_at = now() WHERE id = p_payout_id;
  ELSE
    UPDATE payouts SET status = p_status WHERE id = p_payout_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
