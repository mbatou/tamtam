ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS paused_at timestamptz;
