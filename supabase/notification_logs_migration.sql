-- Migration: Notification Logs
-- Tracks campaign notification delivery across email and WhatsApp channels.

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  echo_id UUID REFERENCES users(id) NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'none')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending', 'manual')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, echo_id, channel)
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notification_logs_campaign ON notification_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_echo ON notification_logs(echo_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(campaign_id, status);
