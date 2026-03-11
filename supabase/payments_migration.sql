-- PAYMENTS TABLE (Batteurs funding wallet via PayTech)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  campaign_id uuid REFERENCES campaigns(id),
  amount integer NOT NULL,
  ref_command text UNIQUE NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')) DEFAULT 'pending',
  payment_method text,
  client_phone text,
  paytech_token text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(ref_command);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
CREATE POLICY "Users read own payments" ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own payments
CREATE POLICY "Users create own payments" ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin/service role full access (via is_admin function already defined)
CREATE POLICY "Admin full access payments" ON payments FOR ALL
  USING (is_admin());

-- Add payout columns for PayTech transfer integration (future use)
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paytech_transfer_id text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paytech_token text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS completed_at timestamptz;
