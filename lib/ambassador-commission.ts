import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Award the referring ambassador their commission for a brand's campaign
 * (LUP-80). No-op when the brand has no active referring ambassador or no
 * referral record.
 *
 * Non-throwing: commission bookkeeping must never block campaign
 * creation/approval — failures are logged instead.
 */
export async function awardAmbassadorCommission(
  supabase: SupabaseClient,
  opts: { brandUserId: string; campaignId: string; campaignBudget: number }
): Promise<void> {
  const { brandUserId, campaignId, campaignBudget } = opts;

  try {
    const { data: brand } = await supabase
      .from("users")
      .select("referred_by_ambassador")
      .eq("id", brandUserId)
      .single();

    if (!brand?.referred_by_ambassador) return;

    const { data: ambassador } = await supabase
      .from("ambassadors")
      .select("id, commission_rate")
      .eq("id", brand.referred_by_ambassador)
      .eq("status", "active")
      .single();

    if (!ambassador) return;

    const commissionAmount = Math.round(campaignBudget * (ambassador.commission_rate / 100));

    const { data: referral } = await supabase
      .from("ambassador_referrals")
      .select("id, first_campaign_at, total_campaigns, total_commission_earned")
      .eq("ambassador_id", ambassador.id)
      .eq("brand_user_id", brandUserId)
      .single();

    if (!referral) return;

    const refUpdates: Record<string, unknown> = {
      total_campaigns: (referral.total_campaigns || 0) + 1,
      status: "active",
      total_commission_earned: (referral.total_commission_earned || 0) + commissionAmount,
    };
    if (!referral.first_campaign_at) {
      refUpdates.first_campaign_at = new Date().toISOString();
    }
    await supabase.from("ambassador_referrals").update(refUpdates).eq("id", referral.id);

    await supabase.from("ambassador_commissions").insert({
      ambassador_id: ambassador.id,
      referral_id: referral.id,
      campaign_id: campaignId,
      campaign_budget: campaignBudget,
      commission_rate: ambassador.commission_rate,
      commission_amount: commissionAmount,
      status: "earned",
    });

    const { data: amb } = await supabase
      .from("ambassadors")
      .select("total_earned")
      .eq("id", ambassador.id)
      .single();

    if (amb) {
      await supabase
        .from("ambassadors")
        .update({
          total_earned: (amb.total_earned || 0) + commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ambassador.id);
    }
  } catch (err) {
    console.error(
      `[ambassador-commission] failed for brand ${brandUserId}, campaign ${campaignId}:`,
      err instanceof Error ? err.message : err
    );
  }
}
