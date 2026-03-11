import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
    .select("*")
    .eq("echo_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { amount, provider } = await request.json();
  if (!amount || !provider) {
    return NextResponse.json({ error: "Montant et fournisseur requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify user balance
  const { data: user } = await supabase
    .from("users")
    .select("balance")
    .eq("id", session.user.id)
    .single();

  if (!user || user.balance < amount) {
    return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  const { data, error } = await supabase.from("payouts").insert({
    echo_id: session.user.id,
    amount,
    provider,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
