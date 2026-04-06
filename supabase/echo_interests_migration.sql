-- =====================================================
-- LUP-110: Écho Interests + Secondary Signals
-- =====================================================

-- Interest categories (seed data, not user-editable)
CREATE TABLE IF NOT EXISTS interest_categories (
  id TEXT PRIMARY KEY,  -- slug like 'food_restaurants'
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  emoji TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secondary signals (seed data, not user-editable)
CREATE TABLE IF NOT EXISTS content_signals (
  id TEXT PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  emoji TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: Écho interests (many-to-many)
CREATE TABLE IF NOT EXISTS echo_interests (
  echo_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL REFERENCES interest_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (echo_id, interest_id)
);

-- Junction: Écho secondary signals (many-to-many)
CREATE TABLE IF NOT EXISTS echo_content_signals (
  echo_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL REFERENCES content_signals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (echo_id, signal_id)
);

-- Track when an Écho completed the onboarding flow
ALTER TABLE users
ADD COLUMN IF NOT EXISTS interests_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_founding_echo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interests_prompt_dismissed_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_echo_interests_echo ON echo_interests(echo_id);
CREATE INDEX IF NOT EXISTS idx_echo_interests_interest ON echo_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_echo_signals_echo ON echo_content_signals(echo_id);
CREATE INDEX IF NOT EXISTS idx_users_interests_completed ON users(interests_completed_at);

-- =====================================================
-- SEED DATA: Interest categories
-- =====================================================

INSERT INTO interest_categories (id, name_fr, name_en, emoji, sort_order) VALUES
  ('food_restaurants', 'Alimentation & Restaurants', 'Food & Restaurants', '🍽️', 1),
  ('fashion_beauty', 'Mode & Beauté', 'Fashion & Beauty', '👗', 2),
  ('tech_electronics', 'Tech & Électronique', 'Tech & Electronics', '📱', 3),
  ('education_training', 'Éducation & Formation', 'Education & Training', '📚', 4),
  ('health_wellness', 'Santé & Bien-être', 'Health & Wellness', '💊', 5),
  ('sports_fitness', 'Sport & Fitness', 'Sports & Fitness', '⚽', 6),
  ('entertainment_events', 'Divertissement & Événements', 'Entertainment & Events', '🎉', 7),
  ('real_estate_auto', 'Immobilier & Automobile', 'Real Estate & Auto', '🏠', 8),
  ('financial_services', 'Services Financiers', 'Financial Services', '💰', 9),
  ('religion_spiritual', 'Religion & Spiritualité', 'Religious & Spiritual', '🕌', 10)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA: Content signals
-- =====================================================

INSERT INTO content_signals (id, name_fr, name_en, emoji, sort_order) VALUES
  ('memes_humor', 'Memes & Humour', 'Memes & Humor', '😂', 1),
  ('news_current', 'Actualités & News', 'News & Current Events', '📰', 2),
  ('religion_prayer', 'Religion & Prière', 'Religion & Prayer', '🙏', 3),
  ('sports', 'Sport', 'Sports', '🏆', 4),
  ('personal_family', 'Vie personnelle & Famille', 'Personal & Family', '👨‍👩‍👧', 5),
  ('business_opportunities', 'Business & Opportunités', 'Business & Opportunities', '💼', 6)
ON CONFLICT (id) DO NOTHING;
