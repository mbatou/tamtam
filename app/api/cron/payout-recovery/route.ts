import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !process.env.CRON_SECRET) return false;
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expected)
  );
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: stuckPayouts, error } = await supabase
    .from("wave_payouts")
    .select("id, user_id, amount, payout_id, idempotency_key")
    .eq("payout_status", "processing")
    .lt("created_at", oneHourAgo);

  if (error) {
    console.error("[payout-recovery] Query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stuckPayouts || stuckPayouts.length === 0) {
    return NextResponse.json({ recovered: 0 });
  }

  let recovered = 0;

  for (const payout of stuckPayouts) {
    await supabase
      .from("wave_payouts")
      .update({ payout_status: "failed", error_message: "Stuck in processing > 1h — auto-recovered" })
      .eq("id", payout.id);

    if (payout.payout_id) {
      await supabase
        .from("payouts")
        .update({ status: "failed" })
        .eq("id", payout.payout_id);
    }

    const { data: refunded } = await supabase.rpc("refund_wallet_from_payout", {
      p_user_id: payout.user_id,
      p_amount: payout.amount,
      p_idempotency_key: payout.idempotency_key,
    });

    if (refunded) {
      await logWalletTransaction({
        supabase,
        userId: payout.user_id,
        amount: payout.amount,
        type: "withdrawal_refund",
        description: `Retrait bloqué > 1h — remboursement auto ${payout.amount} FCFA`,
        sourceId: payout.payout_id || payout.id,
        sourceType: "wave_payout",
      });
      recovered++;
    }
  }

  console.log(`[payout-recovery] Recovered ${recovered}/${stuckPayouts.length} stuck payouts`);

  return NextResponse.json({
    recovered,
    total_stuck: stuckPayouts.length,
    timestamp: new Date().toISOString(),
  });
}
