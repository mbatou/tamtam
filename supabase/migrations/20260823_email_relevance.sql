-- Email relevance: preferences, unsubscribe, and a real send ledger.
--
-- Context: every notification email was previously fire-and-forget. There was
-- no opt-out of any kind (SMS has "STOP 36180"; email had nothing — a legal
-- exposure), and the only tracking was three cron jobs writing a bare row into
-- sent_emails for dedup. The Resend message id was discarded on every send, so
-- ~95% of platform email was undiagnosable after the fact.
--
-- Safe to re-run.

BEGIN;

-- ── 1. Per-user email preferences ────────────────────────────────────────────
-- Mirrors the existing sms_optout / sms_optout_at pair so the two channels are
-- shaped the same way. email_prefs is per-category; NULL / missing key = opted
-- in. Transactional categories (account, money) ignore both — see
-- lib/notifications/channel-policy.ts.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_optout boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_optout_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_prefs jsonb;

COMMENT ON COLUMN public.users.email_optout IS
  'Global opt-out of suppressible email (campaign/digest/marketing). Never suppresses account or money email.';
COMMENT ON COLUMN public.users.email_prefs IS
  'Per-category email preferences, e.g. {"digest": false}. Missing key = opted in.';

-- ── 2. sent_emails becomes the universal ledger ──────────────────────────────
-- It already existed as a dedup table for three crons. Widen it so every send,
-- suppression and failure lands in one place.

ALTER TABLE public.sent_emails
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS resend_id text,
  ADD COLUMN IF NOT EXISTS suppression_reason text;

-- Ops alerts (campaign pending approval, payout requests) have no recipient
-- user row, but they are exactly the sends we most need a record of.
ALTER TABLE public.sent_emails
  ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.sent_emails.status IS
  'sent | suppressed | failed';
COMMENT ON COLUMN public.sent_emails.suppression_reason IS
  'Why a send was suppressed (global_optout, category_optout, no_email_address, already_sent) or the failure message.';

-- Historical rows predate the status column and were all successful sends.
UPDATE public.sent_emails SET status = 'sent' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_sent_emails_type_created
  ON public.sent_emails (email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sent_emails_status
  ON public.sent_emails (status)
  WHERE status <> 'sent';

CREATE INDEX IF NOT EXISTS idx_sent_emails_resend_id
  ON public.sent_emails (resend_id)
  WHERE resend_id IS NOT NULL;

-- ── 3. Deliverability / relevance view ───────────────────────────────────────
-- One place to answer "is this event's email worth sending at all?" — which is
-- the question the whole exercise exists to answer.

CREATE OR REPLACE VIEW public.email_event_stats AS
SELECT
  email_type,
  category,
  count(*)                                        AS total,
  count(*) FILTER (WHERE status = 'sent')         AS sent,
  count(*) FILTER (WHERE status = 'suppressed')   AS suppressed,
  count(*) FILTER (WHERE status = 'failed')       AS failed,
  max(created_at)                                 AS last_sent_at
FROM public.sent_emails
GROUP BY email_type, category;

COMMIT;
