import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/api/cron";
import { buildBudgetAlertEmail } from "@/lib/email";
import { sendRoutedEmail } from "@/lib/notifications/email-router";
import { normalizePhone, sendSms } from "@/lib/sms/sms-service";

export const dynamic = "force-dynamic";

/**
 * Budget nearly exhausted → warn the brand before the campaign stops.
 *
 * The only genuinely urgent Brand event: the campaign is still running but is
 * about to stop delivering, and every hour of silence is lost reach. That is
 * why it is the one Brand event that spends an SMS.
 *
 * Runs on a cron rather than in the click route on purpose. The click route
 * finishes with a redirect, and work started after a redirect is dropped when
 * the serverless function freezes — which is exactly how the pending_earnings
 * drift happened. An hourly sweep is slower but actually fires.
 */

/** Warn once the campaign has burned this share of its budget. */
const THRESHOLD = 0.8;

/** Never warn about a campaign that cannot afford one more unit anyway. */
const MIN_REMAINING_UNITS = 1;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, title, batteur_id, budget, spent, cpc, cpa_amount, pricing_model")
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    console.error("[budget-alerts] campaign query failed:", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const atRisk = (campaigns || []).filter((c) => {
    const budget = c.budget || 0;
    const spent = c.spent || 0;
    if (budget <= 0 || !c.batteur_id) return false;
    if (spent / budget < THRESHOLD) return false;

    // A campaign already below one unit is finished, not "nearly" finished —
    // the click route completes and refunds it. Warning is pointless noise.
    const unit = c.pricing_model === "cpa" ? c.cpa_amount || 0 : c.cpc || 0;
    if (unit <= 0) return true;
    return budget - spent >= unit * MIN_REMAINING_UNITS;
  });

  let emailed = 0;
  let texted = 0;
  let skipped = 0;

  for (const campaign of atRisk) {
    const { data: brand } = await supabase
      .from("users")
      .select("name, phone, sms_optout")
      .eq("id", campaign.batteur_id)
      .single();

    if (!brand) {
      skipped++;
      continue;
    }

    const unit = campaign.pricing_model === "cpa" ? campaign.cpa_amount || 0 : campaign.cpc || 0;

    // oncePerCampaign: a campaign crosses 80% once, but this cron runs hourly.
    // The ledger is what stops it becoming an hourly nag.
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

    if (result.status !== "sent") {
      skipped++;
      continue;
    }
    emailed++;

    // SMS only alongside a first-time email. Gated on the email actually
    // having been sent, so the ledger guard covers both channels and we never
    // pay for a text about a campaign the brand was already warned about.
    const phone = brand.sms_optout ? null : normalizePhone(brand.phone || "");
    if (!phone) continue;

    const remaining = Math.max(0, (campaign.budget || 0) - (campaign.spent || 0));
    const sms = await sendSms({
      phone,
      message:
        `TamTam: budget bientot epuise sur "${campaign.title}". ` +
        `Reste ${remaining.toLocaleString("fr-FR")} FCFA. ` +
        `Rechargez -> tamma.me/admin/campaigns`,
    });

    if (sms.success) {
      texted++;
    } else {
      console.error(`[budget-alerts] SMS failed for ${campaign.id}: ${sms.error}`);
    }
  }

  return NextResponse.json({
    checked: campaigns?.length || 0,
    at_risk: atRisk.length,
    emailed,
    texted,
    skipped,
  });
}
