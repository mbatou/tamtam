-- Challenge system migration (LUP-91)
-- Challenges table (superadmin creates these)
CREATE TABLE IF NOT EXISTS challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  campaign_id uuid REFERENCES campaigns(id),
  theme text DEFAULT 'easter_egg',
  status text DEFAULT 'draft',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  total_budget numeric NOT NULL,
  budget_spent numeric DEFAULT 0,
  clicks_per_reward integer DEFAULT 10,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Reward tiers for each challenge
CREATE TABLE IF NOT EXISTS challenge_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES challenges(id) NOT NULL,
  tier text NOT NULL,
  amount numeric NOT NULL,
  total_quantity integer NOT NULL,
  remaining_quantity integer NOT NULL,
  emoji text DEFAULT '🥚',
  color text,
  created_at timestamptz DEFAULT now()
);

-- Track each Écho's progress in a challenge
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES challenges(id) NOT NULL,
  echo_id uuid REFERENCES users(id) NOT NULL,
  valid_clicks integer DEFAULT 0,
  eggs_earned integer DEFAULT 0,
  total_won numeric DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, echo_id)
);

-- Log of every egg crack
CREATE TABLE IF NOT EXISTS challenge_egg_cracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES challenges(id) NOT NULL,
  echo_id uuid REFERENCES users(id) NOT NULL,
  reward_id uuid REFERENCES challenge_rewards(id) NOT NULL,
  amount numeric NOT NULL,
  tier text NOT NULL,
  cracked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_echo ON challenge_participants(echo_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_egg_cracks_challenge ON challenge_egg_cracks(challenge_id);
