import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
  const echoId = session.user.id;

  const [userRes, streakRes, achievementsRes, milestonesRes, streakRewardsRes] =
    await Promise.all([
      supabase
        .from("users")
        .select(
          "tier, tier_bonus_percent, total_valid_clicks, total_campaigns_joined, referral_count"
        )
        .eq("id", echoId)
        .single(),
      supabase
        .from("echo_streaks")
        .select("current_streak, longest_streak, last_campaign_date")
        .eq("echo_id", echoId)
        .single(),
      supabase
        .from("echo_achievements")
        .select("milestone_id, reward_fcfa, achieved_at")
        .eq("echo_id", echoId),
      supabase
        .from("gamification_milestones")
        .select("*")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("streak_rewards")
        .select("streak_count, reward_fcfa, credited_at")
        .eq("echo_id", echoId)
        .order("credited_at", { ascending: false }),
    ]);

  return NextResponse.json({
    user: userRes.data,
    streak: streakRes.data || {
      current_streak: 0,
      longest_streak: 0,
      last_campaign_date: null,
    },
    achievements: achievementsRes.data || [],
    milestones: milestonesRes.data || [],
    streakRewards: streakRewardsRes.data || [],
  });
}
