import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { normalizeCity } from "@/lib/cities";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Parse query params
  const url = new URL(request.url);
  const role = url.searchParams.get("role") || "all";
  const status = url.searchParams.get("status") || "all";
  const activity = url.searchParams.get("activity") || "all";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "30");
  const offset = (page - 1) * limit;

  // --- Stats counts (parallel, head-only = no data transfer) ---
  const [echoCount, batteurCount, flaggedCount, totalPaidResult] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("role", "echo").is("deleted_at", null),
    supabase.from("users").select("*", { count: "exact", head: true })
      .in("role", ["batteur", "brand"]).is("deleted_at", null),
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("status", "flagged").is("deleted_at", null),
    supabase.from("wallet_transactions").select("amount")
      .in("type", ["withdrawal", "payout", "echo_payout"])
      .gt("amount", 0),
  ]);

  const totalPaid = (totalPaidResult.data || []).reduce(
    (s: number, t: { amount: number }) => s + Math.abs(Number(t.amount) || 0), 0
  );

  // --- Tab counts (parallel) ---
  const [allCount, verifiedCount, suspendedCount] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .not("role", "eq", "superadmin"),
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("status", "verified").is("deleted_at", null)
      .not("role", "eq", "superadmin"),
    supabase.from("users").select("*", { count: "exact", head: true })
      .eq("status", "suspended").is("deleted_at", null)
      .not("role", "eq", "superadmin"),
  ]);

  // --- Build filtered query ---
  let query = supabase
    .from("users")
    .select(
      "id, name, phone, city, role, status, risk_level, balance, total_earned, mobile_money_provider, created_at, referral_count, referred_by, referral_code",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .not("role", "eq", "superadmin");

  // Role filter
  if (role === "echo") query = query.eq("role", "echo");
  else if (role === "batteur") query = query.in("role", ["batteur", "brand"]);

  // Status filter
  if (status === "verified") query = query.eq("status", "verified");
  else if (status === "flagged") query = query.eq("status", "flagged");
  else if (status === "suspended") query = query.eq("status", "suspended");

  // Search
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`);
  }

  // Paginate
  const { data: users, count: filteredCount } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const userIds = (users || []).map((u) => u.id);

  // --- Enrichment: only for current page users ---
  // Click stats via RPC
  const clickStats: Record<string, { total: number; valid: number; fraud: number; rate: number }> = {};
  try {
    const { data: stats } = await supabase.rpc("get_echo_click_stats");
    if (stats) {
      for (const s of stats) {
        if (userIds.includes(s.echo_id)) {
          clickStats[s.echo_id] = {
            total: s.total_clicks,
            valid: s.valid_clicks,
            fraud: s.fraud_clicks,
            rate: parseFloat(s.fraud_rate),
          };
        }
      }
    }
  } catch {
    // RPC may not exist yet
  }

  // Dual-role detection + campaigns joined + last click (only for current page)
  const echoUserIds = new Set<string>();
  const batteurUserIds = new Set<string>();
  const lastClickMap: Record<string, string> = {};
  const campaignsJoinedMap: Record<string, number> = {};

  if (userIds.length > 0) {
    try {
      const { data: echoLinks } = await supabase
        .from("tracked_links")
        .select("echo_id, campaign_id")
        .in("echo_id", userIds);
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

      const { data: batteurCampaigns } = await supabase
        .from("campaigns")
        .select("batteur_id")
        .in("batteur_id", userIds);
      if (batteurCampaigns) batteurCampaigns.forEach((c) => batteurUserIds.add(c.batteur_id));

      // Last click per echo
      const { data: lastClicks } = await supabase
        .from("tracked_links")
        .select("echo_id, clicks(created_at)")
        .in("echo_id", userIds)
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
  }

  // Activity filter — applied post-enrichment since it depends on click_stats
  let enriched = (users || []).map((u) => ({
    ...u,
    click_stats: clickStats[u.id] || { total: 0, valid: 0, fraud: 0, rate: 0 },
    has_echo_activity: echoUserIds.has(u.id),
    has_batteur_activity: batteurUserIds.has(u.id),
    is_dual_role: echoUserIds.has(u.id) && batteurUserIds.has(u.id),
    last_click_at: lastClickMap[u.id] || null,
    campaigns_joined: campaignsJoinedMap[u.id] || 0,
    current_streak: 0,
  }));

  // Streak data
  try {
    const { data: streaks } = await supabase
      .from("echo_streaks")
      .select("echo_id, current_streak")
      .in("echo_id", userIds);
    if (streaks) {
      const streakMap: Record<string, number> = {};
      for (const s of streaks) streakMap[s.echo_id] = s.current_streak || 0;
      enriched = enriched.map((u) => ({ ...u, current_streak: streakMap[u.id] || 0 }));
    }
  } catch {
    // echo_streaks may not exist yet
  }

  return NextResponse.json({
    stats: {
      totalEchos: echoCount.count || 0,
      totalBrands: batteurCount.count || 0,
      flagged: flaggedCount.count || 0,
      totalPaid: Math.round(totalPaid),
    },
    tabs: {
      all: allCount.count || 0,
      verified: verifiedCount.count || 0,
      flagged: flaggedCount.count || 0,
      suspended: suspendedCount.count || 0,
    },
    users: enriched,
    total: filteredCount || 0,
    page,
    limit,
  });
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
