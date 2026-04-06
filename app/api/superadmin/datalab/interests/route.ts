import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Run all queries in parallel
  const [
    totalEchosResult,
    completedEchosResult,
    foundingEchosResult,
    interestsResult,
    signalsResult,
    categoriesResult,
    signalCatsResult,
    rewardTransactionsResult,
    echoInterestsWithCityResult,
    completionsPerDayResult,
  ] = await Promise.all([
    // Total echos
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").is("deleted_at", null),
    // Completed interests
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").is("deleted_at", null).not("interests_completed_at", "is", null),
    // Founding echos
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_founding_echo", true),
    // All echo_interests
    supabase.from("echo_interests").select("interest_id"),
    // All echo_content_signals
    supabase.from("echo_content_signals").select("signal_id"),
    // Interest categories
    supabase.from("interest_categories").select("id, name_fr, name_en, emoji").order("sort_order"),
    // Signal categories
    supabase.from("content_signals").select("id, name_fr, name_en, emoji").order("sort_order"),
    // Reward transactions
    supabase.from("wallet_transactions").select("amount").eq("type", "interest_reward"),
    // Echo interests with city for heatmap
    supabase.from("echo_interests").select("interest_id, echo_id, users!inner(city)").limit(50000),
    // Completions per day
    supabase.from("users").select("interests_completed_at").eq("role", "echo").is("deleted_at", null).not("interests_completed_at", "is", null),
  ]);

  const totalEchos = totalEchosResult.count || 0;
  const completedEchos = completedEchosResult.count || 0;
  const foundingEchos = foundingEchosResult.count || 0;

  // Interest distribution
  const interestCounts: Record<string, number> = {};
  for (const row of interestsResult.data || []) {
    interestCounts[row.interest_id] = (interestCounts[row.interest_id] || 0) + 1;
  }

  const categories = (categoriesResult.data || []).map((cat: { id: string; name_fr: string; name_en: string; emoji: string }) => ({
    id: cat.id,
    name_fr: cat.name_fr,
    name_en: cat.name_en,
    emoji: cat.emoji,
    count: interestCounts[cat.id] || 0,
    percentage: completedEchos > 0 ? Math.round(((interestCounts[cat.id] || 0) / completedEchos) * 100) : 0,
  }));

  // Signal distribution
  const signalCounts: Record<string, number> = {};
  for (const row of signalsResult.data || []) {
    signalCounts[row.signal_id] = (signalCounts[row.signal_id] || 0) + 1;
  }

  const signals = (signalCatsResult.data || []).map((sig: { id: string; name_fr: string; name_en: string; emoji: string }) => ({
    id: sig.id,
    name_fr: sig.name_fr,
    name_en: sig.name_en,
    emoji: sig.emoji,
    count: signalCounts[sig.id] || 0,
    percentage: completedEchos > 0 ? Math.round(((signalCounts[sig.id] || 0) / completedEchos) * 100) : 0,
  }));

  // Total rewards distributed
  const totalRewardsDistributed = (rewardTransactionsResult.data || []).reduce(
    (sum: number, t: { amount: number }) => sum + t.amount, 0
  );

  // City × Interest heatmap
  const cityInterestMap: Record<string, Record<string, number>> = {};
  for (const row of echoInterestsWithCityResult.data || []) {
    const city = (row.users as { city: string } | null)?.city;
    if (!city) continue;
    if (!cityInterestMap[city]) cityInterestMap[city] = {};
    cityInterestMap[city][row.interest_id] = (cityInterestMap[city][row.interest_id] || 0) + 1;
  }

  // Get top 15 cities by total interest selections
  const cityCounts = Object.entries(cityInterestMap).map(([city, interests]) => ({
    city,
    total: Object.values(interests).reduce((sum, c) => sum + c, 0),
    interests,
  }));
  cityCounts.sort((a, b) => b.total - a.total);
  const heatmapCities = cityCounts.slice(0, 15);

  // Completions per day trend
  const completionsPerDay: Record<string, number> = {};
  for (const row of completionsPerDayResult.data || []) {
    if (!row.interests_completed_at) continue;
    const day = row.interests_completed_at.split("T")[0];
    completionsPerDay[day] = (completionsPerDay[day] || 0) + 1;
  }
  const completionTrend = Object.entries(completionsPerDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Days until deadline
  const deadline = new Date("2026-04-30T23:59:59Z");
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));

  return NextResponse.json({
    totalEchos,
    completedEchos,
    completionRate: totalEchos > 0 ? Math.round((completedEchos / totalEchos) * 100) : 0,
    foundingEchos,
    totalRewardsDistributed,
    daysRemaining,
    categories,
    signals,
    heatmapCities,
    completionTrend,
  });
}
