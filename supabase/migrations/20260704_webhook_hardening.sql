-- Webhook hardening: make Wave webhook idempotency atomic.
-- The webhook handler now relies on INSERT + unique-violation (23505)
-- instead of a racy check-then-insert, which requires a unique index.

-- 1. Remove any historical duplicates (keep the oldest row per event id)
DELETE FROM wave_webhook_events a
USING wave_webhook_events b
WHERE a.wave_event_id = b.wave_event_id
  AND a.ctid > b.ctid;

-- 2. Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS wave_webhook_events_event_id_key
  ON wave_webhook_events (wave_event_id);
