-- TAMTAM Anti-Fraud Overhaul Migration
-- Senegal-aware fraud detection: carrier IP protection + smart throttling
-- Run this in Supabase SQL Editor

-- 1. Add metadata columns to blocked_ips
ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS block_type text DEFAULT 'manual'
  CHECK (block_type IN ('manual', 'bot', 'datacenter', 'temporary'));
ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0;
ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS carrier_ip boolean DEFAULT false;

-- 2. Create carrier_ip_ranges table for Senegalese carriers (CGNAT protection)
CREATE TABLE IF NOT EXISTS carrier_ip_ranges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier text NOT NULL,
  ip_prefix text NOT NULL,
  country text DEFAULT 'SN',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS for carrier_ip_ranges
ALTER TABLE carrier_ip_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access carrier_ip_ranges" ON carrier_ip_ranges FOR ALL USING (is_admin());
-- Allow public read for click validation (service role bypasses anyway)
CREATE POLICY "Public read carrier_ip_ranges" ON carrier_ip_ranges FOR SELECT USING (true);

-- 3. Seed known Senegalese carrier IP ranges
INSERT INTO carrier_ip_ranges (carrier, ip_prefix, country, notes) VALUES
  ('Orange Senegal', '154.124.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Orange Senegal', '196.207.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Free Senegal', '41.82.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Free Senegal', '41.214.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Expat Senegal', '102.164.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Expat Senegal', '41.92.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Sonatel/Orange', '41.208.', 'SN', 'CGNAT — shared by thousands of subscribers'),
  ('Wave Mobile', '104.28.', 'SN', 'Possible Wave/proxy IPs')
ON CONFLICT DO NOTHING;

-- 4. Add rejection_reason column to clicks for breakdown tracking
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Index for rejection reason analytics
CREATE INDEX IF NOT EXISTS idx_clicks_rejection_reason ON clicks(rejection_reason) WHERE rejection_reason IS NOT NULL;
-- Index for carrier IP prefix lookups
CREATE INDEX IF NOT EXISTS idx_carrier_ip_prefix ON carrier_ip_ranges(ip_prefix);

-- 5. Add new fraud-related platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('fraud_ip_cooldown_hours', '24'),
  ('fraud_link_hourly_limit', '30'),
  ('fraud_ip_daily_valid_limit', '8'),
  ('fraud_speed_check_seconds', '3'),
  ('fraud_auto_block_datacenter', 'true'),
  ('fraud_carrier_ip_protection', 'true')
ON CONFLICT (key) DO NOTHING;

-- 6. Fraud analysis view: click patterns per IP
CREATE OR REPLACE VIEW fraud_ip_analysis AS
SELECT
  c.ip_address,
  COUNT(*) as total_clicks,
  COUNT(*) FILTER (WHERE c.is_valid = true) as valid_clicks,
  COUNT(*) FILTER (WHERE c.is_valid = false) as invalid_clicks,
  COUNT(DISTINCT c.link_id) as unique_links,
  COUNT(DISTINCT DATE(c.created_at)) as active_days,
  MIN(c.created_at) as first_click,
  MAX(c.created_at) as last_click,
  EXTRACT(EPOCH FROM (MAX(c.created_at) - MIN(c.created_at))) as time_span_seconds,
  CASE
    WHEN COUNT(*) > 5 AND EXTRACT(EPOCH FROM (MAX(c.created_at) - MIN(c.created_at))) < 60 THEN 'bot'
    WHEN COUNT(*) > 20 AND COUNT(DISTINCT c.link_id) = 1 THEN 'targeted_abuse'
    WHEN COUNT(*) > 10 AND COUNT(DISTINCT DATE(c.created_at)) >= 3 THEN 'likely_carrier_ip'
    WHEN COUNT(*) > 10 AND COUNT(DISTINCT DATE(c.created_at)) = 1 THEN 'suspicious'
    ELSE 'normal'
  END as risk_assessment,
  EXISTS (
    SELECT 1 FROM carrier_ip_ranges cr
    WHERE c.ip_address LIKE cr.ip_prefix || '%'
  ) as is_carrier_ip
FROM clicks c
WHERE c.ip_address IS NOT NULL
GROUP BY c.ip_address;

-- 7. Fraud analysis view: per-Écho behavioral patterns
CREATE OR REPLACE VIEW fraud_echo_analysis AS
SELECT
  u.id as echo_id,
  u.name,
  u.phone,
  COUNT(DISTINCT tl.id) as links_created,
  COUNT(c.id) as total_clicks,
  COUNT(c.id) FILTER (WHERE c.is_valid = true) as valid_clicks,
  COUNT(c.id) FILTER (WHERE c.is_valid = false) as invalid_clicks,
  ROUND(
    COUNT(c.id) FILTER (WHERE c.is_valid = true)::numeric /
    NULLIF(COUNT(c.id), 0) * 100, 1
  ) as valid_rate_pct,
  COUNT(DISTINCT c.ip_address) FILTER (
    WHERE c.ip_address IN (
      SELECT c2.ip_address FROM clicks c2
      JOIN tracked_links tl2 ON c2.link_id = tl2.id
      WHERE tl2.echo_id = u.id
      GROUP BY c2.ip_address
      HAVING COUNT(*) > 3
    )
  ) as suspicious_repeat_ips,
  CASE
    WHEN COUNT(c.id) FILTER (WHERE c.is_valid = true)::numeric / NULLIF(COUNT(c.id), 0) < 0.3 THEN 'high_fraud_risk'
    WHEN COUNT(c.id) FILTER (WHERE c.is_valid = true)::numeric / NULLIF(COUNT(c.id), 0) < 0.5 THEN 'moderate_risk'
    ELSE 'clean'
  END as risk_level
FROM users u
JOIN tracked_links tl ON tl.echo_id = u.id
LEFT JOIN clicks c ON c.link_id = tl.id
WHERE u.role = 'echo'
GROUP BY u.id, u.name, u.phone;
