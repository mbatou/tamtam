-- Migration: add objective column to campaigns table (LUP-107)
-- Supports campaign objectives: awareness (notoriete) and traffic (trafic)
-- Default is 'traffic' to maintain backward compatibility with existing campaigns

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS objective TEXT NOT NULL DEFAULT 'traffic'
CHECK (objective IN ('awareness', 'traffic'));

-- All existing campaigns automatically get 'traffic' (current behavior preserved)
-- Future: add 'conversion' to the CHECK constraint when Tamtam Pixel is built
