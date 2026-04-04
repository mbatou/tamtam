import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();

  const { data: currentUser } = await supabaseAdmin
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // =====================================================================
  // SINGLE BATCH: Run ALL queries in parallel (was 15+ sequential queries)
  // =====================================================================
  const [
    totalEchosResult,
    totalBrandsResult,
    echoLinksResult,
    echoClicksResult,
    echoWithdrawalsResult,
    echoPayoutResult,
    recentClicksResult,
    last30dClicksResult,
    allEchosResult,
    brandRechargesResult,
    brandCampaignsResult,
    allClicksDataResult,
    cityDataResult,
    cityClicksResult,
    allCampaignsResult,
    dbTotalUsersResult,
    dbTotalEchosResult,
    dbTotalBrandsResult,
    dbTotalCampaignsResult,
    dbTotalClicksResult,
    dbTotalValidClicksResult,
    dbTransactionTypesResult,
    dbCampaignSampleResult,
  ] = await Promise.all([
    // Echo funnel
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").is("deleted_at", null),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).in("role", ["batteur", "brand"]).is("deleted_at", null),
    supabaseAdmin.from("tracked_links").select("echo_id").limit(50000),
    supabaseAdmin.from("clicks").select("tracked_links!inner(echo_id)").eq("is_valid", true).limit(50000),
    supabaseAdmin.from("wallet_transactions").select("user_id").in("type", ["withdrawal", "withdrawal_refund"]).limit(50000),
    supabaseAdmin.from("payouts").select("echo_id").limit(50000),
    supabaseAdmin.from("clicks").select("tracked_links!inner(echo_id)").eq("is_valid", true).gte("created_at", sevenDaysAgo).limit(50000),
    supabaseAdmin.from("clicks").select("tracked_links!inner(echo_id)").eq("is_valid", true).gte("created_at", thirtyDaysAgo).limit(50000),
    // All echos for lifecycle + cohorts
    supabaseAdmin.from("users").select("id, created_at, city").eq("role", "echo").is("deleted_at", null),
    // Brand funnel
    supabaseAdmin.from("wallet_transactions").select("user_id")
      .in("type", ["wallet_recharge", "welcome_bonus", "manual_credit", "campaign_budget_refund", "legacy_reconciliation"])
      .gt("amount", 0).limit(50000),
    supabaseAdmin.from("campaigns").select("batteur_id").limit(50000),
    // Heatmap
    supabaseAdmin.from("clicks").select("created_at").eq("is_valid", true).limit(50000),
    // City performance
    supabaseAdmin.from("users").select("id, city").eq("role", "echo").not("city", "is", null).is("deleted_at", null),
    supabaseAdmin.from("clicks").select("is_valid, tracked_links!inner(echo_id, users!inner(city))").limit(50000),
    // Campaign stats
    supabaseAdmin.from("campaigns").select("id, budget, cpc, spent, created_at, status, moderation_status").in("status", ["active", "completed", "finished"]),
    // Debug diagnostics
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").is("deleted_at", null),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).in("role", ["batteur", "brand"]).is("deleted_at", null),
    supabaseAdmin.from("campaigns").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true),
    supabaseAdmin.from("wallet_transactions").select("type").limit(50000),
    supabaseAdmin.from("campaigns").select("id, title, batteur_id, status, moderation_status").limit(50),
  ]);

  // =====================================================================
  // COMPUTE ALL METRICS IN MEMORY (no more DB queries)
  // =====================================================================

  // ===== ÉCHO ENGAGEMENT FUNNEL =====
  const totalEchos = totalEchosResult.count || 0;
  const echosWithLinks = new Set((echoLinksResult.data || []).map((l: { echo_id: string }) => l.echo_id)).size;
  const echosWithClicks = new Set((echoClicksResult.data || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;

  const echosWithWithdrawals = new Set([
    ...(echoWithdrawalsResult.data || []).map((w: { user_id: string }) => w.user_id),
    ...(echoPayoutResult.data || []).map((p: { echo_id: string }) => p.echo_id),
  ].filter(Boolean)).size;

  const activeEchos7d = new Set((recentClicksResult.data || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;

  const echoFunnel = {
    registered: totalEchos,
    acceptedCampaign: echosWithLinks,
    generatedClick: echosWithClicks,
    withdrew: echosWithWithdrawals,
    activeWeek: activeEchos7d,
  };

  // ===== ÉCHO LIFECYCLE STAGES =====
  const allEchos = allEchosResult.data || [];
  const newEchos = allEchos.filter((e: { created_at: string }) =>
    new Date(e.created_at) > new Date(now.getTime() - 7 * 86400000)
  ).length;

  const dormantEchos = echosWithClicks - activeEchos7d;
  const activeEchos30d = new Set((last30dClicksResult.data || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;
  const churnedEchos = echosWithClicks - activeEchos30d;

  const echoLifecycle = {
    new: newEchos,
    active: activeEchos7d,
    dormant: Math.max(0, dormantEchos),
    churned: Math.max(0, churnedEchos),
    neverActive: totalEchos - echosWithLinks,
  };

  // ===== BRAND FUNNEL =====
  const totalBrands = totalBrandsResult.count || 0;
  const brandsRecharged = new Set((brandRechargesResult.data || []).map((r: { user_id: string }) => r.user_id)).size;

  const brandCampaigns = brandCampaignsResult.data || [];
  const brandsWithCampaigns = new Set(brandCampaigns.map((c: { batteur_id: string }) => c.batteur_id).filter(Boolean)).size;

  const brandCampaignCounts: Record<string, number> = {};
  for (const c of brandCampaigns) {
    if (c.batteur_id) {
      brandCampaignCounts[c.batteur_id] = (brandCampaignCounts[c.batteur_id] || 0) + 1;
    }
  }
  const brandsRepeat = Object.values(brandCampaignCounts).filter((c: number) => c >= 2).length;

  const brandFunnel = {
    registered: totalBrands,
    recharged: brandsRecharged,
    launchedCampaign: brandsWithCampaigns,
    repeatCampaign: brandsRepeat,
  };

  // ===== PEAK HOURS HEATMAP =====
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const click of allClicksDataResult.data || []) {
    const date = new Date(click.created_at);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    heatmap[day][hour]++;
  }

  // ===== CITY PERFORMANCE =====
  const cityPerformance: Record<string, { city: string; echoCount: number; totalClicks: number; validClicks: number }> = {};
  for (const echo of cityDataResult.data || []) {
    if (!echo.city) continue;
    if (!cityPerformance[echo.city]) {
      cityPerformance[echo.city] = { city: echo.city, echoCount: 0, totalClicks: 0, validClicks: 0 };
    }
    cityPerformance[echo.city].echoCount++;
  }

  for (const click of cityClicksResult.data || []) {
    const trackedLinks = click.tracked_links as unknown as { echo_id: string; users: { city: string } | null } | null;
    const city = trackedLinks?.users?.city;
    if (city && cityPerformance[city]) {
      cityPerformance[city].totalClicks++;
      if (click.is_valid) cityPerformance[city].validClicks++;
    }
  }

  const cityStats = Object.values(cityPerformance)
    .map(c => ({
      ...c,
      validRate: c.totalClicks > 0 ? Math.round((c.validClicks / c.totalClicks) * 100) : 0,
      clicksPerEcho: c.echoCount > 0 ? Math.round(c.validClicks / c.echoCount) : 0,
    }))
    .sort((a, b) => b.echoCount - a.echoCount)
    .slice(0, 15);

  // ===== CAMPAIGN PERFORMANCE STATS =====
  const allCampaigns = allCampaignsResult.data || [];
  const completedCampaigns = allCampaigns.filter((c: { status: string }) => c.status === "completed" || c.status === "finished");
  const avgBudget = completedCampaigns.length > 0
    ? Math.round(completedCampaigns.reduce((s: number, c: { budget: number }) => s + c.budget, 0) / completedCampaigns.length)
    : 0;
  const avgCPC = completedCampaigns.length > 0
    ? Math.round(completedCampaigns.reduce((s: number, c: { cpc: number }) => s + c.cpc, 0) / completedCampaigns.length)
    : 0;

  // ===== RETENTION COHORTS — computed from pre-fetched data (was 8 sequential queries) =====
  const activeEchoIds7d = new Set(
    (recentClicksResult.data || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id).filter(Boolean)
  );

  const cohorts = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - w * 7 * 86400000);

    const cohortEchos = allEchos.filter((e: { id: string; created_at: string }) => {
      const created = new Date(e.created_at);
      return created >= weekStart && created < weekEnd;
    });

    const activeInCohort = cohortEchos.filter((e: { id: string }) => activeEchoIds7d.has(e.id)).length;

    cohorts.push({
      week: `Semaine -${w + 1}`,
      registered: cohortEchos.length,
      activeNow: activeInCohort,
      retentionRate: cohortEchos.length > 0 ? Math.round((activeInCohort / cohortEchos.length) * 100) : 0,
    });
  }

  // ===== SUGGESTIONS (rule-based, no AI) =====
  const suggestions = [];

  const neverActivePercent = echoFunnel.registered > 0
    ? Math.round((echoLifecycle.neverActive / echoFunnel.registered) * 100) : 0;
  if (neverActivePercent > 30) {
    suggestions.push({
      severity: "red",
      text: `${neverActivePercent}% des Échos inscrits n'ont jamais accepté de campagne (${echoLifecycle.neverActive} sur ${echoFunnel.registered}). Envoyez une notification de re-engagement.`,
    });
  }

  if (brandFunnel.registered > 0 && brandFunnel.launchedCampaign / brandFunnel.registered < 0.2) {
    suggestions.push({
      severity: "red",
      text: `Only ${brandFunnel.launchedCampaign} out of ${brandFunnel.registered} brands launched a campaign (${Math.round(brandFunnel.launchedCampaign / brandFunnel.registered * 100)}%). Brands sign up but don't convert. Improve onboarding.`,
    });
  }

  if (brandFunnel.repeatCampaign > 0) {
    suggestions.push({
      severity: "green",
      text: `${brandFunnel.repeatCampaign} brand(s) launched 2+ campaigns. Strong product-market fit signal. Reach out for a testimonial.`,
    });
  }

  const bestCity = cityStats.find(c => c.validRate > 0);
  const worstCity = [...cityStats].sort((a, b) => a.validRate - b.validRate).find(c => c.totalClicks > 10);
  if (bestCity && worstCity && bestCity.city !== worstCity.city) {
    suggestions.push({
      severity: "yellow",
      text: `${bestCity.city} has the best valid click rate (${bestCity.validRate}%) vs ${worstCity.city} (${worstCity.validRate}%). Recruit more Echos in ${bestCity.city}.`,
    });
  }

  if (echoLifecycle.dormant > echoLifecycle.active) {
    suggestions.push({
      severity: "yellow",
      text: `More dormant Echos (${echoLifecycle.dormant}) than active (${echoLifecycle.active}). Launch a challenge or campaign to reactivate.`,
    });
  }

  // ===== DEBUG DIAGNOSTICS (already parallel from batch) =====
  const distinctTransactionTypes = Array.from(new Set((dbTransactionTypesResult.data || []).map((t: { type: string }) => t.type)));

  const debug = {
    totalUsersInDB: dbTotalUsersResult.count,
    totalEchosInDB: dbTotalEchosResult.count,
    totalBrandsInDB: dbTotalBrandsResult.count,
    totalCampaignsInDB: dbTotalCampaignsResult.count,
    totalClicksInDB: dbTotalClicksResult.count,
    totalValidClicksInDB: dbTotalValidClicksResult.count,
    distinctTransactionTypes,
    campaignSample: dbCampaignSampleResult.data,
  };

  return NextResponse.json({
    echoFunnel,
    echoLifecycle,
    brandFunnel,
    heatmap,
    cityStats,
    campaignStats: { avgBudget, avgCPC, totalCampaigns: allCampaigns.length, completedCampaigns: completedCampaigns.length },
    cohorts,
    suggestions,
    debug,
  });
}
