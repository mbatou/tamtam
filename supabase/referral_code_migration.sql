-- Add referral_code column WITHOUT unique constraint first
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text;

-- Generate referral codes for existing users (FIRSTNAME-TT pattern)
UPDATE users
SET referral_code = UPPER(SPLIT_PART(name, ' ', 1)) || '-TT'
WHERE referral_code IS NULL AND name IS NOT NULL AND role = 'echo';

-- Deduplicate: keep the earliest user with the base code, append number for others
DO $$
DECLARE
  r RECORD;
  counter integer;
  new_code text;
BEGIN
  FOR r IN
    SELECT id, name, referral_code
    FROM users
    WHERE referral_code IS NOT NULL
    AND id NOT IN (
      SELECT DISTINCT ON (referral_code) id
      FROM users
      WHERE referral_code IS NOT NULL
      ORDER BY referral_code, created_at ASC
    )
  LOOP
    counter := 2;
    LOOP
      new_code := UPPER(SPLIT_PART(r.name, ' ', 1)) || counter || '-TT';
      IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = new_code AND id != r.id) THEN
        UPDATE users SET referral_code = new_code WHERE id = r.id;
        EXIT;
      END IF;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Now add the unique constraint after dedup is done
ALTER TABLE users ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- RPC function to increment referral_count atomically
CREATE OR REPLACE FUNCTION increment_referral_count(p_user_id uuid)
RETURNS void AS $$
  UPDATE users
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;
