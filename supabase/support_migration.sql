-- =============================================
-- TAMTAM SUPPORT TICKETS
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text CHECK (status IN ('open', 'replied', 'closed')) DEFAULT 'open',
  admin_reply text,
  replied_by uuid REFERENCES users(id),
  replied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can read own tickets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users read own tickets') THEN
    CREATE POLICY "Users read own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users create own tickets') THEN
    CREATE POLICY "Users create own tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Admin full access support_tickets') THEN
    CREATE POLICY "Admin full access support_tickets" ON support_tickets FOR ALL USING (is_admin());
  END IF;
END $$;
