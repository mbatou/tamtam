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

  const { data: pending, error } = await supabase
    .from("conversions")
    .select("id, campaign_id, echo_id, event, payment_amount, echo_earning")
    .eq("payment_status", "pending")
    .not("campaign_id", "is", null)
    .not("echo_id", "is", null)
    .limit(100);

  if (error || !pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, message: error?.message || "No pending conversions" });
  }

  let processed = 0;
  let failed = 0;

  for (const conv of pending) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("pricing_model, cpa_amount, cpa_event, budget, spent, status")
      .eq("id", conv.campaign_id)
      .single();

    if (!campaign || campaign.pricing_model !== "cpa") {
      await supabase.from("conversions").update({ payment_status: "none" }).eq("id", conv.id);
      continue;
    }

    if (campaign.cpa_event !== conv.event) {
      await supabase.from("conversions").update({ payment_status: "none" }).eq("id", conv.id);
      continue;
    }

    if (campaign.status !== "active") {
      await supabase.from("conversions").update({ payment_status: "failed" }).eq("id", conv.id);
      failed++;
      continue;
    }

    const cpaAmount = campaign.cpa_amount || conv.payment_amount;
    const echoEarning = conv.echo_earning || Math.floor((cpaAmount * ECHO_CPA_SHARE_PERCENT) / 100);
    const remaining = campaign.budget - (campaign.spent || 0);

    if (remaining < cpaAmount) {
      await supabase.from("conversions").update({ payment_status: "failed" }).eq("id", conv.id);
      failed++;
      continue;
    }

    const { data: rpcResult } = await supabase.rpc("process_cpa_conversion", {
      p_conversion_id: conv.id,
      p_campaign_id: conv.campaign_id,
      p_echo_id: conv.echo_id,
      p_cpa_amount: cpaAmount,
      p_echo_earning: echoEarning,
    });

    if (rpcResult === true) {
      processed++;
      logWalletTransaction({
        supabase,
        userId: conv.echo_id,
        amount: echoEarning,
        type: "click_earning",
        description: `Conversion CPA — ${conv.event}`,
        sourceId: conv.campaign_id,
        sourceType: "campaign",
      }).catch(console.error);

      const newRemaining = remaining - cpaAmount;
      if (newRemaining < cpaAmount) {
        await supabase
          .from("campaigns")
          .update({ status: "completed" })
          .eq("id", conv.campaign_id)
          .eq("status", "active");
      }
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    processed,
    failed,
    total: pending.length,
  });
}
