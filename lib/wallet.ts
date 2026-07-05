import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logWalletTransaction, WalletTransactionType } from "./wallet-transactions";

/**
 * Wallet/ledger service — the single entry point for balance mutations.
 *
 * Debits are atomic: `debit_brand_budget` decrements only when the balance
 * covers the amount, in one UPDATE (no read-modify-write race). Credits go
 * through the existing atomic `increment_balance` / `increment_echo_balance`
 * RPCs. Every mutation is paired with a wallet_transactions ledger entry.
 *
 * Until the `debit_brand_budget` RPC migration
 * (supabase/migrations/20260705_wallet_atomics.sql) is applied, debits fall
 * back to the legacy check-then-update pattern so deploys are not coupled to
 * the migration.
 */

export type DebitResult =
  | { ok: true }
  | { ok: false; reason: "insufficient_balance" | "error"; message: string };

function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PostgREST "function not found" (schema cache) or Postgres undefined_function
  return error.code === "PGRST202" || error.code === "42883" ||
    Boolean(error.message && error.message.includes("Could not find the function"));
}

/**
 * Atomically debit a brand's wallet. Fails (without mutating) when the
 * balance doesn't cover the amount. Does NOT write a ledger entry — use
 * `debitBrandBudgetLogged` unless the ledger entry needs a source id that
 * only exists after a follow-up insert (campaign creation).
 */
export async function debitBrandBudget(
  supabase: SupabaseClient,
  opts: { brandId: string; amount: number }
): Promise<DebitResult> {
  const { brandId, amount } = opts;
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, reason: "error", message: "Invalid debit amount" };
  }

  const { data: debited, error } = await supabase.rpc("debit_brand_budget", {
    p_user_id: brandId,
    p_amount: amount,
  });

  if (error) {
    if (!isMissingFunction(error)) {
      return { ok: false, reason: "error", message: error.message };
    }
    // Legacy fallback (pre-migration): check-then-update
    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("id", brandId)
      .single();
    if (!user || (user.balance || 0) < amount) {
      return { ok: false, reason: "insufficient_balance", message: "Solde insuffisant" };
    }
    const { error: updateError } = await supabase
      .from("users")
      .update({ balance: (user.balance || 0) - amount })
      .eq("id", brandId);
    if (updateError) {
      return { ok: false, reason: "error", message: updateError.message };
    }
    return { ok: true };
  }

  if (!debited) {
    return { ok: false, reason: "insufficient_balance", message: "Solde insuffisant" };
  }
  return { ok: true };
}

/** Atomic debit + ledger entry. The standard way to charge a brand. */
export async function debitBrandBudgetLogged(
  supabase: SupabaseClient,
  opts: {
    brandId: string;
    amount: number;
    description: string;
    sourceId?: string | null;
    createdBy?: string | null;
    type?: WalletTransactionType;
  }
): Promise<DebitResult> {
  const result = await debitBrandBudget(supabase, { brandId: opts.brandId, amount: opts.amount });
  if (!result.ok) return result;

  await logWalletTransaction({
    supabase,
    userId: opts.brandId,
    amount: -opts.amount,
    type: opts.type || "campaign_budget_debit",
    description: opts.description,
    sourceId: opts.sourceId,
    sourceType: "campaign",
    createdBy: opts.createdBy,
  });
  return result;
}

/** Atomic credit to a brand wallet + ledger entry. */
export async function creditBrandWallet(
  supabase: SupabaseClient,
  opts: {
    brandId: string;
    amount: number;
    description: string;
    type?: WalletTransactionType;
    sourceId?: string | null;
    sourceType?: string | null;
    createdBy?: string | null;
    /** Skip the ledger entry (rare — e.g. rolling back a debit that was never logged). */
    log?: boolean;
  }
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc("increment_balance", {
    p_user_id: opts.brandId,
    p_amount: opts.amount,
  });
  if (error) return { ok: false, message: error.message };

  if (opts.log !== false) {
    await logWalletTransaction({
      supabase,
      userId: opts.brandId,
      amount: opts.amount,
      type: opts.type || "campaign_budget_refund",
      description: opts.description,
      sourceId: opts.sourceId,
      sourceType: opts.sourceType ?? "campaign",
      createdBy: opts.createdBy,
    });
  }
  return { ok: true };
}

/** Atomic credit to an echo's available balance + ledger entry. */
export async function creditEchoBalance(
  supabase: SupabaseClient,
  opts: {
    echoId: string;
    amount: number;
    description: string;
    type: WalletTransactionType;
    sourceId?: string | null;
    sourceType?: string | null;
    createdBy?: string | null;
  }
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc("increment_echo_balance", {
    p_echo_id: opts.echoId,
    p_amount: opts.amount,
  });
  if (error) return { ok: false, message: error.message };

  await logWalletTransaction({
    supabase,
    userId: opts.echoId,
    amount: opts.amount,
    type: opts.type,
    description: opts.description,
    sourceId: opts.sourceId,
    sourceType: opts.sourceType,
    createdBy: opts.createdBy,
  });
  return { ok: true };
}
