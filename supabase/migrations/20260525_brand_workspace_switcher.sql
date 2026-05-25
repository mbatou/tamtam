-- Multi-brand workspace switcher (brand team roles + last used brand)

-- 1a. Add role and permissions to brand_team_members
ALTER TABLE brand_team_members
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';

-- Role options: 'admin' | 'member' | 'viewer'
-- admin: full access (same as brand owner)
-- member: create/manage campaigns, view analytics, no wallet/settings
-- viewer: read-only, no actions

DO $$ BEGIN
  ALTER TABLE brand_team_members
  ADD CONSTRAINT brand_team_members_role_check
  CHECK (role IN ('admin', 'member', 'viewer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1b. Add last_used_brand_id to users for session memory
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_used_brand_id uuid REFERENCES users(id);

-- 1c. Optimized indexes for multi-brand lookups
CREATE INDEX IF NOT EXISTS idx_btm_member_user_id
ON brand_team_members (member_user_id)
WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_btm_brand_owner_id
ON brand_team_members (brand_owner_id)
WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_btm_email_status
ON brand_team_members (email, status)
WHERE removed_at IS NULL;
