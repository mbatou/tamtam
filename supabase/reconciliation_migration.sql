-- LUP-76: Reconciliation — insert legacy_reconciliation transactions
-- for users who have a non-zero balance but no wallet_transactions entries.
-- This fixes the "ghost credit" anomaly flagged by the Investigation page.
--
-- PREREQUISITE: Run wallet_traceability_migration.sql first to add
-- the source_id, source_type, created_by columns.

INSERT INTO wallet_transactions (user_id, amount, type, description, source_type, status)
SELECT
  u.id,
  u.balance,
  'legacy_reconciliation',
  'Réconciliation solde historique — aucune transaction antérieure trouvée (LUP-76)',
  'system',
  'completed'
FROM users u
WHERE u.balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt WHERE wt.user_id = u.id
  );
