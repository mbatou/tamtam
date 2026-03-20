-- Add company_name column to users table for brand (batteur) users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name text;
