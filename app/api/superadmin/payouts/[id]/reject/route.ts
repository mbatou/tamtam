import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get payout details for refund
  const { data: payout } = await supabase
    .from("payouts")
    .select("echo_id, amount")
    .eq("id", params.id)
    .eq("status", "pending")
    .single();

  if (!payout) {
    return NextResponse.json({ error: "Payout not found or not pending" }, { status: 404 });
  }

  // Mark as failed
  const { error } = await supabase
    .from("payouts")
    .update({ status: "failed", failure_reason: "Refusé par l'admin", completed_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to process payout" }, { status: 500 });
  }

  // Refund balance since it was debited at request time
  await supabase.rpc("increment_echo_balance", {
    p_echo_id: payout.echo_id,
    p_amount: payout.amount,
  });

  await logWalletTransaction({
    supabase,
    userId: payout.echo_id,
    amount: payout.amount,
    type: "withdrawal_refund",
    description: "Remboursement — retrait refusé par l'admin",
    sourceId: params.id,
    sourceType: "payout",
    createdBy: session.user.id,
  });

  return NextResponse.json({ success: true });
}
