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

-- Add brand_accent_color (background color for landing page)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS brand_accent_color text;

-- Backfill: mark all existing active landing pages as approved
UPDATE landing_pages
SET landing_page_approved = true
WHERE status = 'active' AND landing_page_approved = false;

-- Add constraint for valid template values (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_template_check'
  ) THEN
    ALTER TABLE landing_pages
    ADD CONSTRAINT landing_pages_template_check
    CHECK (template IN ('simple', 'product', 'event', 'app', 'contact'));
  END IF;
END $$;
