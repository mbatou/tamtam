import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;

  // Parse date range from query params
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Build filtered queries
  let payoutsQuery = supabase.from("payouts").select("*, users!echo_id(name, phone)").order("created_at", { ascending: false }).limit(5000);
  let paymentsQuery = supabase.from("payments").select("*, users!user_id(name, company_name, role)").order("created_at", { ascending: false }).limit(100);
  let validClicksQuery = supabase.from("clicks").select("id", { count: "exact", head: true }).eq("is_valid", true);

  if (fromParam) {
    payoutsQuery = payoutsQuery.gte("created_at", fromParam);
    paymentsQuery = paymentsQuery.gte("created_at", fromParam);
    validClicksQuery = validClicksQuery.gte("created_at", fromParam);
  }
  if (toParam) {
    payoutsQuery = payoutsQuery.lte("created_at", toParam);
    paymentsQuery = paymentsQuery.lte("created_at", toParam);
    validClicksQuery = validClicksQuery.lte("created_at", toParam);
  }

  const [
    { data: campaigns },
    { data: payouts },
    { data: payments },
    { data: feeSetting },
    { count: validClicksCount },
  ] = await Promise.all([
    supabase.from("campaigns").select("id, title, spent, budget").limit(5000),
    payoutsQuery,
    paymentsQuery,
    supabase.from("platform_settings").select("value").eq("key", "platform_fee_percent").single(),
    validClicksQuery,
  ]);

  const feePercent = parseInt(feeSetting?.value || "25");
  const grossRevenue = (campaigns || []).reduce((s: number, c: { spent: number }) => s + (c.spent || 0), 0);
  const platformCut = Math.round(grossRevenue * feePercent / 100);
  const sentTotal = (payouts || []).filter((p: { status: string }) => p.status === "sent").reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const pendingTotal = (payouts || []).filter((p: { status: string }) => p.status === "pending").reduce((s: number, p: { amount: number }) => s + p.amount, 0);

  // Daily revenue chart — use date range if provided, otherwise current month
  const chartFrom = fromParam || (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString(); })();

  let dailyClicksQuery = supabase
    .from("clicks")
    .select("created_at")
    .eq("is_valid", true)
    .gte("created_at", chartFrom)
    .limit(50000);
  if (toParam) dailyClicksQuery = dailyClicksQuery.lte("created_at", toParam);

  const { data: monthlyClicks } = await dailyClicksQuery;

  // Group clicks by day and calculate commission per day
  const dailyMap: Record<string, { clicks: number }> = {};
  for (const click of monthlyClicks || []) {
    const day = click.created_at.split("T")[0];
    if (!dailyMap[day]) dailyMap[day] = { clicks: 0 };
    dailyMap[day].clicks++;
  }

  // Estimate avg CPC from campaigns, then calculate daily commission
  const avgCpc = grossRevenue > 0 && (validClicksCount || 0) > 0
    ? grossRevenue / (validClicksCount || 1)
    : 25;
  const dailyRevenue = Object.entries(dailyMap)
    .map(([date, d]) => ({
      date,
      clicks: d.clicks,
      revenue: Math.round(d.clicks * avgCpc * feePercent / 100),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    grossRevenue,
    platformCut,
    feePercent,
    sentTotal,
    pendingTotal,
    validClicks: validClicksCount || 0,
    payouts: payouts || [],
    payments: payments || [],
    dailyRevenue,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;
  const session = auth.session;
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

      await logWalletTransaction({
        supabase,
        userId: payment.user_id,
        amount: payment.amount,
        type: "wallet_recharge",
        description: `Recharge validée par admin`,
        sourceId: payment_id,
        sourceType: "payment",
        createdBy: session.user.id,
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
    // Balance already debited at request time — just mark as sent
    const { error } = await supabase
      .from("payouts")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", payout_id)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "reject") {
    // Refund balance since it was debited at request time
    const { data: payout } = await supabase
      .from("payouts")
      .select("echo_id, amount")
      .eq("id", payout_id)
      .eq("status", "pending")
      .single();

    if (!payout) return NextResponse.json({ error: "Payout not found or not pending" }, { status: 404 });

    const { error: updateErr } = await supabase
      .from("payouts")
      .update({ status: "failed", failure_reason: reason || "Refusé par l'admin", completed_at: new Date().toISOString() })
      .eq("id", payout_id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Refund the echo's balance
    await supabase.rpc("increment_echo_balance", {
      p_echo_id: payout.echo_id,
      p_amount: payout.amount,
    });

    await logWalletTransaction({
      supabase,
      userId: payout.echo_id,
      amount: payout.amount,
      type: "withdrawal_refund",
      description: `Remboursement — retrait refusé par l'admin`,
      sourceId: payout_id,
      sourceType: "payout",
      createdBy: session.user.id,
    });
  } else {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
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
