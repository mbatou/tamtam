-- =============================================
-- GAMIFICATION MIGRATION
-- Streaks, milestones, achievements, tiers
-- =============================================

-- STREAKS: Track consecutive campaign participation
CREATE TABLE IF NOT EXISTS echo_streaks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  echo_id uuid REFERENCES users(id) NOT NULL UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_campaign_date date,
  streak_updated_at timestamptz DEFAULT now()
);

ALTER TABLE echo_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "echos_read_own_streak" ON echo_streaks
  FOR SELECT USING ((SELECT auth.uid()) = echo_id);

CREATE POLICY "superadmin_streaks" ON echo_streaks FOR ALL USING (
  (SELECT auth.uid()) IN (SELECT id FROM users WHERE role = 'superadmin')
);

-- MILESTONES: One-time achievement definitions
CREATE TABLE IF NOT EXISTS gamification_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  reward_fcfa integer NOT NULL DEFAULT 0,
  condition_type text NOT NULL, -- 'clicks', 'campaigns', 'referrals', 'streak'
  condition_value integer NOT NULL,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gamification_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_milestones" ON gamification_milestones
  FOR SELECT USING (true);

CREATE POLICY "superadmin_milestones" ON gamification_milestones FOR ALL USING (
  (SELECT auth.uid()) IN (SELECT id FROM users WHERE role = 'superadmin')
);

-- Seed milestones
INSERT INTO gamification_milestones (key, title, description, icon, reward_fcfa, condition_type, condition_value, sort_order) VALUES
  ('first_campaign',    'Premier rythme',      'Accepte ton premier rythme',                        '🥁', 50,   'campaigns', 1,    1),
  ('clicks_50',         '50 résonances',       'Génère 50 clics valides au total',                  '📡', 150,  'clicks',    50,   2),
  ('clicks_200',        '200 résonances',      'Génère 200 clics valides au total',                 '⚡', 300,  'clicks',    200,  3),
  ('clicks_500',        '500 résonances',      'Génère 500 clics valides — tu es un vrai Écho!',    '🔥', 500,  'clicks',    500,  4),
  ('clicks_1000',       '1000 résonances',     'Légende! 1000 clics valides.',                      '💎', 1000, 'clicks',    1000, 5),
  ('referrals_5',       'Parrain x5',          'Invite 5 amis qui complètent leur premier rythme',  '🤝', 500,  'referrals', 5,    6),
  ('streak_5',          'Flamme x5',           '5 rythmes d''affilée sans interruption',            '🔥', 250,  'streak',    5,    7),
  ('streak_10',         'Flamme x10',          '10 rythmes d''affilée — inarrêtable!',              '💫', 1000, 'streak',    10,   8),
  ('campaigns_10',      'Vétéran',             'Participe à 10 campagnes au total',                 '🎖️', 200,  'campaigns', 10,   9),
  ('campaigns_25',      'Machine',             'Participe à 25 campagnes au total',                 '🏆', 500,  'campaigns', 25,   10);

-- ECHO ACHIEVEMENTS: Which milestones each Echo has unlocked
CREATE TABLE IF NOT EXISTS echo_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  echo_id uuid REFERENCES users(id) NOT NULL,
  milestone_id uuid REFERENCES gamification_milestones(id) NOT NULL,
  reward_fcfa integer NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  reward_credited boolean DEFAULT false,
  UNIQUE(echo_id, milestone_id)
);

ALTER TABLE echo_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "echos_read_own_achievements" ON echo_achievements
  FOR SELECT USING ((SELECT auth.uid()) = echo_id);

CREATE POLICY "superadmin_achievements" ON echo_achievements FOR ALL USING (
  (SELECT auth.uid()) IN (SELECT id FROM users WHERE role = 'superadmin')
);

-- STREAK REWARDS: Track streak bonus payouts
CREATE TABLE IF NOT EXISTS streak_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  echo_id uuid REFERENCES users(id) NOT NULL,
  streak_count integer NOT NULL,
  reward_fcfa integer NOT NULL,
  credited_at timestamptz DEFAULT now()
);

ALTER TABLE streak_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "echos_read_own_streak_rewards" ON streak_rewards
  FOR SELECT USING ((SELECT auth.uid()) = echo_id);

CREATE POLICY "superadmin_streak_rewards" ON streak_rewards FOR ALL USING (
  (SELECT auth.uid()) IN (SELECT id FROM users WHERE role = 'superadmin')
);

-- ADD TIER + REFERRAL TRACKING TO USERS
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier text DEFAULT 'echo'
  CHECK (tier IN ('echo', 'argent', 'or', 'diamant'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_valid_clicks integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_campaigns_joined integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_bonus_percent numeric(4,2) DEFAULT 0;

-- FUNCTION: Auto-calculate tier from clicks
CREATE OR REPLACE FUNCTION calculate_echo_tier(clicks integer)
RETURNS text AS $$
BEGIN
  IF clicks >= 1000 THEN RETURN 'diamant';
  ELSIF clicks >= 500 THEN RETURN 'or';
  ELSIF clicks >= 100 THEN RETURN 'argent';
  ELSE RETURN 'echo';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Get tier bonus percentage
CREATE OR REPLACE FUNCTION get_tier_bonus(tier_name text)
RETURNS numeric AS $$
BEGIN
  IF tier_name = 'diamant' THEN RETURN 0.15;
  ELSIF tier_name = 'or' THEN RETURN 0.10;
  ELSIF tier_name = 'argent' THEN RETURN 0.05;
  ELSE RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Increment echo clicks counter
CREATE OR REPLACE FUNCTION increment_echo_clicks(p_echo_id uuid)
RETURNS void AS $$
  UPDATE users
  SET total_valid_clicks = COALESCE(total_valid_clicks, 0) + 1
  WHERE id = p_echo_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- FUNCTION: Increment echo balance (for gamification rewards)
CREATE OR REPLACE FUNCTION increment_echo_balance(p_echo_id uuid, p_amount integer)
RETURNS void AS $$
  UPDATE users
  SET balance = COALESCE(balance, 0) + p_amount,
      total_earned = COALESCE(total_earned, 0) + p_amount
  WHERE id = p_echo_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- FUNCTION: Get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(since_date timestamptz, limit_count integer)
RETURNS TABLE (
  echo_id uuid,
  name text,
  tier text,
  total_clicks bigint,
  campaigns_joined bigint
) AS $$
  SELECT
    u.id as echo_id,
    u.name,
    u.tier,
    COUNT(c.id) FILTER (WHERE c.is_valid = true) as total_clicks,
    COUNT(DISTINCT tl.campaign_id) as campaigns_joined
  FROM users u
  JOIN tracked_links tl ON tl.echo_id = u.id
  LEFT JOIN clicks c ON c.link_id = tl.id AND c.created_at >= since_date
  WHERE u.role = 'echo'
    AND u.status != 'suspended'
  GROUP BY u.id, u.name, u.tier
  HAVING COUNT(c.id) FILTER (WHERE c.is_valid = true) > 0
  ORDER BY total_clicks DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;
