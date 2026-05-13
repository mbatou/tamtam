-- Migration: Tamtam Pixel — Conversion Tracking System
-- Phase 1: Core tables for pixel management and conversion tracking

-- 1. Pixels table: each brand can create one or more pixels
CREATE TABLE IF NOT EXISTS pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  pixel_id TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'app' CHECK (platform IN ('app', 'web', 'both')),
  allowed_events TEXT[] DEFAULT ARRAY['install', 'signup', 'subscription', 'purchase', 'lead', 'custom', 'test'],
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_conversions INTEGER DEFAULT 0,
  last_conversion_at TIMESTAMPTZ,
  last_test_at TIMESTAMPTZ,
  test_status TEXT DEFAULT 'pending' CHECK (test_status IN ('pending', 'success', 'failed')),
  test_count INTEGER DEFAULT 0,
  last_test_error TEXT,
  last_test_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands see own pixels" ON pixels
  FOR ALL USING (brand_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_pixels_brand ON pixels(brand_id);
CREATE INDEX IF NOT EXISTS idx_pixels_pixel_id ON pixels(pixel_id);

-- 2. Conversions table: each conversion event sent via the API
CREATE TABLE IF NOT EXISTS conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pixel_id TEXT NOT NULL REFERENCES pixels(pixel_id),
  brand_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id),
  echo_id UUID REFERENCES users(id),
  tracked_link_id UUID,

  event TEXT NOT NULL,
  event_name TEXT,
  value_amount DECIMAL(10,2),
  value_currency TEXT DEFAULT 'XOF',

  tm_ref TEXT,
  attribution_window_hours INTEGER DEFAULT 168,
  attributed BOOLEAN DEFAULT false,
  attribution_type TEXT CHECK (attribution_type IN ('direct', 'assisted', 'unattributed')),
  click_to_conversion_seconds INTEGER,

  external_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(pixel_id, external_id)
);

ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands see own conversions" ON conversions
  FOR SELECT USING (brand_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conversions_pixel ON conversions(pixel_id);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign ON conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversions_tm_ref ON conversions(tm_ref);
CREATE INDEX IF NOT EXISTS idx_conversions_event ON conversions(pixel_id, event);
CREATE INDEX IF NOT EXISTS idx_conversions_created ON conversions(brand_id, created_at DESC);

-- 3. Add pixel tracking columns to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS pixel_id TEXT REFERENCES pixels(pixel_id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tracked_events TEXT[] DEFAULT '{}';

-- 4. Add tm_ref to tracked_links for attribution
ALTER TABLE tracked_links ADD COLUMN IF NOT EXISTS tm_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_tracked_links_tm_ref ON tracked_links(tm_ref);
