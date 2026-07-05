-- Webhook hardening: make Wave webhook idempotency atomic.
-- The webhook handler relies on INSERT + unique-violation (23505) instead of
-- a racy check-then-insert, which requires wave_event_id to be unique.
--
-- NOTE: production already has a UNIQUE constraint on wave_event_id
-- (wave_webhook_events.wave_event_id text NOT NULL UNIQUE), so this
-- migration is a no-op there. It exists for environments created without
-- the constraint. Safe to run anywhere — it only acts if no unique
-- index/constraint on wave_event_id exists yet.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (i.indkey)
    WHERE t.relname = 'wave_webhook_events'
      AND i.indisunique
      AND a.attname = 'wave_event_id'
  ) THEN
    -- Remove any historical duplicates (keep the oldest row per event id)
    DELETE FROM wave_webhook_events a
    USING wave_webhook_events b
    WHERE a.wave_event_id = b.wave_event_id
      AND a.ctid > b.ctid;

    CREATE UNIQUE INDEX wave_webhook_events_event_id_key
      ON wave_webhook_events (wave_event_id);
  END IF;
END $$;
