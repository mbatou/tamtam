import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---- STREAK LOGIC ----

const STREAK_REWARDS: Record<number, number> = {
  3: 100,
  5: 250,
  7: 500,
  10: 1000,
};

export async function updateStreak(echoId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: streak } = await supabaseAdmin
    .from("echo_streaks")
    .select("*")
    .eq("echo_id", echoId)
    .single();

  if (!streak) {
    await supabaseAdmin.from("echo_streaks").insert({
      echo_id: echoId,
      current_streak: 1,
      longest_streak: 1,
      last_campaign_date: today,
    });
    return { streak: 1, reward: null };
  }

  if (streak.last_campaign_date === today) {
    return { streak: streak.current_streak, reward: null };
  }

  const lastDate = new Date(streak.last_campaign_date);
  const todayDate = new Date(today);
  const diffDays = Math.floor(
    (todayDate.getTime() - lastDate.getTime()) / 86400000
  );

  let newStreak: number;
  if (diffDays === 1) {
    newStreak = streak.current_streak + 1;
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, streak.longest_streak);

  await supabaseAdmin
    .from("echo_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_campaign_date: today,
      streak_updated_at: new Date().toISOString(),
    })
    .eq("echo_id", echoId);

  let reward = null;
  if (STREAK_REWARDS[newStreak]) {
    const { data: existing } = await supabaseAdmin
      .from("streak_rewards")
      .select("id")
      .eq("echo_id", echoId)
      .eq("streak_count", newStreak)
      .limit(1);

    if (!existing?.length) {
      reward = STREAK_REWARDS[newStreak];
      await supabaseAdmin.from("streak_rewards").insert({
        echo_id: echoId,
        streak_count: newStreak,
        reward_fcfa: reward,
      });
      await supabaseAdmin.rpc("increment_echo_balance", {
        p_echo_id: echoId,
        p_amount: reward,
      });
    }
  }

  return { streak: newStreak, reward };
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

  let newTier = "echo";
  const clicks = user.total_valid_clicks || 0;
  if (clicks >= 1000) newTier = "diamant";
  else if (clicks >= 500) newTier = "or";
  else if (clicks >= 100) newTier = "argent";

  if (newTier !== user.tier) {
    let bonusPercent = 0;
    if (newTier === "argent") bonusPercent = 5;
    else if (newTier === "or") bonusPercent = 10;
    else if (newTier === "diamant") bonusPercent = 15;

    await supabaseAdmin
      .from("users")
      .update({ tier: newTier, tier_bonus_percent: bonusPercent })
      .eq("id", echoId);

    return { previousTier: user.tier, newTier };
  }

  return null;
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
