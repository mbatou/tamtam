import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [
    echosRes,
    streaksRes,
    achievementsRes,
    milestonesRes,
    streakRewardsRes,
    tierRes,
    settingsRes,
    activeCampaignsRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "echo")
      .is("deleted_at", null),
    supabase.from("echo_streaks").select("echo_id, current_streak, longest_streak").limit(5000),
    supabase.from("echo_achievements").select("echo_id, milestone_id, reward_fcfa, achieved_at, users!echo_id(name)").limit(5000),
    supabase.from("gamification_milestones").select("*").order("sort_order"),
    supabase.from("streak_rewards").select("echo_id, reward_fcfa, credited_at, users!echo_id(name)").limit(5000),
    supabase.from("users").select("tier").eq("role", "echo").is("deleted_at", null).limit(5000),
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["gamification_enabled", "gamification_monthly_cap"]),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return NextResponse.json({
    totalEchos: echosRes.count || 0,
    streaks: streaksRes.data || [],
    achievements: achievementsRes.data || [],
    milestones: milestonesRes.data || [],
    streakRewards: streakRewardsRes.data || [],
    tiers: tierRes.data || [],
    settings: settingsRes.data || [],
    activeCampaigns: activeCampaignsRes.count || 0,
  });
}
