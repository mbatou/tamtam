-- LUP-76: Complete transaction traceability
-- Add missing columns to wallet_transactions for full audit trail

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);
