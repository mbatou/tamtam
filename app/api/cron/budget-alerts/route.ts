import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/api/cron";
import { isAtRisk, sendBudgetAlert } from "@/lib/notifications/budget-alert";

export const dynamic = "force-dynamic";

/**
 * Daily safety net for the budget alert.
 *
 * The alert that matters fires from the click route on the exact click that
 * crosses 80% — the brand hears within seconds and can top up before delivery
 * stops. This sweep exists for the crossings that path cannot see:
 *
 *  - campaigns that crossed via CPA conversions rather than clicks
 *  - a crossing whose request died before the alert went out
 *
 * Daily rather than hourly because Vercel Hobby caps crons at one run a day.
 * That cadence is fine for a safety net and useless as a primary trigger,
 * which is exactly why the primary trigger lives on the click path. To run it
 * more often, point an external scheduler at this route with the CRON_SECRET
 * header — no plan upgrade needed.
 *
 * `sendBudgetAlert` is idempotent per campaign, so overlapping triggers and
 * repeat runs cannot double-send.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, budget, spent, cpc, cpa_amount, pricing_model")
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    console.error("[budget-alerts] campaign query failed:", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const atRisk = (campaigns || []).filter(isAtRisk);

  let sent = 0;
  for (const campaign of atRisk) {
    if ((await sendBudgetAlert(supabase, campaign.id)) === "sent") sent++;
  }

  return NextResponse.json({
    checked: campaigns?.length || 0,
    at_risk: atRisk.length,
    sent,
    // Most runs should report 0: the click path normally got there first.
    already_alerted: atRisk.length - sent,
  });
}
