import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const userId = req.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id requis" }, { status: 400 });
  }

  // 1. User profile
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userErr || !user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // 2. Wallet transactions (all balance movements)
  const { data: walletTransactions } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  // 3. Payout requests
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("echo_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // 4. Payments (recharges, top-ups)
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // 5. Campaigns joined (via tracked_links)
  const { data: trackedLinks } = await supabase
    .from("tracked_links")
    .select("id, short_code, click_count, created_at, campaign_id, campaigns(id, title, status, cpc)")
    .eq("echo_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // 6. Campaigns created (if batteur)
  const { data: campaignsCreated } = await supabase
    .from("campaigns")
    .select("id, title, status, cpc, budget, spent, created_at")
    .eq("batteur_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // 7. Click stats
  let clickStats = { total: 0, valid: 0, fraud: 0 };
  try {
    const { data: clicks } = await supabase
      .from("clicks")
      .select("id, status")
      .in(
        "tracked_link_id",
        (trackedLinks || []).map((l) => l.id)
      );
    if (clicks) {
      clickStats = {
        total: clicks.length,
        valid: clicks.filter((c) => c.status === "valid").length,
        fraud: clicks.filter((c) => c.status === "fraud").length,
      };
    }
  } catch { /* clicks table may not exist */ }

  // 8. Gamification achievements
  let achievements: unknown[] = [];
  try {
    const { data } = await supabase
      .from("echo_achievements")
      .select("*, gamification_milestones(name, reward_fcfa, condition_type, condition_value)")
      .eq("echo_id", userId)
      .order("created_at", { ascending: false });
    achievements = data || [];
  } catch { /* table may not exist */ }

  // 9. Streak rewards
  let streakRewards: unknown[] = [];
  try {
    const { data } = await supabase
      .from("streak_rewards")
      .select("*")
      .eq("echo_id", userId)
      .order("created_at", { ascending: false });
    streakRewards = data || [];
  } catch { /* table may not exist */ }

  // 10. Streak data
  let streakData = null;
  try {
    const { data } = await supabase
      .from("echo_streaks")
      .select("*")
      .eq("echo_id", userId)
      .single();
    streakData = data;
  } catch { /* table may not exist */ }

  // 11. Referral info — who referred them and who they referred
  let referrer = null;
  if (user.referred_by) {
    const { data } = await supabase
      .from("users")
      .select("id, name, phone, role")
      .eq("id", user.referred_by)
      .single();
    referrer = data;
  }

  const { data: referrals } = await supabase
    .from("users")
    .select("id, name, phone, role, created_at")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // 12. Admin activity log for this user
  let adminActions: unknown[] = [];
  try {
    const { data } = await supabase
      .from("admin_activity_log")
      .select("*")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    adminActions = data || [];
  } catch { /* table may not exist */ }

  // 13. Supabase auth metadata (created_at from auth)
  let authUser = null;
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    if (data?.user) {
      authUser = {
        email: data.user.email,
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
        email_confirmed_at: data.user.email_confirmed_at,
      };
    }
  } catch { /* may fail */ }

  // Build timeline of all events
  const timeline: { time: string; type: string; description: string; amount?: number; details?: unknown }[] = [];

  // Account creation
  timeline.push({
    time: user.created_at,
    type: "account",
    description: `Compte créé avec le rôle "${user.role}"`,
  });

  // Wallet transactions
  for (const tx of walletTransactions || []) {
    timeline.push({
      time: tx.created_at,
      type: "wallet",
      description: tx.description || `Transaction ${tx.type}`,
      amount: tx.amount,
      details: { type: tx.type, status: tx.status },
    });
  }

  // Payments
  for (const p of payments || []) {
    timeline.push({
      time: p.created_at,
      type: "payment",
      description: `Paiement ${p.payment_method || ""} — ${p.status}`,
      amount: p.amount,
      details: { ref: p.ref_command, method: p.payment_method, status: p.status },
    });
  }

  // Payouts
  for (const p of payouts || []) {
    timeline.push({
      time: p.created_at,
      type: "payout",
      description: `Demande de retrait — ${p.status}${p.failure_reason ? ` (${p.failure_reason})` : ""}`,
      amount: -p.amount,
      details: { provider: p.provider, status: p.status, failure_reason: p.failure_reason },
    });
  }

  // Campaigns joined
  for (const l of trackedLinks || []) {
    const c = l.campaigns as unknown as { title: string; cpc: number } | null;
    timeline.push({
      time: l.created_at,
      type: "campaign_join",
      description: `A rejoint la campagne "${c?.title || "?"}"`,
      details: { clicks: l.click_count, cpc: c?.cpc },
    });
  }

  // Achievements
  for (const a of achievements as { created_at: string; reward_fcfa: number; gamification_milestones: { name: string; reward_fcfa: number } | null }[]) {
    timeline.push({
      time: a.created_at,
      type: "achievement",
      description: `Milestone atteint: ${a.gamification_milestones?.name || "?"}`,
      amount: a.reward_fcfa,
    });
  }

  // Streak rewards
  for (const s of streakRewards as { created_at: string; reward_fcfa: number; streak_count: number }[]) {
    timeline.push({
      time: s.created_at,
      type: "streak",
      description: `Récompense série ${s.streak_count} jours`,
      amount: s.reward_fcfa,
    });
  }

  // Admin actions
  for (const a of adminActions as { created_at: string; action: string; details: unknown }[]) {
    timeline.push({
      time: a.created_at,
      type: "admin",
      description: `Action admin: ${a.action}`,
      details: a.details,
    });
  }

  // Sort timeline by time descending
  timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Anomaly detection
  const anomalies: { severity: "high" | "medium" | "low"; message: string }[] = [];

  // Check: balance > 0 with no campaigns joined
  if (user.balance > 0 && (trackedLinks || []).length === 0 && user.role === "echo") {
    anomalies.push({
      severity: "high",
      message: `Solde de ${user.balance} FCFA sans aucune campagne rejointe`,
    });
  }

  // Check: welcome bonus given to echo user
  const welcomeBonus = (walletTransactions || []).find(
    (tx: { type: string; description: string }) => tx.type === "bonus" && tx.description?.includes("bienvenue")
  );
  if (welcomeBonus && user.role === "echo") {
    anomalies.push({
      severity: "high",
      message: `Bonus de bienvenue (${welcomeBonus.amount} FCFA) attribué à un echo — normalement réservé aux marques`,
    });
  }

  // Check: total_earned > expected from clicks
  const expectedEarnings = (trackedLinks || []).reduce((sum, l) => {
    const c = l.campaigns as unknown as { cpc: number } | null;
    return sum + (l.click_count || 0) * (c?.cpc || 0) * 0.75;
  }, 0);
  if (user.total_earned > expectedEarnings + 500 && user.role === "echo") {
    anomalies.push({
      severity: "medium",
      message: `Gains totaux (${user.total_earned} FCFA) supérieurs aux gains attendus (${Math.round(expectedEarnings)} FCFA)`,
    });
  }

  // Check: payout requested but no click activity
  const hasPayout = (payouts || []).length > 0;
  if (hasPayout && clickStats.total === 0 && user.role === "echo") {
    anomalies.push({
      severity: "high",
      message: "Demande de retrait sans aucun clic enregistré",
    });
  }

  // Check: balance set but no increment operations
  if (user.balance > 0 && (walletTransactions || []).length === 0 && (payments || []).length === 0) {
    anomalies.push({
      severity: "medium",
      message: "Solde non-nul sans aucune transaction enregistrée",
    });
  }

  return NextResponse.json({
    user,
    authUser,
    walletTransactions: walletTransactions || [],
    payouts: payouts || [],
    payments: payments || [],
    trackedLinks: trackedLinks || [],
    campaignsCreated: campaignsCreated || [],
    clickStats,
    achievements,
    streakRewards,
    streakData,
    referrer,
    referrals: referrals || [],
    adminActions,
    timeline,
    anomalies,
  });
}
