-- LUP-76: Reconciliation — insert legacy_reconciliation transactions
-- for users who have a non-zero balance but no wallet_transactions entries.
-- This fixes the "ghost credit" anomaly flagged by the Investigation page.

INSERT INTO wallet_transactions (user_id, amount, type, description, source_type, status)
SELECT
  u.id,
  u.balance,
  'legacy_reconciliation',
  'Réconciliation solde historique — aucune transaction antérieure trouvée (LUP-76)',
  'system',
  'completed'
FROM users u
LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
WHERE u.balance > 0
  AND wt.id IS NULL
GROUP BY u.id, u.balance;
