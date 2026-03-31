-- Account deletion: soft delete + anonymization tracking columns
-- LUP-100

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS original_email text;

CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;
