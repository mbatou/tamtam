import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCampaignReportEmail, type CampaignReportStats } from "@/lib/email";
import { sendRoutedEmail } from "./email-router";

/**
 * Campaign completed → performance report to the brand.
 *
 * Campaign completion is reachable from six code paths (the expiry cron, the
 * superadmin stop, the brand's own stop, and two exhaustion branches in the
 * click route), so this is written to be called from all of them and to send
 * exactly once: `oncePerCampaign` checks the ledger for an existing successful
 * send against this campaign. Mirrors how `refundCampaignRemaining` handles the
 * same fan-in for money.
 *
 * Never throws — a report is not worth failing a completion over.
 */
export async function sendCampaignReport(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<"sent" | "skipped"> {
  try {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, title, batteur_id, budget, spent, cpc, pricing_model, created_at, ends_at")
      .eq("id", campaignId)
      .single();

    if (!campaign?.batteur_id) return "skipped";

    const { data: brand } = await supabase
      .from("users")
      .select("name")
      .eq("id", campaign.batteur_id)
      .single();

    if (!brand) return "skipped";

    const [links, clickStats, conversions, refunds] = await Promise.all([
      supabase.from("tracked_links").select("echo_id").eq("campaign_id", campaignId),
      supabase.from("clicks").select("is_valid, tracked_links!inner(campaign_id)").eq("tracked_links.campaign_id", campaignId),
      supabase
        .from("conversions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("payment_status", "paid"),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("source_id", campaignId)
        .eq("source_type", "campaign_completion_refund"),
    ]);

    const clicks = (clickStats.data || []) as Array<{ is_valid: boolean }>;

    const stats: CampaignReportStats = {
      campaignTitle: campaign.title,
      brandName: brand.name,
      pricingModel: campaign.pricing_model || "cpc",
      budget: campaign.budget || 0,
      spent: campaign.spent || 0,
      // Only the exactly-once completion refund counts. Duplicates were demoted
      // to `campaign_completion_refund_duplicate` by the F7 remediation, so an
      // exact source_type match keeps a historically over-refunded campaign
      // from reporting the inflated figure.
      refunded: (refunds.data || []).reduce((sum, r) => sum + (r.amount || 0), 0),
      validClicks: clicks.filter((c) => c.is_valid).length,
      totalClicks: clicks.length,
      conversions: conversions.count ?? 0,
      echoCount: new Set((links.data || []).map((l) => l.echo_id)).size,
      startedAt: campaign.created_at,
      endedAt: campaign.ends_at || new Date().toISOString(),
    };

    const result = await sendRoutedEmail(supabase, {
      event: "campaign_completed_report",
      userId: campaign.batteur_id,
      campaignId,
      oncePerCampaign: true,
      ...buildCampaignReportEmail(stats),
    });

    return result.status === "sent" ? "sent" : "skipped";
  } catch (err) {
    console.error(`[campaign-report] failed for ${campaignId}:`, err);
    return "skipped";
  }
}
