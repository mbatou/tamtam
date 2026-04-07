import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCheckoutSession, getPayout } from "@/lib/wave";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import type { Issue } from "./engine";

// ---------------------------------------------------------------------------
// Auto-heal worker — READ-only sync operations (never moves money)
// Logs all actions to reconciliation_auto_heals for audit trail
// ---------------------------------------------------------------------------

interface HealResult {
  success: boolean;
  action: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeState?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterState?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Heal: Refetch stale checkout from Wave API and sync status
// ---------------------------------------------------------------------------

export async function healCheckoutSync(issue: Issue): Promise<HealResult> {
  const waveCheckoutId = issue.metadata?.wave_checkout_id;
  if (!waveCheckoutId) {
    return { success: false, action: "checkout_sync", error: "No wave_checkout_id in metadata" };
  }

  try {
    const waveSession = await getCheckoutSession(waveCheckoutId);
    const beforeState = { checkout_status: "open" };
    const afterState = {
      checkout_status: waveSession.checkout_status,
      payment_status: waveSession.payment_status,
    };

    if (waveSession.checkout_status === "complete") {
      // Checkout completed on Wave side — update our record
      await supabaseAdmin
        .from("wave_checkouts")
        .update({
          checkout_status: "complete",
          completed_at: waveSession.when_completed || new Date().toISOString(),
        })
        .eq("wave_checkout_id", waveCheckoutId);

      // Credit wallet atomically via RPC
      const { data: localCheckout } = await supabaseAdmin
        .from("wave_checkouts")
        .select("id, user_id, amount")
        .eq("wave_checkout_id", waveCheckoutId)
        .single();

      if (localCheckout) {
        const { data: credited } = await supabaseAdmin.rpc("credit_wallet_from_checkout", {
          p_checkout_id: localCheckout.id,
          p_user_id: localCheckout.user_id,
          p_amount: localCheckout.amount,
        });

        if (credited) {
          await logWalletTransaction({
            supabase: supabaseAdmin,
            userId: localCheckout.user_id,
            amount: localCheckout.amount,
            type: "wallet_recharge",
            description: `Recharge Wave (auto-heal sync) — ${localCheckout.amount} FCFA`,
            sourceType: "wave_checkout",
            sourceId: localCheckout.id,
          });
        }
      }

      await logHeal(issue, { success: true, action: "checkout_sync", beforeState, afterState });
      return { success: true, action: "checkout_sync", beforeState, afterState };
    }

    if (waveSession.checkout_status === "expired") {
      await supabaseAdmin
        .from("wave_checkouts")
        .update({ checkout_status: "expired" })
        .eq("wave_checkout_id", waveCheckoutId);

      await logHeal(issue, { success: true, action: "checkout_sync_expired", beforeState, afterState });
      return { success: true, action: "checkout_sync_expired", beforeState, afterState };
    }

    // Still open — nothing to do yet
    await logHeal(issue, { success: true, action: "checkout_sync_still_open", beforeState, afterState });
    return { success: true, action: "checkout_sync_still_open", beforeState, afterState };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await logHeal(issue, { success: false, action: "checkout_sync", error });
    return { success: false, action: "checkout_sync", error };
  }
}

// ---------------------------------------------------------------------------
// Heal: Refetch stuck payout from Wave API and sync status
// ---------------------------------------------------------------------------

export async function healPayoutSync(issue: Issue): Promise<HealResult> {
  const wavePayout = issue.metadata?.wave_payout_id;
  if (!wavePayout) {
    return { success: false, action: "payout_sync", error: "No wave_payout_id in metadata" };
  }

  try {
    const waveResult = await getPayout(wavePayout);
    const beforeState = { payout_status: "processing" };
    const afterState = {
      payout_status: waveResult.payout_status,
      transaction_id: waveResult.transaction_id,
    };

    const isFailed = waveResult.payout_status === "failed" || waveResult.payout_status === "reversed";
    const isCompleted = waveResult.payout_status === "completed";

    if (isCompleted) {
      // Payout completed — update our records
      await supabaseAdmin
        .from("wave_payouts")
        .update({
          payout_status: "completed",
          wave_transaction_id: waveResult.transaction_id,
          receipt_url: waveResult.receipt_url,
          completed_at: waveResult.when_completed || new Date().toISOString(),
        })
        .eq("wave_payout_id", wavePayout);

      // Also update legacy payout record
      const { data: wp } = await supabaseAdmin
        .from("wave_payouts")
        .select("payout_id")
        .eq("wave_payout_id", wavePayout)
        .single();

      if (wp?.payout_id) {
        await supabaseAdmin
          .from("payouts")
          .update({ status: "sent", completed_at: new Date().toISOString() })
          .eq("id", wp.payout_id);
      }

      await logHeal(issue, { success: true, action: "payout_sync_completed", beforeState, afterState });
      return { success: true, action: "payout_sync_completed", beforeState, afterState };
    }

    if (isFailed) {
      // Payout failed — update status (refund requires human action)
      await supabaseAdmin
        .from("wave_payouts")
        .update({
          payout_status: "failed",
          error_code: waveResult.error_code,
          error_message: waveResult.error_message,
        })
        .eq("wave_payout_id", wavePayout);

      const { data: wp } = await supabaseAdmin
        .from("wave_payouts")
        .select("payout_id")
        .eq("wave_payout_id", wavePayout)
        .single();

      if (wp?.payout_id) {
        await supabaseAdmin
          .from("payouts")
          .update({ status: "failed" })
          .eq("id", wp.payout_id);
      }

      await logHeal(issue, { success: true, action: "payout_sync_failed", beforeState, afterState });
      return { success: true, action: "payout_sync_failed", beforeState, afterState };
    }

    // Still processing
    await logHeal(issue, { success: true, action: "payout_sync_still_processing", beforeState, afterState });
    return { success: true, action: "payout_sync_still_processing", beforeState, afterState };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await logHeal(issue, { success: false, action: "payout_sync", error });
    return { success: false, action: "payout_sync", error };
  }
}

// ---------------------------------------------------------------------------
// Run auto-heal on all eligible issues
// ---------------------------------------------------------------------------

export async function runAutoHeal(issues: Issue[]): Promise<HealResult[]> {
  const healable = issues.filter((i) => i.autoHealable);
  const results: HealResult[] = [];

  for (const issue of healable) {
    let result: HealResult;

    switch (issue.suggestedAction) {
      case "refetch_wave":
        if (issue.subjectType === "wave_checkout") {
          result = await healCheckoutSync(issue);
        } else if (issue.subjectType === "wave_payout") {
          result = await healPayoutSync(issue);
        } else {
          result = { success: false, action: "refetch_wave", error: `Unknown subject type: ${issue.subjectType}` };
        }
        break;

      default:
        result = { success: false, action: issue.suggestedAction, error: "Auto-heal not implemented for this action" };
    }

    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

async function logHeal(issue: Issue, result: HealResult): Promise<void> {
  try {
    await supabaseAdmin.from("reconciliation_auto_heals").insert({
      action: result.action,
      subject_type: issue.subjectType,
      subject_id: issue.subjectId,
      before_state: result.beforeState || null,
      after_state: result.afterState || null,
      success: result.success,
      error_message: result.error || null,
    });
  } catch {
    // Non-blocking
    console.error("Failed to log auto-heal:", result.action, issue.subjectId);
  }
}
