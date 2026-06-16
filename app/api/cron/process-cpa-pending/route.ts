import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { ECHO_CPA_SHARE_PERCENT } from "@/lib/constants";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || !process.env.CRON_SECRET) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin;

  // Find all CPA campaigns
  const { data: cpaCampaigns } = await supabase
    .from("campaigns")
    .select("id, pricing_model, cpa_amount, cpa_event, budget, spent, status")
    .eq("pricing_model", "cpa")
    .in("status", ["active", "paused"]);

  if (!cpaCampaigns || cpaCampaigns.length === 0) {
    return NextResponse.json({ processed: 0, message: "No CPA campaigns found" });
  }

  let processed = 0;
  let failed = 0;
  const skipped = 0;
  let total = 0;

  for (const campaign of cpaCampaigns) {
    if (!campaign.cpa_event || !campaign.cpa_amount) continue;

    // Find attributed conversions for this campaign that match the CPA event and haven't been paid
    const { data: unpaid } = await supabase
      .from("conversions")
      .select("id, campaign_id, echo_id, event, payment_status, payment_amount, echo_earning")
      .eq("campaign_id", campaign.id)
      .eq("event", campaign.cpa_event)
      .eq("attributed", true)
      .in("payment_status", ["none", "pending"])
      .not("echo_id", "is", null)
      .limit(200);

    if (!unpaid || unpaid.length === 0) continue;
    total += unpaid.length;

    for (const conv of unpaid) {
      if (campaign.status !== "active") {
        await supabase.from("conversions").update({ payment_status: "failed" }).eq("id", conv.id);
        failed++;
        continue;
      }

      const cpaAmount = campaign.cpa_amount;
      const echoEarning = Math.floor((cpaAmount * ECHO_CPA_SHARE_PERCENT) / 100);

      // Re-read campaign spent to get current value
      const { data: fresh } = await supabase
        .from("campaigns")
        .select("spent, status")
        .eq("id", campaign.id)
        .single();

      if (!fresh || fresh.status !== "active") {
        await supabase.from("conversions").update({ payment_status: "failed" }).eq("id", conv.id);
        failed++;
        continue;
      }

      const remaining = campaign.budget - (fresh.spent || 0);
      if (remaining < cpaAmount) {
        await supabase.from("conversions").update({ payment_status: "failed" }).eq("id", conv.id);
        failed++;
        continue;
      }

      const { data: rpcResult } = await supabase.rpc("process_cpa_conversion", {
        p_conversion_id: conv.id,
        p_campaign_id: campaign.id,
        p_echo_id: conv.echo_id,
        p_cpa_amount: cpaAmount,
        p_echo_earning: echoEarning,
      });

      if (rpcResult === true) {
        processed++;
        logWalletTransaction({
          supabase,
          userId: conv.echo_id!,
          amount: echoEarning,
          type: "click_earning",
          description: `Conversion CPA — ${conv.event}`,
          sourceId: campaign.id,
          sourceType: "campaign",
        }).catch(console.error);

        const newRemaining = remaining - cpaAmount;
        if (newRemaining < cpaAmount) {
          await supabase
            .from("campaigns")
            .update({ status: "completed" })
            .eq("id", campaign.id)
            .eq("status", "active");
        }
      } else {
        failed++;
      }
    }
  }

  return NextResponse.json({ processed, failed, skipped, total });
}
