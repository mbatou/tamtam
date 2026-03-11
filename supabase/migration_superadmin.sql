-- SUPERADMIN MIGRATION
-- Run this in Supabase SQL Editor to add superadmin features to an existing DB

-- 1. Update user role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('echo', 'batteur', 'admin', 'superadmin'));

-- 2. Add status and risk_level columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text
  CHECK (status IN ('active', 'verified', 'flagged', 'suspended'))
  DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_level text
  CHECK (risk_level IN ('low', 'medium', 'high'))
  DEFAULT 'low';

-- 3. Add moderation columns to campaigns
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'rejected'));

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_status text
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'))
  DEFAULT 'pending';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderated_by uuid references users(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- 4. Create blocked_ips table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid default gen_random_uuid() primary key,
  ip_address text unique not null,
  reason text,
  blocked_by uuid references users(id),
  created_at timestamptz default now()
);

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access blocked_ips" ON blocked_ips FOR ALL USING (is_admin());

-- 5. Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references users(id)
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access platform_settings" ON platform_settings FOR ALL USING (is_admin());

-- 6. Seed default settings (ignore if exists)
INSERT INTO platform_settings (key, value) VALUES
  ('platform_fee_percent', '25'),
  ('min_payout_fcfa', '500'),
  ('max_clicks_per_link_per_hour', '50'),
  ('ip_cooldown_hours', '24'),
  ('auto_reject_bots', 'true'),
  ('auto_flag_high_volume', 'true'),
  ('require_campaign_approval', 'true')
ON CONFLICT (key) DO NOTHING;

-- 7. Update is_admin function to include superadmin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'));
$$ LANGUAGE sql SECURITY DEFINER;

-- 8. Add indexes
CREATE INDEX IF NOT EXISTS idx_clicks_is_valid ON clicks(is_valid);
CREATE INDEX IF NOT EXISTS idx_campaigns_moderation ON campaigns(moderation_status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

-- 9. Promote an existing admin to superadmin (update the email below)
-- UPDATE users SET role = 'superadmin' WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
