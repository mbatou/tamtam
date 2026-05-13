-- Migration: Add signup_tm_ref to users table for conversion attribution
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_tm_ref TEXT;

-- Add 'activation' to the default allowed_events for pixels
ALTER TABLE pixels
  ALTER COLUMN allowed_events
  SET DEFAULT ARRAY['install', 'signup', 'activation', 'subscription', 'purchase', 'lead', 'custom', 'test'];

-- Update existing pixels to include 'activation' in their allowed_events
UPDATE pixels
SET allowed_events = array_append(allowed_events, 'activation')
WHERE NOT ('activation' = ANY(allowed_events));
