-- =============================================
-- TAMTAM SUPERADMIN MIGRATIONS
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (all IF NOT EXISTS)
-- =============================================

-- 1. Ensure 'superadmin' role is allowed
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('echo', 'batteur', 'admin', 'superadmin'));

-- 2. Add user status/risk columns (if not present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- 3. Add campaign moderation columns (if not present)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES users(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- 4. Add payout tracking fields
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paytech_transfer_id text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id);

-- 5. Blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text UNIQUE NOT NULL,
  reason text,
  blocked_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- 6. Platform settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

INSERT INTO platform_settings (key, value) VALUES
  ('platform_fee_percent', '25'),
  ('min_payout_fcfa', '500'),
  ('max_clicks_per_link_per_hour', '50'),
  ('ip_cooldown_hours', '24'),
  ('auto_reject_bots', 'true'),
  ('auto_flag_high_volume', 'true'),
  ('require_campaign_approval', 'false')
ON CONFLICT (key) DO NOTHING;

-- 7. Activity log for audit trail
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES users(id) NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 8. Payments table (if not created yet)
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

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

-- 10. RLS on new tables
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 11. is_admin function (if not exists)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'));
$$ LANGUAGE sql SECURITY DEFINER;

-- 12. RLS policies for new tables
DO $$
BEGIN
  -- payments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users read own payments') THEN
    CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users create own payments') THEN
    CREATE POLICY "Users create own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Admin full access payments') THEN
    CREATE POLICY "Admin full access payments" ON payments FOR ALL USING (is_admin());
  END IF;

  -- admin_activity_log
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_activity_log' AND policyname = 'Admin full access admin_activity_log') THEN
    CREATE POLICY "Admin full access admin_activity_log" ON admin_activity_log FOR ALL USING (is_admin());
  END IF;

  -- blocked_ips (if not already set)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_ips' AND policyname = 'Admin full access blocked_ips') THEN
    CREATE POLICY "Admin full access blocked_ips" ON blocked_ips FOR ALL USING (is_admin());
  END IF;

  -- platform_settings (if not already set)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Admin full access platform_settings') THEN
    CREATE POLICY "Admin full access platform_settings" ON platform_settings FOR ALL USING (is_admin());
  END IF;
END $$;

-- 13. Echo click stats RPC function
CREATE OR REPLACE FUNCTION get_echo_click_stats()
RETURNS TABLE (
  echo_id uuid,
  total_clicks bigint,
  valid_clicks bigint,
  fraud_clicks bigint,
  fraud_rate numeric,
  unique_ips bigint
) AS $$
  SELECT
    tl.echo_id,
    COUNT(c.id) as total_clicks,
    COUNT(c.id) FILTER (WHERE c.is_valid = true) as valid_clicks,
    COUNT(c.id) FILTER (WHERE c.is_valid = false) as fraud_clicks,
    CASE WHEN COUNT(c.id) > 0
      THEN ROUND((COUNT(c.id) FILTER (WHERE c.is_valid = false)::numeric / COUNT(c.id)) * 100, 1)
      ELSE 0
    END as fraud_rate,
    COUNT(DISTINCT c.ip_address) as unique_ips
  FROM tracked_links tl
  LEFT JOIN clicks c ON c.link_id = tl.id
  GROUP BY tl.echo_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 14. Storage bucket for creatives
INSERT INTO storage.buckets (id, name, public)
VALUES ('creatives', 'creatives', true)
ON CONFLICT (id) DO NOTHING;

-- 15. Find your admin user to promote to superadmin:
-- SELECT id, name, role FROM users WHERE role IN ('admin', 'batteur') LIMIT 10;
-- Then run: UPDATE users SET role = 'superadmin' WHERE id = 'YOUR_USER_ID';
