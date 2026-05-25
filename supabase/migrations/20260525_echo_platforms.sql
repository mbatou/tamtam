-- Migration: Add platform and audience data to users table for Écho onboarding
-- Run: 2026-05-25

ALTER TABLE users
ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS primary_platform text,
ADD COLUMN IF NOT EXISTS audience_size_range text;

CREATE INDEX IF NOT EXISTS idx_users_platforms
ON users USING GIN (platforms);

CREATE INDEX IF NOT EXISTS idx_users_primary_platform
ON users (primary_platform)
WHERE primary_platform IS NOT NULL;
