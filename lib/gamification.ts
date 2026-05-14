import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWalletTransaction } from "@/lib/wallet-transactions";

// ---- TIER CONFIG ----

export const TIER_CONFIG = {
  echo:    { minClicks: 0,    bonusPercent: 0, label: "Écho" },
  argent:  { minClicks: 100,  bonusPercent: 1, label: "Argent" },
  or:      { minClicks: 500,  bonusPercent: 3, label: "Or" },
  diamant: { minClicks: 1000, bonusPercent: 5, label: "Diamant" },
} as const;

export const TIER_PERKS = {
  echo: {
    badge: false, priority_distribution: false, early_access: false, featured: false, direct_support: false,
    description: "Niveau de base",
  },
  argent: {
    badge: true, priority_distribution: false, early_access: false, featured: false, direct_support: false,
    description: "Badge Argent · Distribution standard",
  },
  or: {
    badge: true, priority_distribution: true, early_access: true, featured: false, direct_support: false,
    description: "Badge Or · Priorité distribution · Accès anticipé 24h",
  },
  diamant: {
    badge: true, priority_distribution: true, early_access: true, featured: true, direct_support: true,
    description: "Badge Diamant · Priorité · Accès anticipé · Profil en avant · Support direct",
  },
} as const;

// ---- STREAK MILESTONES (cycling) ----

const STREAK_MILESTONES = [
  { days: 7,  reward: 100,  label: "Semaine",   field: "week_reward_paid" },
  { days: 30, reward: 500,  label: "Mois",      field: "month_reward_paid" },
  { days: 90, reward: 2000, label: "Trimestre",  field: "quarter_reward_paid" },
] as const;

// ---- CAP SYSTEM ----

async function checkGamificationCaps(echoId: string, amount: number): Promise<boolean> {
  // 1. Check daily cap per echo (500F default)
  const { data: dailyCap } = await supabaseAdmin
    .from("gamification_caps")
    .select("max_amount_fcfa")
    .eq("cap_type", "daily_per_echo")
    .eq("is_active", true)
    .single();

  const dailyMax = dailyCap?.max_amount_fcfa || 500;
  const today = new Date().toISOString().split("T")[0];

  const { data: dailySpend } = await supabaseAdmin
    .from("streak_rewards")
    .select("reward_fcfa")
    .eq("echo_id", echoId)
    .gte("credited_at", today);

  const todayTotal = (dailySpend || []).reduce((sum: number, r: { reward_fcfa: number }) => sum + r.reward_fcfa, 0);

  if (todayTotal + amount > dailyMax) {
    console.warn(`[GAMIFICATION CAP] Daily limit for echo ${echoId}: ${todayTotal}F / ${dailyMax}F`);
    return false;
  }

  // 2. Check monthly platform cap (50000F default)
  const { data: monthlyCap } = await supabaseAdmin
    .from("gamification_caps")
    .select("max_amount_fcfa")
    .eq("cap_type", "monthly_platform")
    .eq("is_active", true)
    .single();

  const monthlyMax = monthlyCap?.max_amount_fcfa || 50000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthlySpend } = await supabaseAdmin
    .from("streak_rewards")
    .select("reward_fcfa")
    .gte("credited_at", monthStart.toISOString());

  const monthTotal = (monthlySpend || []).reduce((sum: number, r: { reward_fcfa: number }) => sum + r.reward_fcfa, 0);

  if (monthTotal + amount > monthlyMax) {
    console.warn(`[GAMIFICATION CAP] Monthly platform limit: ${monthTotal}F / ${monthlyMax}F`);
    return false;
  }

  return true;
}

// ---- STREAK LOGIC ----

export async function updateStreak(echoId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: streak } = await supabaseAdmin
    .from("echo_streaks")
    .select("*")
    .eq("echo_id", echoId)
    .single();

  // No streak record — create one
  if (!streak) {
    await supabaseAdmin.from("echo_streaks").insert({
      echo_id: echoId,
      current_streak: 1,
      longest_streak: 1,
      last_campaign_date: today,
      week_reward_paid: false,
      month_reward_paid: false,
      quarter_reward_paid: false,
      quarter_start_date: today,
    });
    return { streak: 1, rewards: [] };
  }

  // Already active today — return early
  if (streak.last_campaign_date === today) {
    return { streak: streak.current_streak, rewards: [] };
  }

  const lastDate = new Date(streak.last_campaign_date);
  const todayDate = new Date(today);
  const diffDays = Math.floor(
    (todayDate.getTime() - lastDate.getTime()) / 86400000
  );

  let newStreak: number;
  let weekPaid = streak.week_reward_paid;
  let monthPaid = streak.month_reward_paid;
  let quarterPaid = streak.quarter_reward_paid;
  let quarterStartDate = streak.quarter_start_date || today;

  if (diffDays === 1) {
    newStreak = streak.current_streak + 1;
  } else {
    // Streak broken — reset everything
    newStreak = 1;
    weekPaid = false;
    monthPaid = false;
    quarterPaid = false;
    quarterStartDate = today;
  }

  const longestStreak = Math.max(newStreak, streak.longest_streak);

  await supabaseAdmin
    .from("echo_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_campaign_date: today,
      streak_updated_at: new Date().toISOString(),
      week_reward_paid: weekPaid,
      month_reward_paid: monthPaid,
      quarter_reward_paid: quarterPaid,
      quarter_start_date: quarterStartDate,
    })
    .eq("echo_id", echoId);

  // Check milestones and pay rewards
  const paidRewards: Array<{ days: number; reward: number; label: string }> = [];

  for (const milestone of STREAK_MILESTONES) {
    const isPaid =
      milestone.field === "week_reward_paid" ? weekPaid :
      milestone.field === "month_reward_paid" ? monthPaid :
      quarterPaid;

    if (newStreak >= milestone.days && !isPaid) {
      // Check caps before paying
      const canPay = await checkGamificationCaps(echoId, milestone.reward);
      if (!canPay) continue;

      await supabaseAdmin.from("streak_rewards").insert({
        echo_id: echoId,
        streak_count: milestone.days,
        reward_fcfa: milestone.reward,
      });

      await supabaseAdmin.rpc("increment_echo_balance", {
        p_echo_id: echoId,
        p_amount: milestone.reward,
      });

      await logWalletTransaction({
        supabase: supabaseAdmin,
        userId: echoId,
        amount: milestone.reward,
        type: "streak_bonus",
        description: `Bonus de série ${milestone.label}: ${newStreak} jours consécutifs`,
        sourceType: "system",
      });

      // Mark as paid
      if (milestone.field === "week_reward_paid") weekPaid = true;
      else if (milestone.field === "month_reward_paid") monthPaid = true;
      else if (milestone.field === "quarter_reward_paid") quarterPaid = true;

      paidRewards.push({ days: milestone.days, reward: milestone.reward, label: milestone.label });
    }
  }

  // CYCLE RESET: After paying the 90-day reward, reset all reward flags
  // The streak counter keeps going — only the reward cycle resets.
  if (quarterPaid) {
    weekPaid = false;
    monthPaid = false;
    quarterPaid = false;
    quarterStartDate = today;
  }

  // Persist final reward flag state
  await supabaseAdmin
    .from("echo_streaks")
    .update({
      week_reward_paid: weekPaid,
      month_reward_paid: monthPaid,
      quarter_reward_paid: quarterPaid,
      quarter_start_date: quarterStartDate,
    })
    .eq("echo_id", echoId);

  return { streak: newStreak, rewards: paidRewards };
}

// ---- MILESTONE CHECKING ----

export async function checkMilestones(echoId: string) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("total_valid_clicks, total_campaigns_joined, referral_count")
    .eq("id", echoId)
    .single();

  if (!user) return [];

  const { data: streak } = await supabaseAdmin
    .from("echo_streaks")
    .select("current_streak")
    .eq("echo_id", echoId)
    .single();

  const { data: milestones } = await supabaseAdmin
    .from("gamification_milestones")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const { data: achieved } = await supabaseAdmin
    .from("echo_achievements")
    .select("milestone_id")
    .eq("echo_id", echoId);

  const achievedIds = new Set(achieved?.map((a) => a.milestone_id) || []);
  const newlyAchieved = [];

  for (const m of milestones || []) {
    if (achievedIds.has(m.id)) continue;

    let currentValue = 0;
    if (m.condition_type === "clicks")
      currentValue = user.total_valid_clicks || 0;
    else if (m.condition_type === "campaigns")
      currentValue = user.total_campaigns_joined || 0;
    else if (m.condition_type === "referrals")
      currentValue = user.referral_count || 0;
    else if (m.condition_type === "streak")
      currentValue = streak?.current_streak || 0;

    if (currentValue >= m.condition_value) {
      // Check caps before crediting
      const canPay = await checkGamificationCaps(echoId, m.reward_fcfa);
      if (!canPay) continue;

      await supabaseAdmin.from("echo_achievements").insert({
        echo_id: echoId,
        milestone_id: m.id,
        reward_fcfa: m.reward_fcfa,
        reward_credited: true,
      });

      await supabaseAdmin.rpc("increment_echo_balance", {
        p_echo_id: echoId,
        p_amount: m.reward_fcfa,
      });

      await logWalletTransaction({
        supabase: supabaseAdmin,
        userId: echoId,
        amount: m.reward_fcfa,
        type: "badge_reward",
        description: `Milestone atteint: ${m.name}`,
        sourceId: m.id,
        sourceType: "achievement",
      });

      newlyAchieved.push(m);
    }
  }

  return newlyAchieved;
}

// ---- TIER UPDATE ----

export async function updateTier(echoId: string) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("total_valid_clicks, tier")
    .eq("id", echoId)
    .single();

  if (!user) return null;

  const clicks = user.total_valid_clicks || 0;
  let newTier: keyof typeof TIER_CONFIG = "echo";
  if (clicks >= TIER_CONFIG.diamant.minClicks) newTier = "diamant";
  else if (clicks >= TIER_CONFIG.or.minClicks) newTier = "or";
  else if (clicks >= TIER_CONFIG.argent.minClicks) newTier = "argent";

  if (newTier !== user.tier) {
    const bonusPercent = TIER_CONFIG[newTier].bonusPercent;
    const perks = TIER_PERKS[newTier];

    await supabaseAdmin
      .from("users")
      .update({ tier: newTier, tier_bonus_percent: bonusPercent, tier_perks: perks })
      .eq("id", echoId);

    return { previousTier: user.tier, newTier };
  }

  return null;
}

// ---- REFERRAL BONUS ----

export async function processReferralBonus(referrerEchoId: string, newEchoId: string) {
  // 1. Check if new echo has accepted first campaign
  const { count } = await supabaseAdmin
    .from("tracked_links")
    .select("id", { count: "exact", head: true })
    .eq("echo_id", newEchoId);

  if (!count || count === 0) return;

  // 2. Dedup — check for existing referral reward via wallet_transactions
  const { data: existingTx } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", referrerEchoId)
    .eq("type", "referral_bonus")
    .eq("source_id", newEchoId)
    .maybeSingle();

  if (existingTx) return;

  // 3. Check caps
  const canPay = await checkGamificationCaps(referrerEchoId, 200);
  if (!canPay) return;

  // 4. Pay 200F referral bonus
  await supabaseAdmin.rpc("increment_echo_balance", {
    p_echo_id: referrerEchoId,
    p_amount: 200,
  });

  await logWalletTransaction({
    supabase: supabaseAdmin,
    userId: referrerEchoId,
    amount: 200,
    type: "referral_bonus",
    description: "Bonus parrainage — nouvel Écho activé",
    sourceId: newEchoId,
    sourceType: "referral",
  });

  // 5. Increment successful_referrals
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("successful_referrals")
    .eq("id", referrerEchoId)
    .single();

  await supabaseAdmin
    .from("users")
    .update({ successful_referrals: (user?.successful_referrals || 0) + 1 })
    .eq("id", referrerEchoId);
}

// ---- WEEKLY LEADERBOARD DATA ----

export async function getWeeklyLeaderboardData() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: rankings } = await supabaseAdmin.rpc("get_leaderboard", {
    since_date: weekAgo.toISOString(),
    limit_count: 50,
  });

  if (!rankings || rankings.length === 0) return [];

  interface RankingRow { echo_id: string; total_clicks: number }
  interface UserRow { id: string; name: string; phone: string; leaderboard_notify: boolean }

  const echoIds = (rankings as RankingRow[]).map((r) => r.echo_id);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, phone, leaderboard_notify")
    .in("id", echoIds)
    .eq("leaderboard_notify", true);

  const userMap = new Map((users || []).map((u: UserRow) => [u.id, u]));

  return (rankings as RankingRow[]).map((r, i: number) => {
    const user = userMap.get(r.echo_id);
    if (!user) return null;
    const nextRank = i > 0 ? (rankings as RankingRow[])[i - 1] : null;
    return {
      echoId: r.echo_id,
      name: user.name,
      phone: user.phone,
      rank: i + 1,
      weeklyClicks: r.total_clicks,
      clicksToNextRank: nextRank ? nextRank.total_clicks - r.total_clicks : 0,
    };
  }).filter(Boolean);
}

// ---- MASTER FUNCTION: Call after every valid click ----

export async function processGamification(echoId: string) {
  const [streakResult, newMilestones, tierChange] = await Promise.all([
    updateStreak(echoId),
    checkMilestones(echoId),
    updateTier(echoId),
  ]);

  return { streak: streakResult, milestones: newMilestones, tierChange };
}
