import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabaseAdmin = createServiceClient();

  const { data: currentUser } = await supabaseAdmin
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const now = new Date();

  // ===== ÉCHO ENGAGEMENT FUNNEL =====
  const { count: totalEchos } = await supabaseAdmin
    .from("users").select("*", { count: "exact", head: true }).eq("role", "echo");

  const { data: echoLinks } = await supabaseAdmin
    .from("tracked_links").select("echo_id").limit(50000);
  const echosWithLinks = new Set((echoLinks || []).map((l: { echo_id: string }) => l.echo_id)).size;

  const { data: echoClicks } = await supabaseAdmin
    .from("clicks")
    .select("tracked_links!inner(echo_id)")
    .eq("is_valid", true)
    .limit(50000);
  const echosWithClicks = new Set((echoClicks || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;

  // Check both wallet_transactions (withdrawal type) AND payouts table
  const [{ data: echoWithdrawals }, { data: echoPayout }] = await Promise.all([
    supabaseAdmin
      .from("wallet_transactions")
      .select("user_id")
      .in("type", ["withdrawal", "withdrawal_refund"])
      .limit(50000),
    supabaseAdmin
      .from("payouts")
      .select("echo_id")
      .limit(50000),
  ]);
  const echosWithWithdrawals = new Set([
    ...(echoWithdrawals || []).map((w: { user_id: string }) => w.user_id),
    ...(echoPayout || []).map((p: { echo_id: string }) => p.echo_id),
  ].filter(Boolean)).size;

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { data: recentClicks } = await supabaseAdmin
    .from("clicks")
    .select("tracked_links!inner(echo_id)")
    .eq("is_valid", true)
    .gte("created_at", sevenDaysAgo)
    .limit(50000);
  const activeEchos7d = new Set((recentClicks || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;

  const echoFunnel = {
    registered: totalEchos || 0,
    acceptedCampaign: echosWithLinks,
    generatedClick: echosWithClicks,
    withdrew: echosWithWithdrawals,
    activeWeek: activeEchos7d,
  };

  // ===== ÉCHO LIFECYCLE STAGES =====
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const { data: allEchos } = await supabaseAdmin
    .from("users")
    .select("id, created_at")
    .eq("role", "echo");

  const newEchos = (allEchos || []).filter((e: { created_at: string }) =>
    new Date(e.created_at) > new Date(now.getTime() - 7 * 86400000)
  ).length;

  const dormantEchos = echosWithClicks - activeEchos7d;

  const { data: last30dClicks } = await supabaseAdmin
    .from("clicks")
    .select("tracked_links!inner(echo_id)")
    .eq("is_valid", true)
    .gte("created_at", thirtyDaysAgo)
    .limit(50000);
  const activeEchos30d = new Set((last30dClicks || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;
  const churnedEchos = echosWithClicks - activeEchos30d;

  const echoLifecycle = {
    new: newEchos,
    active: activeEchos7d,
    dormant: Math.max(0, dormantEchos),
    churned: Math.max(0, churnedEchos),
    neverActive: (totalEchos || 0) - echosWithLinks,
  };

  // ===== BRAND FUNNEL =====
  const { count: totalBrands } = await supabaseAdmin
    .from("users").select("*", { count: "exact", head: true }).in("role", ["batteur", "brand"]);

  // Include ALL money-in transaction types for brands
  const { data: brandRecharges } = await supabaseAdmin
    .from("wallet_transactions")
    .select("user_id")
    .in("type", [
      "wallet_recharge",
      "welcome_bonus",
      "manual_credit",
      "campaign_budget_refund",
      "legacy_reconciliation",
    ])
    .gt("amount", 0)
    .limit(50000);
  const brandsRecharged = new Set((brandRecharges || []).map((r: { user_id: string }) => r.user_id)).size;

  // campaigns table uses batteur_id, NOT user_id
  const { data: brandCampaigns } = await supabaseAdmin
    .from("campaigns")
    .select("batteur_id")
    .limit(50000);
  const brandsWithCampaigns = new Set((brandCampaigns || []).map((c: { batteur_id: string }) => c.batteur_id).filter(Boolean)).size;

  const brandCampaignCounts: Record<string, number> = {};
  for (const c of brandCampaigns || []) {
    if (c.batteur_id) {
      brandCampaignCounts[c.batteur_id] = (brandCampaignCounts[c.batteur_id] || 0) + 1;
    }
  }
  const brandsRepeat = Object.values(brandCampaignCounts).filter((c: number) => c >= 2).length;

  const brandFunnel = {
    registered: totalBrands || 0,
    recharged: brandsRecharged,
    launchedCampaign: brandsWithCampaigns,
    repeatCampaign: brandsRepeat,
  };

  // ===== PEAK HOURS HEATMAP =====
  const { data: allClicksData } = await supabaseAdmin
    .from("clicks")
    .select("created_at")
    .eq("is_valid", true)
    .limit(50000);

  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const click of allClicksData || []) {
    const date = new Date(click.created_at);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    heatmap[day][hour]++;
  }

  // ===== CITY PERFORMANCE =====
  const { data: cityData } = await supabaseAdmin
    .from("users")
    .select("id, city")
    .eq("role", "echo")
    .not("city", "is", null);

  const cityPerformance: Record<string, { city: string; echoCount: number; totalClicks: number; validClicks: number }> = {};
  for (const echo of cityData || []) {
    if (!echo.city) continue;
    if (!cityPerformance[echo.city]) {
      cityPerformance[echo.city] = { city: echo.city, echoCount: 0, totalClicks: 0, validClicks: 0 };
    }
    cityPerformance[echo.city].echoCount++;
  }

  const { data: cityClicks } = await supabaseAdmin
    .from("clicks")
    .select("is_valid, tracked_links!inner(echo_id, users!inner(city))")
    .limit(50000);

  for (const click of cityClicks || []) {
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
  const { data: allCampaigns } = await supabaseAdmin
    .from("campaigns")
    .select("id, budget, cpc, spent, created_at, status, moderation_status")
    .in("status", ["active", "completed", "finished"]);

  const completedCampaigns = (allCampaigns || []).filter((c: { status: string }) => c.status === "completed" || c.status === "finished");
  const avgBudget = completedCampaigns.length > 0
    ? Math.round(completedCampaigns.reduce((s: number, c: { budget: number }) => s + c.budget, 0) / completedCampaigns.length)
    : 0;
  const avgCPC = completedCampaigns.length > 0
    ? Math.round(completedCampaigns.reduce((s: number, c: { cpc: number }) => s + c.cpc, 0) / completedCampaigns.length)
    : 0;

  // ===== RETENTION COHORTS (weekly) =====
  const cohorts = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - w * 7 * 86400000);

    const { data: cohortEchos } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "echo")
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString());

    const cohortIds = (cohortEchos || []).map((e: { id: string }) => e.id);
    if (cohortIds.length === 0) {
      cohorts.push({ week: `Semaine -${w + 1}`, registered: 0, activeNow: 0, retentionRate: 0 });
      continue;
    }

    const { data: activeInCohort } = await supabaseAdmin
      .from("clicks")
      .select("tracked_links!inner(echo_id)")
      .eq("is_valid", true)
      .gte("created_at", sevenDaysAgo)
      .in("tracked_links.echo_id", cohortIds)
      .limit(50000);

    const activeCount = new Set((activeInCohort || []).map((c: Record<string, unknown>) => (c.tracked_links as { echo_id: string } | null)?.echo_id)).size;

    cohorts.push({
      week: `Semaine -${w + 1}`,
      registered: cohortIds.length,
      activeNow: activeCount,
      retentionRate: cohortIds.length > 0 ? Math.round((activeCount / cohortIds.length) * 100) : 0,
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
      text: `Seulement ${brandFunnel.launchedCampaign} marques sur ${brandFunnel.registered} ont lancé une campagne (${Math.round(brandFunnel.launchedCampaign / brandFunnel.registered * 100)}%). Les marques s'inscrivent mais ne convertissent pas. Améliorez l'onboarding.`,
    });
  }

  if (brandFunnel.repeatCampaign > 0) {
    suggestions.push({
      severity: "green",
      text: `${brandFunnel.repeatCampaign} marque(s) ont lancé 2+ campagnes. Signe fort de product-market fit. Contactez-les pour un témoignage.`,
    });
  }

  const bestCity = cityStats.find(c => c.validRate > 0);
  const worstCity = [...cityStats].sort((a, b) => a.validRate - b.validRate).find(c => c.totalClicks > 10);
  if (bestCity && worstCity && bestCity.city !== worstCity.city) {
    suggestions.push({
      severity: "yellow",
      text: `${bestCity.city} a le meilleur taux de clics valides (${bestCity.validRate}%) vs ${worstCity.city} (${worstCity.validRate}%). Recrutez plus d'Échos à ${bestCity.city}.`,
    });
  }

  if (echoLifecycle.dormant > echoLifecycle.active) {
    suggestions.push({
      severity: "yellow",
      text: `Plus d'Échos dormants (${echoLifecycle.dormant}) que d'actifs (${echoLifecycle.active}). Lancez un challenge ou une campagne pour réactiver.`,
    });
  }

  // ===== DEBUG DIAGNOSTICS =====
  const [
    { count: dbTotalUsers },
    { count: dbTotalEchos },
    { count: dbTotalBrands },
    { count: dbTotalCampaigns },
    { count: dbTotalClicks },
    { count: dbTotalValidClicks },
    { data: dbTransactionTypes },
    { data: dbCampaignSample },
  ] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "echo"),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).in("role", ["batteur", "brand"]),
    supabaseAdmin.from("campaigns").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true),
    supabaseAdmin.from("wallet_transactions").select("type").limit(50000),
    supabaseAdmin.from("campaigns").select("id, title, batteur_id, status, moderation_status").limit(50),
  ]);

  const distinctTransactionTypes = Array.from(new Set((dbTransactionTypes || []).map((t: { type: string }) => t.type)));

  const debug = {
    totalUsersInDB: dbTotalUsers,
    totalEchosInDB: dbTotalEchos,
    totalBrandsInDB: dbTotalBrands,
    totalCampaignsInDB: dbTotalCampaigns,
    totalClicksInDB: dbTotalClicks,
    totalValidClicksInDB: dbTotalValidClicks,
    distinctTransactionTypes,
    campaignSample: dbCampaignSample,
  };

  return NextResponse.json({
    echoFunnel,
    echoLifecycle,
    brandFunnel,
    heatmap,
    cityStats,
    campaignStats: { avgBudget, avgCPC, totalCampaigns: (allCampaigns || []).length, completedCampaigns: completedCampaigns.length },
    cohorts,
    suggestions,
    debug,
  });
}
