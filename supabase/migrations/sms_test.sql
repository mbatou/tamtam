-- Lightweight SMS test log
CREATE TABLE IF NOT EXISTS sms_test_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id),
  phone           text NOT NULL,
  message         text NOT NULL,
  sender          text DEFAULT 'TamTam',
  serviceid       text DEFAULT '36453',
  mtarget_ticket  text,
  status          text DEFAULT 'pending',
  error_code      text,
  error_message   text,
  latency_ms      integer,
  raw_response    text,
  notes           text,
  sent_at         timestamptz DEFAULT now()
);
