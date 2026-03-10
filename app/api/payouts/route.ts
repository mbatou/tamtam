import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";

export async function GET() {
  const supabase = createClient();
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
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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

  const { data, error } = await supabase
    .from("payouts")
    .insert({
      echo_id: session.user.id,
      amount: user.balance,
      provider: user.mobile_money_provider,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
