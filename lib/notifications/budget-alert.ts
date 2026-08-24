import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBudgetAlertEmail } from "@/lib/email";
import { sendRoutedEmail } from "./email-router";
import { normalizePhone, sendSms } from "@/lib/sms/sms-service";

/**
 * Budget nearly exhausted — warn the brand before the campaign stops.
 *
 * Fired from two places, for two different reasons:
 *
 *  1. The click route, on the exact click that crosses the threshold. This is
 *     the one that matters — the brand hears within seconds and can top up
 *     before delivery stops.
 *  2. A daily cron, as the safety net. It catches campaigns that crossed via
 *     CPA conversions rather than clicks, and any crossing whose request died
 *     before the alert went out.
 *
 * Both are guarded by `oncePerCampaign`, so the pair can never double-send.
 */

/** Warn once the campaign has burned this share of its budget. */
export const BUDGET_ALERT_THRESHOLD = 0.8;

/**
 * Did this spend take the campaign across the threshold?
 *
 * Pure arithmetic on numbers the caller already has, so the hot path pays no
 * query to find out — and it is true for exactly one click per campaign.
 */
export function crossesBudgetThreshold(
  budget: number,
  spentBefore: number,
  spentAfter: number,
): boolean {
  if (budget <= 0) return false;
  return spentBefore / budget < BUDGET_ALERT_THRESHOLD && spentAfter / budget >= BUDGET_ALERT_THRESHOLD;
}

/** Is this campaign past the threshold but still worth warning about? */
export function isAtRisk(campaign: {
  budget: number | null;
  spent: number | null;
  cpc: number | null;
  cpa_amount?: number | null;
  pricing_model?: string | null;
}): boolean {
  const budget = campaign.budget || 0;
  const spent = campaign.spent || 0;
  if (budget <= 0) return false;
  if (spent / budget < BUDGET_ALERT_THRESHOLD) return false;

  // A campaign already below one unit is finished, not "nearly" finished — the
  // click route completes and refunds it. Warning is pointless noise.
  const unit = campaign.pricing_model === "cpa" ? campaign.cpa_amount || 0 : campaign.cpc || 0;
  if (unit <= 0) return true;
  return budget - spent >= unit;
}

/**
 * Send the alert. Idempotent per campaign — safe to call from anywhere.
 *
 * Never throws: this runs on a click path, and a warning must not break a
 * redirect or a refund.
 */
export async function sendBudgetAlert(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<"sent" | "skipped"> {
  try {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, title, batteur_id, budget, spent, cpc, cpa_amount, pricing_model, status")
      .eq("id", campaignId)
      .single();

    if (!campaign?.batteur_id) return "skipped";
    // A completed campaign is past warning — it gets the report instead.
    if (campaign.status !== "active") return "skipped";

    const { data: brand } = await supabase
      .from("users")
      .select("name, phone, sms_optout")
      .eq("id", campaign.batteur_id)
      .single();

    if (!brand) return "skipped";

    const unit = campaign.pricing_model === "cpa" ? campaign.cpa_amount || 0 : campaign.cpc || 0;

    const result = await sendRoutedEmail(supabase, {
      event: "budget_exhausted",
      userId: campaign.batteur_id,
      campaignId: campaign.id,
      oncePerCampaign: true,
      ...buildBudgetAlertEmail({
        brandName: brand.name,
        campaignTitle: campaign.title,
        budget: campaign.budget || 0,
        spent: campaign.spent || 0,
        cpc: unit,
        pricingModel: campaign.pricing_model || "cpc",
      }),
    });

    if (result.status !== "sent") return "skipped";

    // SMS only alongside a first-time email. Gated on the email having
    // actually gone out, so the ledger guard covers both channels and we never
    // pay for a text about a campaign the brand was already warned about.
    const phone = brand.sms_optout ? null : normalizePhone(brand.phone || "");
    if (!phone) return "sent";

    const remaining = Math.max(0, (campaign.budget || 0) - (campaign.spent || 0));
    const sms = await sendSms({
      phone,
      message:
        `TamTam: budget bientot epuise sur "${campaign.title}". ` +
        `Reste ${remaining.toLocaleString("fr-FR")} FCFA. ` +
        `Rechargez -> tamma.me/admin/campaigns`,
    });

    if (!sms.success) {
      console.error(`[budget-alert] SMS failed for ${campaignId}: ${sms.error}`);
    }

    return "sent";
  } catch (err) {
    console.error(`[budget-alert] failed for ${campaignId}:`, err);
    return "skipped";
  }
}
