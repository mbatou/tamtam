import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  const body = await request.json();

  // ===== RECHARGE VALIDATION (Wave payments) =====
  if (body.payment_id && body.action) {
    const { payment_id, action: paymentAction } = body;

    if (paymentAction === "validate") {
      // Get the payment record
      const { data: payment, error: fetchError } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .single();

      if (fetchError || !payment) {
        return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
      }

      if (payment.status !== "pending") {
        return NextResponse.json({ error: "Ce paiement a déjà été traité" }, { status: 400 });
      }

      // Mark payment as completed
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", payment_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Credit the user's balance
      await supabase.rpc("increment_balance", {
        p_user_id: payment.user_id,
        p_amount: payment.amount,
      });

      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: session.user.id,
          action: "recharge_validated",
          target_type: "payment",
          target_id: payment_id,
          details: { amount: payment.amount, user_id: payment.user_id },
        });
      } catch { /* admin_activity_log may not exist yet */ }

      return NextResponse.json({ success: true });
    } else if (paymentAction === "reject") {
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: session.user.id,
          action: "recharge_rejected",
          target_type: "payment",
          target_id: payment_id,
          details: { reason: body.reason },
        });
      } catch { /* admin_activity_log may not exist yet */ }

      return NextResponse.json({ success: true });
    }
  }

  // ===== PAYOUT ACTIONS =====
  const { payout_id, action, reason } = body;

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

  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: `payout_${action}`,
      target_type: "payout",
      target_id: payout_id,
      details: { reason },
    });
  } catch { /* admin_activity_log may not exist yet */ }

  return NextResponse.json({ success: true });
}
