-- Brand team members table (LUP-89)
CREATE TABLE IF NOT EXISTS brand_team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_owner_id uuid NOT NULL REFERENCES users(id),
  member_user_id uuid REFERENCES users(id),
  email text NOT NULL,
  status text DEFAULT 'invited',
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  removed_at timestamptz,
  invited_by uuid REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_brand_team_owner ON brand_team_members(brand_owner_id);
CREATE INDEX IF NOT EXISTS idx_brand_team_member ON brand_team_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_team_email ON brand_team_members(email);

-- Add brand_owner_id to users table for team members to reference their parent brand
-- brand_owner_id is NULL for brand owners themselves
-- brand_owner_id = owner's user ID for team members
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_owner_id uuid REFERENCES users(id);
