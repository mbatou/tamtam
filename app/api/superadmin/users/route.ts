import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { normalizeCity } from "@/lib/cities";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .is("deleted_at", null)
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

  // Detect dual-role users: echo activity (tracked_links) and batteur activity (campaigns created)
  const echoUserIds = new Set<string>();
  const batteurUserIds = new Set<string>();
  // Last click timestamp per echo (via tracked_links → clicks)
  const lastClickMap: Record<string, string> = {};
  // Campaigns joined per echo (count of tracked_links per echo, grouped by campaign)
  const campaignsJoinedMap: Record<string, number> = {};
  try {
    const { data: echoLinks } = await supabase.from("tracked_links").select("echo_id, campaign_id").limit(50000);
    if (echoLinks) {
      const echoCampaignSets: Record<string, Set<string>> = {};
      echoLinks.forEach((l) => {
        echoUserIds.add(l.echo_id);
        if (!echoCampaignSets[l.echo_id]) echoCampaignSets[l.echo_id] = new Set();
        echoCampaignSets[l.echo_id].add(l.campaign_id);
      });
      for (const [echoId, campaigns] of Object.entries(echoCampaignSets)) {
        campaignsJoinedMap[echoId] = campaigns.size;
      }
    }

    const { data: batteurCampaigns } = await supabase.from("campaigns").select("batteur_id").limit(5000);
    if (batteurCampaigns) batteurCampaigns.forEach((c) => batteurUserIds.add(c.batteur_id));

    // Get most recent click per echo via tracked_links
    const { data: lastClicks } = await supabase
      .from("tracked_links")
      .select("echo_id, clicks(created_at)")
      .order("created_at", { ascending: false, referencedTable: "clicks" })
      .limit(1, { referencedTable: "clicks" });
    if (lastClicks) {
      for (const link of lastClicks) {
        const clickArr = link.clicks as unknown as { created_at: string }[];
        if (clickArr && clickArr.length > 0) {
          const clickDate = clickArr[0].created_at;
          if (!lastClickMap[link.echo_id] || clickDate > lastClickMap[link.echo_id]) {
            lastClickMap[link.echo_id] = clickDate;
          }
        }
      }
    }
  } catch {
    // tables may not exist yet
  }

  // Get streak data per echo
  const streakMap: Record<string, number> = {};
  try {
    const { data: streaks } = await supabase.from("echo_streaks").select("echo_id, current_streak");
    if (streaks) {
      for (const s of streaks) {
        streakMap[s.echo_id] = s.current_streak || 0;
      }
    }
  } catch {
    // echo_streaks may not exist yet
  }

  const enriched = (users || []).map((u: Record<string, unknown>) => ({
    ...u,
    click_stats: clickStats[u.id as string] || { total: 0, valid: 0, fraud: 0, rate: 0 },
    has_echo_activity: echoUserIds.has(u.id as string),
    has_batteur_activity: batteurUserIds.has(u.id as string),
    is_dual_role: echoUserIds.has(u.id as string) && batteurUserIds.has(u.id as string),
    last_click_at: lastClickMap[u.id as string] || null,
    campaigns_joined: campaignsJoinedMap[u.id as string] || 0,
    current_streak: streakMap[u.id as string] || 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: adminCheck } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!adminCheck || adminCheck.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, action, reason } = body;

  if (!action) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // --- Create a brand user ---
  if (action === "create_batteur") {
    const { name, phone, email, password } = body;
    const city = normalizeCity(body.city);
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

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "user_create_batteur",
        target_type: "user",
        target_id: authUser.user.id,
        details: { name, email },
      });
    } catch { /* admin_activity_log may not exist yet */ }

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
      .select("id, balance, role, name")
      .eq("id", user_id)
      .single();

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (user.role === "echo") return NextResponse.json({ error: "Les echos ne peuvent pas être rechargés directement" }, { status: 400 });

    const topupAmount = parseInt(amount);
    const newBalance = (user.balance || 0) + topupAmount;
    const { error: upErr } = await supabase
      .from("users")
      .update({ balance: newBalance })
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

    await logWalletTransaction({
      supabase,
      userId: user_id,
      amount: topupAmount,
      type: "manual_credit",
      description: `Recharge manuelle par admin — ${user.name || "utilisateur"}`,
      sourceType: "admin",
      createdBy: session.user.id,
    });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "user_topup",
        target_type: "user",
        target_id: user_id,
        details: { amount: topupAmount, new_balance: newBalance, user_name: user.name },
      });
    } catch { /* admin_activity_log may not exist yet */ }

    return NextResponse.json({ success: true, new_balance: newBalance });
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

  // For reset_balance, get current balance before reset to log it
  if (action === "reset_balance") {
    const { data: targetUser } = await supabase.from("users").select("balance, name").eq("id", user_id).single();
    if (targetUser && (targetUser.balance || 0) > 0) {
      // Log will be recorded after the update succeeds
      const oldBalance = targetUser.balance || 0;
      const { error: resetErr } = await supabase.from("users").update({ balance: 0 }).eq("id", user_id);
      if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 });

      await logWalletTransaction({
        supabase,
        userId: user_id,
        amount: -oldBalance,
        type: "balance_reset",
        description: `Remise à zéro du solde par admin (ancien solde: ${oldBalance} FCFA)`,
        sourceType: "admin",
        createdBy: session.user.id,
      });

      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: session.user.id,
          action: `user_${action}`,
          target_type: "user",
          target_id: user_id,
          details: { reason, old_balance: oldBalance },
        });
      } catch { /* admin_activity_log may not exist yet */ }

      return NextResponse.json({ success: true });
    }
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: `user_${action}`,
      target_type: "user",
      target_id: user_id,
      details: { reason },
    });
  } catch { /* admin_activity_log may not exist yet */ }

  return NextResponse.json({ success: true });
}
