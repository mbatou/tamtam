import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const [
    { data: campaigns },
    { data: payouts },
    { data: payments },
    { data: feeSetting },
  ] = await Promise.all([
    supabase.from("campaigns").select("id, title, spent, budget"),
    supabase.from("payouts").select("*, users!echo_id(name, phone)").order("created_at", { ascending: false }),
    supabase.from("payments").select("*, users!user_id(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("platform_settings").select("value").eq("key", "platform_fee_percent").single(),
  ]);

  const feePercent = parseInt(feeSetting?.value || "25");
  const grossRevenue = (campaigns || []).reduce((s: number, c: { spent: number }) => s + (c.spent || 0), 0);
  const platformCut = Math.round(grossRevenue * feePercent / 100);
  const sentTotal = (payouts || []).filter((p: { status: string }) => p.status === "sent").reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const pendingTotal = (payouts || []).filter((p: { status: string }) => p.status === "pending").reduce((s: number, p: { amount: number }) => s + p.amount, 0);

  return NextResponse.json({
    grossRevenue,
    platformCut,
    feePercent,
    sentTotal,
    pendingTotal,
    payouts: payouts || [],
    payments: payments || [],
  });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { payout_id, action, reason } = await request.json();

  if (!payout_id || !action) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  if (action === "approve") {
    const { error } = await supabase.rpc("process_payout", {
      p_payout_id: payout_id,
      p_status: "sent",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "reject") {
    const { error } = await supabase.rpc("process_payout", {
      p_payout_id: payout_id,
      p_status: "failed",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_activity_log").insert({
    admin_id: session.user.id,
    action: `payout_${action}`,
    target_type: "payout",
    target_id: payout_id,
    details: { reason },
  });

  return NextResponse.json({ success: true });
}
