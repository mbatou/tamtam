-- ================================================
-- GAMIFICATION RESTRUCTURE — Margin Protection
-- ================================================

-- 1. UPDATE TIER BONUS PERCENTAGES
-- Old: Argent 5%, Or 10%, Diamant 15%
-- New: Argent 1%, Or 3%, Diamant 5%
UPDATE users SET tier_bonus_percent =
  CASE
    WHEN tier = 'argent' THEN 1
    WHEN tier = 'or' THEN 3
    WHEN tier = 'diamant' THEN 5
    ELSE 0
  END
WHERE tier IS NOT NULL AND tier != 'echo';

-- 2. HALVE ALL MILESTONE REWARDS
UPDATE gamification_milestones
SET reward_fcfa = CEIL(reward_fcfa / 2);

-- 3. ADD GAMIFICATION CAPS TABLE
CREATE TABLE IF NOT EXISTS gamification_caps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cap_type TEXT NOT NULL UNIQUE CHECK (
    cap_type IN ('daily_per_echo', 'monthly_platform')
  ),
  max_amount_fcfa INTEGER NOT NULL,
  current_amount_fcfa INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO gamification_caps (cap_type, max_amount_fcfa)
VALUES
  ('daily_per_echo', 500),
  ('monthly_platform', 50000)
ON CONFLICT (cap_type) DO UPDATE
SET max_amount_fcfa = EXCLUDED.max_amount_fcfa;

-- 4. ADD TIER PERKS COLUMN
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_perks JSONB DEFAULT '{}';

UPDATE users SET tier_perks =
  CASE
    WHEN tier = 'argent' THEN '{"badge": true, "priority_distribution": false, "early_access": false, "featured": false, "direct_support": false}'::jsonb
    WHEN tier = 'or' THEN '{"badge": true, "priority_distribution": true, "early_access": true, "featured": false, "direct_support": false}'::jsonb
    WHEN tier = 'diamant' THEN '{"badge": true, "priority_distribution": true, "early_access": true, "featured": true, "direct_support": true}'::jsonb
    ELSE '{"badge": false, "priority_distribution": false, "early_access": false, "featured": false, "direct_support": false}'::jsonb
  END
WHERE role = 'echo';

-- 5. ADD REFERRAL BONUS TRACKING
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  successful_referrals INTEGER DEFAULT 0;

-- 6. ADD STREAK WINDOW TRACKING
ALTER TABLE echo_streaks ADD COLUMN IF NOT EXISTS
  week_reward_paid BOOLEAN DEFAULT false;
ALTER TABLE echo_streaks ADD COLUMN IF NOT EXISTS
  month_reward_paid BOOLEAN DEFAULT false;
ALTER TABLE echo_streaks ADD COLUMN IF NOT EXISTS
  quarter_reward_paid BOOLEAN DEFAULT false;
ALTER TABLE echo_streaks ADD COLUMN IF NOT EXISTS
  quarter_start_date DATE DEFAULT CURRENT_DATE;

-- 7. UPDATE SQL FUNCTIONS FOR NEW BONUS PERCENTAGES
CREATE OR REPLACE FUNCTION get_tier_bonus(tier_name text)
RETURNS numeric AS $$
BEGIN
  IF tier_name = 'diamant' THEN RETURN 0.05;
  ELSIF tier_name = 'or' THEN RETURN 0.03;
  ELSIF tier_name = 'argent' THEN RETURN 0.01;
  ELSE RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. ADD LEADERBOARD NOTIFY PREFERENCE
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  leaderboard_notify BOOLEAN DEFAULT true;

-- 9. INDEXES FOR CAP QUERIES
CREATE INDEX IF NOT EXISTS idx_streak_rewards_echo_created
ON streak_rewards(echo_id, credited_at);

CREATE INDEX IF NOT EXISTS idx_streak_rewards_created
ON streak_rewards(credited_at);
