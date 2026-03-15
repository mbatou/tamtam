import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkMilestones } from "@/lib/gamification";

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

  // Self-heal: check milestones on load to credit any missing badges
  try {
    await checkMilestones(echoId);
  } catch {
    // Non-critical — continue loading data
  }

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

  // Self-heal: if no streak record exists but user has accepted campaigns, create one
  let streakData = streakRes.data;
  if (!streakData) {
    try {
      const { data: latestLink } = await supabase
        .from("tracked_links")
        .select("created_at")
        .eq("echo_id", echoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestLink) {
        const lastDate = new Date(latestLink.created_at).toISOString().split("T")[0];
        const { data: inserted } = await supabase
          .from("echo_streaks")
          .upsert({
            echo_id: echoId,
            current_streak: 1,
            longest_streak: 1,
            last_campaign_date: lastDate,
          })
          .select("current_streak, longest_streak, last_campaign_date")
          .single();
        streakData = inserted;
      }
    } catch (err) {
      console.error("Streak self-heal failed:", err);
    }
  }

  return NextResponse.json({
    user: userRes.data,
    streak: streakData || {
      current_streak: 0,
      longest_streak: 0,
      last_campaign_date: null,
    },
    achievements: achievementsRes.data || [],
    milestones: milestonesRes.data || [],
    streakRewards: streakRewardsRes.data || [],
  });
}
