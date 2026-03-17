-- Team management: add team_position and team_permissions to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_position text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_permissions jsonb DEFAULT '[]'::jsonb;

-- Index for quick team member lookup
CREATE INDEX IF NOT EXISTS idx_users_team_position ON users(team_position) WHERE team_position IS NOT NULL;
