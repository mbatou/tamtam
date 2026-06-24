-- SMS Production Migration
-- Adds SMS opt-out columns to users and creates sms_logs table

-- 1. User SMS columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sms_optout boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_optout_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sms_at timestamptz;

-- 2. Production SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  echo_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  phone           text NOT NULL,
  message         text NOT NULL,
  type            text NOT NULL,
  campaign_id     uuid REFERENCES campaigns(id),
  mtarget_ticket  text,
  remote_id       text,
  status          text DEFAULT 'pending',
  error_code      text,
  error_message   text,
  latency_ms      integer,
  raw_response    text,
  sent_at         timestamptz DEFAULT now(),
  delivered_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_echo_id ON sms_logs (echo_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs (type, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_ticket ON sms_logs (mtarget_ticket) WHERE mtarget_ticket IS NOT NULL;
