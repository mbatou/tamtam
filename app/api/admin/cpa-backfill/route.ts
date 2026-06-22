import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { ECHO_CPA_SHARE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

const BACKFILL_CONVERSION_IDS = [
  "adb0a95e-312c-4e84-ad14-6a23ad1b2888",
  "3ecc27cd-f53c-4a61-b6bf-5def0f2227f1",
  "26ea1c97-1578-48d1-af41-b44fa4d213e2",
  "79af680a-66f5-4d98-abb3-9b24572ed18e",
  "ff51cc18-3e21-4a43-a33e-a62c647c4b1e",
  "34e9286e-582a-4008-abf8-4d8b0b2de81a",
];

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin;
  const results: Array<{
    id: string;
    success: boolean;
    error?: string;
    cpaAmount?: number;
    echoEarning?: number;
  }> = [];

  for (const conversionId of BACKFILL_CONVERSION_IDS) {
    const { data: conv } = await supabase
      .from("conversions")
      .select("id, campaign_id, echo_id, event, payment_status")
      .eq("id", conversionId)
      .single();

    if (!conv) {
      results.push({ id: conversionId, success: false, error: "Conversion not found" });
      continue;
    }

    if (conv.payment_status !== "none") {
      results.push({ id: conversionId, success: false, error: `Already ${conv.payment_status}` });
      continue;
    }

    if (!conv.campaign_id) {
      results.push({ id: conversionId, success: false, error: "No campaign_id" });
      continue;
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, pricing_model, cpa_amount, cpa_event, budget, spent, status, batteur_id")
      .eq("id", conv.campaign_id)
      .single();

    if (!campaign || campaign.pricing_model !== "cpa") {
      results.push({ id: conversionId, success: false, error: "Not a CPA campaign" });
      continue;
    }

    const cpaAmount = campaign.cpa_amount;
    const echoEarning = Math.floor((cpaAmount * ECHO_CPA_SHARE_PERCENT) / 100);

    const { data: rpcResult, error: rpcError } = await supabase.rpc("process_cpa_conversion", {
      p_conversion_id: conv.id,
      p_campaign_id: campaign.id,
      p_echo_id: conv.echo_id,
      p_cpa_amount: cpaAmount,
      p_echo_earning: echoEarning,
    });

    if (rpcError) {
      results.push({ id: conversionId, success: false, error: rpcError.message });
      continue;
    }

    if (rpcResult === true) {
      if (conv.echo_id) {
        await logWalletTransaction({
          supabase,
          userId: conv.echo_id,
          amount: echoEarning,
          type: "cpa_earning",
          description: `Conversion CPA backfill — ${conv.event}`,
          sourceId: campaign.id,
          sourceType: "campaign",
        });
      }

      results.push({ id: conversionId, success: true, cpaAmount, echoEarning });
    } else {
      results.push({ id: conversionId, success: false, error: "RPC returned false (budget or status check failed)" });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    processed: BACKFILL_CONVERSION_IDS.length,
    successful,
    failed,
    results,
    summary: {
      totalDebited: successful * 120,
      totalEchosPaid: successful * 90,
    },
  });
}
