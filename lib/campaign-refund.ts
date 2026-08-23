import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Refund a campaign's unspent budget to the brand — exactly once.
 *
 * Delegates to the refund_campaign_remaining RPC
 * (supabase/migrations/20260823_campaign_refund_idempotency.sql), which locks
 * the campaign row, recomputes `budget - spent` from current data, and writes
 * the credit + ledger row in one transaction. Idempotency is an exact
 * source_type match backed by a unique index, so calling this from every
 * completion path (click route, expiry cron, superadmin stop/reject) is safe
 * — the first call refunds, the rest return 0.
 *
 * Never throws: refunds run on non-blocking completion paths.
 *
 * @returns the amount refunded (0 when already refunded or nothing is left)
 */
export async function refundCampaignRemaining(
  supabase: SupabaseClient,
  campaignId: string,
  opts?: { reason?: string; createdBy?: string | null }
): Promise<number> {
  const { data, error } = await supabase.rpc("refund_campaign_remaining", {
    p_campaign_id: campaignId,
    p_reason: opts?.reason || "fin de campagne",
    p_created_by: opts?.createdBy ?? null,
  });

  if (error) {
    console.error(`[campaign-refund] ${campaignId} failed:`, error.message);
    return 0;
  }

  return typeof data === "number" ? data : 0;
}
