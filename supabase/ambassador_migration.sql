-- Ambassador Referral Program (LUP-80)
-- Ambassadors earn 5% commission on every campaign launched by referred brands.
-- Referred brands get 10,000 FCFA welcome bonus.

-- Ambassadors table
CREATE TABLE IF NOT EXISTS ambassadors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  referral_code text NOT NULL UNIQUE,
  commission_rate numeric DEFAULT 5.0,
  status text DEFAULT 'active',
  total_referrals integer DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ambassadors_code ON ambassadors(referral_code);
CREATE INDEX IF NOT EXISTS idx_ambassadors_status ON ambassadors(status);

-- Referral tracking
CREATE TABLE IF NOT EXISTS ambassador_referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id uuid REFERENCES ambassadors(id) NOT NULL,
  brand_user_id uuid REFERENCES users(id) NOT NULL,
  referral_code text NOT NULL,
  signed_up_at timestamptz DEFAULT now(),
  first_campaign_at timestamptz,
  status text DEFAULT 'signed_up',
  total_campaigns integer DEFAULT 0,
  total_commission_earned numeric DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_amb_referrals_ambassador ON ambassador_referrals(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_amb_referrals_brand ON ambassador_referrals(brand_user_id);

-- Commission ledger
CREATE TABLE IF NOT EXISTS ambassador_commissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id uuid REFERENCES ambassadors(id) NOT NULL,
  referral_id uuid REFERENCES ambassador_referrals(id),
  campaign_id uuid NOT NULL,
  campaign_budget numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'earned',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amb_commissions_ambassador ON ambassador_commissions(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_amb_commissions_campaign ON ambassador_commissions(campaign_id);

-- Add column to users table for ambassador tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_ambassador uuid REFERENCES ambassadors(id);
