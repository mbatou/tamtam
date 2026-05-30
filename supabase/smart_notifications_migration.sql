-- Smart Push Notification Automation System
-- Adds notification queue and daily cap tracking

-- 1. Notification queue — stores scheduled/sent/suppressed notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  echo_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              text NOT NULL
    CHECK (type IN (
      'new_campaign', 'share_reminder', 'inactivity',
      'streak_danger', 'streak_milestone', 'payout_ready', 'campaign_ending'
    )),
  campaign_id       uuid REFERENCES campaigns(id),
  scheduled_for     timestamptz NOT NULL,
  sent_at           timestamptz,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'suppressed')),
  payload           jsonb NOT NULL DEFAULT '{}',
  suppression_reason text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled
  ON notification_queue (scheduled_for, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_echo_type
  ON notification_queue (echo_id, type, created_at DESC);

-- 2. Daily cap tracker — enforces max 2 pushes per Écho per day
CREATE TABLE IF NOT EXISTS notification_daily_caps (
  echo_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  send_count  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (echo_id, date)
);

-- 3. Comments
COMMENT ON TABLE notification_queue IS 'Smart notification queue — stores pending, sent, and suppressed push notifications';
COMMENT ON COLUMN notification_queue.type IS 'Trigger type: new_campaign, share_reminder, inactivity, streak_danger, campaign_ending, etc.';
COMMENT ON COLUMN notification_queue.scheduled_for IS 'When to send — computed by smart timing engine based on Écho activity history';
COMMENT ON COLUMN notification_queue.suppression_reason IS 'Why suppressed: daily_cap_reached, notifications_disabled, no_push_subscription, etc.';
COMMENT ON TABLE notification_daily_caps IS 'Tracks daily push count per Écho to enforce 2/day maximum';
