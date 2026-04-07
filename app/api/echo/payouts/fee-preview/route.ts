import { NextRequest, NextResponse } from "next/server";
import { calculatePayoutFee, WAVE_PAYOUT_FEE_PERCENT } from "@/lib/wave";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const amount = parseInt(request.nextUrl.searchParams.get("amount") || "0");

  if (!amount || amount < 500) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const { fee, netAmount } = calculatePayoutFee(amount);

  return NextResponse.json({
    amount,
    fee,
    fee_percent: WAVE_PAYOUT_FEE_PERCENT,
    net_amount: netAmount,
    provider: "wave",
  });
}
