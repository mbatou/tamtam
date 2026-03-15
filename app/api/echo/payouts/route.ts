import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { payoutRequestSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { sendPayoutRequestNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

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

  const { allowed } = rateLimit(`payout:${session.user.id}`, 3, 86400000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de demandes de retrait. Réessaie demain." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = payoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Validate multiple of 5
  if (parsed.data.amount % 5 !== 0) {
    return NextResponse.json({ error: "Le montant doit être un multiple de 5" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch dynamic min payout setting
  const { data: minPayoutSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "min_payout_fcfa")
    .single();
  const minPayout = parseInt(minPayoutSetting?.value || "1000") || 1000;

  if (parsed.data.amount < minPayout) {
    return NextResponse.json({ error: `Montant minimum: ${minPayout} FCFA` }, { status: 400 });
  }

  // Verify user balance
  const { data: user } = await supabase
    .from("users")
    .select("balance")
    .eq("id", session.user.id)
    .single();

  if (!user || user.balance < parsed.data.amount) {
    return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  // Debit balance immediately
  const newBalance = user.balance - parsed.data.amount;
  const { error: balanceError } = await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("id", session.user.id);

  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  const { data, error } = await supabase.from("payouts").insert({
    echo_id: session.user.id,
    amount: parsed.data.amount,
    provider: parsed.data.provider,
  }).select().single();

  if (error) {
    // Rollback balance if payout creation fails
    await supabase
      .from("users")
      .update({ balance: user.balance })
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
    amount: parsed.data.amount,
    provider: parsed.data.provider || "wave",
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
