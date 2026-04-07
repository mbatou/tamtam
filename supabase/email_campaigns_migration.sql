-- =====================================================
-- LUP-110 Phase 2: Email Campaign Tracking
-- =====================================================

-- Email campaigns (for grouping sends together)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  template_key TEXT NOT NULL,
  target_segment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual email sends (one row per recipient)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id ON email_sends(resend_id);

-- RPC to increment campaign counters atomically
CREATE OR REPLACE FUNCTION increment_campaign_counters(
  p_campaign_id UUID,
  p_sent INTEGER,
  p_failed INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE email_campaigns
  SET
    sent_count = sent_count + p_sent,
    failed_count = failed_count + p_failed
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;
