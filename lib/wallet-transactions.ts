import { SupabaseClient } from "@supabase/supabase-js";

export type WalletTransactionType =
  | "click_earning"
  | "referral_bonus"
  | "badge_reward"
  | "streak_bonus"
  | "welcome_bonus"
  | "wallet_recharge"
  | "campaign_budget_debit"
  | "campaign_budget_refund"
  | "withdrawal"
  | "withdrawal_refund"
  | "manual_credit"
  | "manual_debit"
  | "balance_reset"
  | "legacy_reconciliation";

interface LogTransactionParams {
  supabase: SupabaseClient;
  userId: string;
  amount: number;
  type: WalletTransactionType;
  description: string;
  sourceId?: string | null;
  sourceType?: string | null;
  createdBy?: string | null;
}

/**
 * Log a wallet transaction. Non-blocking — failures are caught silently
 * to avoid disrupting the primary operation.
 */
export async function logWalletTransaction({
  supabase,
  userId,
  amount,
  type,
  description,
  sourceId,
  sourceType,
  createdBy,
}: LogTransactionParams): Promise<void> {
  try {
    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      amount,
      type,
      description,
      source_id: sourceId || null,
      source_type: sourceType || null,
      created_by: createdBy || null,
      status: "completed",
    });
  } catch {
    // Non-blocking: transaction logging should never break the primary operation
  }
}
