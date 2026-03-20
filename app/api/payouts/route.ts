import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { sendPayoutRequestNotification } from "@/lib/email";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*, users(name, phone)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { allowed } = rateLimit(`payout:${session.user.id}`, 3, 86400000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de demandes de retrait. Réessaie demain." }, { status: 429 });
  }

  const supabase = createServiceClient();

  // Get user balance
  const { data: user } = await supabase
    .from("users")
    .select("balance, mobile_money_provider")
    .eq("id", session.user.id)
    .single();

  if (!user || user.balance < MIN_PAYOUT_AMOUNT) {
    return NextResponse.json(
      { error: `Solde minimum requis: ${MIN_PAYOUT_AMOUNT} FCFA` },
      { status: 400 }
    );
  }

  // Check for pending payout
  const { data: pendingPayout } = await supabase
    .from("payouts")
    .select("id")
    .eq("echo_id", session.user.id)
    .eq("status", "pending")
    .single();

  if (pendingPayout) {
    return NextResponse.json(
      { error: "Un retrait est déjà en attente" },
      { status: 400 }
    );
  }

  const withdrawAmount = user.balance;

  // Debit balance immediately
  const { error: balanceError } = await supabase
    .from("users")
    .update({ balance: 0 })
    .eq("id", session.user.id);

  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  await logWalletTransaction({
    supabase,
    userId: session.user.id,
    amount: -withdrawAmount,
    type: "withdrawal",
    description: `Retrait total du solde — ${user.mobile_money_provider || "mobile money"}`,
    sourceType: "payout",
  });

  const { data, error } = await supabase
    .from("payouts")
    .insert({
      echo_id: session.user.id,
      amount: withdrawAmount,
      provider: user.mobile_money_provider,
    })
    .select()
    .single();

  if (error) {
    // Rollback balance
    await supabase
      .from("users")
      .update({ balance: withdrawAmount })
      .eq("id", session.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify admin by email
  const { data: echoUser } = await supabase
    .from("users")
    .select("name, phone")
    .eq("id", session.user.id)
    .single();

  sendPayoutRequestNotification({
    echoName: echoUser?.name || "Inconnu",
    echoPhone: echoUser?.phone || "",
    amount: withdrawAmount,
    provider: user.mobile_money_provider || "wave",
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
