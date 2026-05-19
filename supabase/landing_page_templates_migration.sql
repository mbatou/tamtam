-- Landing Page Templates & Approval Gate Migration
-- Run this in Supabase SQL Editor

-- Add template column with default 'simple'
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'simple';

-- Add hero image URL column
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Add landing_page_approved boolean (approval gate before campaign goes live)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS landing_page_approved boolean NOT NULL DEFAULT false;

-- Backfill: mark all existing active landing pages as approved
UPDATE landing_pages
SET landing_page_approved = true
WHERE status = 'active' AND landing_page_approved = false;

-- Add constraint for valid template values
ALTER TABLE landing_pages
ADD CONSTRAINT landing_pages_template_check
CHECK (template IN ('simple', 'product', 'event', 'app', 'contact'));
