-- Welcome bonus settings (LUP-68)
INSERT INTO platform_settings (key, value) VALUES
  ('welcome_bonus_amount', '2000'),
  ('welcome_bonus_end_date', '2026-04-01'),
  ('welcome_bonus_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Wallet transactions table for tracking bonuses, credits, etc.
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'bonus',
  description text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id, type);

-- CRM lead invitation columns (LUP-67)
ALTER TABLE brand_leads ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE brand_leads ADD COLUMN IF NOT EXISTS invitation_count integer DEFAULT 0;
ALTER TABLE brand_leads ADD COLUMN IF NOT EXISTS converted_at timestamptz;
ALTER TABLE brand_leads ADD COLUMN IF NOT EXISTS converted_user_id uuid;
