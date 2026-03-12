import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  // Get echo click stats
  const clickStats: Record<string, { total: number; valid: number; fraud: number; rate: number }> = {};
  try {
    const { data: stats } = await supabase.rpc("get_echo_click_stats");
    if (stats) {
      for (const s of stats) {
        clickStats[s.echo_id] = {
          total: s.total_clicks,
          valid: s.valid_clicks,
          fraud: s.fraud_clicks,
          rate: parseFloat(s.fraud_rate),
        };
      }
    }
  } catch {
    // RPC may not exist yet
  }

  const enriched = (users || []).map((u: Record<string, unknown>) => ({
    ...u,
    click_stats: clickStats[u.id as string] || { total: 0, valid: 0, fraud: 0, rate: 0 },
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const body = await request.json();
  const { user_id, action, reason } = body;

  if (!action) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // --- Create a brand user ---
  if (action === "create_batteur") {
    const { name, phone, city, email, password } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
    }

    // Create auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

    // Create profile in users table
    const { error: profileErr } = await supabase.from("users").insert({
      id: authUser.user.id,
      name,
      phone: phone || null,
      city: city || null,
      role: "batteur",
      balance: 0,
      total_earned: 0,
      status: "verified",
    });
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: "user_create_batteur",
      target_type: "user",
      target_id: authUser.user.id,
      details: { name, email },
    });

    return NextResponse.json({ success: true, user_id: authUser.user.id });
  }

  // --- Top up brand balance ---
  if (action === "topup") {
    const { amount } = body;
    if (!user_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, total_recharged, role, name")
      .eq("id", user_id)
      .single();

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (user.role !== "batteur") return NextResponse.json({ error: "L'utilisateur n'est pas un batteur" }, { status: 400 });

    const topupAmount = parseInt(amount);
    const newRecharged = (user.total_recharged || 0) + topupAmount;
    const { error: upErr } = await supabase
      .from("users")
      .update({ total_recharged: newRecharged })
      .eq("id", user_id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Log as a manual payment
    await supabase.from("payments").insert({
      user_id,
      amount: topupAmount,
      ref_command: `TOPUP-${Date.now()}`,
      status: "completed",
      payment_method: "admin_topup",
      completed_at: new Date().toISOString(),
    });

    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: "user_topup",
      target_type: "user",
      target_id: user_id,
      details: { amount: topupAmount, new_recharged: newRecharged, user_name: user.name },
    });

    return NextResponse.json({ success: true, new_recharged: newRecharged });
  }

  // --- Standard user actions ---
  if (!user_id || !action) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  switch (action) {
    case "verify":
      updates.status = "verified";
      updates.risk_level = "low";
      break;
    case "flag":
      updates.status = "flagged";
      updates.risk_level = "medium";
      break;
    case "suspend":
      updates.status = "suspended";
      break;
    case "reset_balance":
      updates.balance = 0;
      break;
    case "promote_admin":
      updates.role = "admin";
      break;
    case "promote_superadmin":
      updates.role = "superadmin";
      break;
    default:
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_activity_log").insert({
    admin_id: session.user.id,
    action: `user_${action}`,
    target_type: "user",
    target_id: user_id,
    details: { reason },
  });

  return NextResponse.json({ success: true });
}
