CREATE TABLE IF NOT EXISTS sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  email_type text NOT NULL,
  campaign_id uuid REFERENCES campaigns(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sent_emails_user_type ON sent_emails(user_id, email_type);
CREATE INDEX idx_sent_emails_created ON sent_emails(created_at);
