import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { countClicks } from "@/lib/click-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Parse date range from query params
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Build filtered queries for time-sensitive data
  let clicksQuery = supabase.from("clicks").select("*", { count: "exact", head: true });
  let validClicksQuery = supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true);
  let fraudClicksQuery = supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false);
  let echoSignupsQuery = supabase.from("users").select("id, name, phone, city, created_at").eq("role", "echo").order("created_at", { ascending: false }).limit(5);
  let campaignsListQuery = supabase.from("campaigns").select("id, title, status, budget, spent, cpc, created_at").order("created_at", { ascending: false }).limit(5);
  let recentClicksQuery = supabase.from("clicks").select("id, ip_address, is_valid, created_at, link_id").order("created_at", { ascending: false }).limit(20);
  let sentPayoutsQuery = supabase.from("payouts").select("amount").eq("status", "sent").limit(5000);

  if (fromParam) {
    clicksQuery = clicksQuery.gte("created_at", fromParam);
    validClicksQuery = validClicksQuery.gte("created_at", fromParam);
    fraudClicksQuery = fraudClicksQuery.gte("created_at", fromParam);
    echoSignupsQuery = echoSignupsQuery.gte("created_at", fromParam);
    campaignsListQuery = campaignsListQuery.gte("created_at", fromParam);
    recentClicksQuery = recentClicksQuery.gte("created_at", fromParam);
    sentPayoutsQuery = sentPayoutsQuery.gte("created_at", fromParam);
  }
  if (toParam) {
    clicksQuery = clicksQuery.lte("created_at", toParam);
    validClicksQuery = validClicksQuery.lte("created_at", toParam);
    fraudClicksQuery = fraudClicksQuery.lte("created_at", toParam);
    echoSignupsQuery = echoSignupsQuery.lte("created_at", toParam);
    campaignsListQuery = campaignsListQuery.lte("created_at", toParam);
    recentClicksQuery = recentClicksQuery.lte("created_at", toParam);
    sentPayoutsQuery = sentPayoutsQuery.lte("created_at", toParam);
  }

  const [
    { count: totalEchos },
    { count: totalBatteurs },
    { count: totalCampaigns },
    { count: activeCampaigns },
    { count: totalClicks },
    { count: validClicks },
    { count: fraudClicks },
    { count: pendingPayouts },
    { data: recentEchos },
    { data: recentCampaigns },
    { data: topEchos },
    { data: recentClicks },
    { data: pendingPayoutsList },
    { data: allCampaigns },
    { data: sentPayouts },
    { data: settings },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "batteur"),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    clicksQuery,
    validClicksQuery,
    fraudClicksQuery,
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    echoSignupsQuery,
    campaignsListQuery,
    supabase.from("users").select("id, name, total_earned, balance").eq("role", "echo").order("total_earned", { ascending: false }).limit(10),
    recentClicksQuery,
    supabase.from("payouts").select("id, echo_id, amount, provider, status, created_at, users!echo_id(name, phone)").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
    supabase.from("campaigns").select("spent, budget, status").limit(5000),
    sentPayoutsQuery,
    supabase.from("platform_settings").select("key, value"),
  ]);

  const grossRevenue = (allCampaigns || []).reduce((s: number, c: { spent: number }) => s + (c.spent || 0), 0);
  const feePercent = parseInt((settings || []).find((s: { key: string }) => s.key === "platform_fee_percent")?.value || "25");
  const platformRevenue = Math.round(grossRevenue * feePercent / 100);
  const paidToEchos = (sentPayouts || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const pendingPayoutAmount = (pendingPayoutsList || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const fraudRate = (totalClicks || 0) > 0 ? ((fraudClicks || 0) / (totalClicks || 1) * 100) : 0;

  // --- Active echos (echos with clicks in the selected period, default last 7 days) ---
  const activeFrom = fromParam || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString(); })();
  let activeEchoQuery = supabase
    .from("tracked_links")
    .select("echo_id, clicks!inner(created_at)")
    .gte("clicks.created_at", activeFrom)
    .limit(50000);
  if (toParam) activeEchoQuery = activeEchoQuery.lte("clicks.created_at", toParam);
  const { data: activeEchoLinks } = await activeEchoQuery;

  const activeEchoSet = new Set<string>();
  if (activeEchoLinks) {
    for (const link of activeEchoLinks) {
      if (link.echo_id) activeEchoSet.add(link.echo_id);
    }
  }
  const activeEchos7d = activeEchoSet.size;

  // Budget remaining for active campaigns
  const totalBudgetActive = (allCampaigns || [])
    .filter((c: { status?: string }) => (c as { status?: string }).status === "active")
    .reduce((s: number, c: { budget: number; spent: number }) => s + ((c.budget || 0) - (c.spent || 0)), 0);
  const totalBudgetActiveAll = (allCampaigns || [])
    .filter((c: { status?: string }) => (c as { status?: string }).status === "active")
    .reduce((s: number, c: { budget: number }) => s + (c.budget || 0), 0);
  const budgetRemainingPercent = totalBudgetActiveAll > 0
    ? Math.round((totalBudgetActive / totalBudgetActiveAll) * 100)
    : 0;

  // --- Chart data: clicks per day (using Postgres COUNT — immune to row-limit truncation) ---
  const nowUTC = new Date();
  const chartFrom = fromParam ? new Date(fromParam) : new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate() - 13));
  const chartTo = toParam ? new Date(toParam) : new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate(), 23, 59, 59, 999));

  // Generate day buckets
  const chartBuckets: string[] = [];
  const bucketCursor = new Date(chartFrom);
  bucketCursor.setUTCHours(0, 0, 0, 0);
  const bucketEnd = new Date(chartTo);
  bucketEnd.setUTCHours(0, 0, 0, 0);
  while (bucketCursor <= bucketEnd) {
    chartBuckets.push(bucketCursor.toISOString().slice(0, 10));
    bucketCursor.setUTCDate(bucketCursor.getUTCDate() + 1);
  }

  // Per-day Postgres COUNT(*) — immune to row-limit truncation
  const clicksChart = await Promise.all(
    chartBuckets.map(async (date) => {
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      const [{ count: valid }, { count: total }] = await Promise.all([
        supabase.from("clicks").select("*", { count: "exact", head: true })
          .gte("created_at", dayStart).lte("created_at", dayEnd).eq("is_valid", true),
        supabase.from("clicks").select("*", { count: "exact", head: true })
          .gte("created_at", dayStart).lte("created_at", dayEnd),
      ]);
      return { date, valid: valid || 0, fraud: (total || 0) - (valid || 0) };
    })
  );

  const dayCount = chartBuckets.length;

  // --- Chart data: campaign status distribution ---
  const campaignsByStatus: Record<string, number> = {};
  for (const c of allCampaigns || []) {
    const s = (c as { status?: string }).status || "unknown";
    campaignsByStatus[s] = (campaignsByStatus[s] || 0) + 1;
  }

  // --- Chart data: echo signups per day ---
  let signupsQuery = supabase
    .from("users")
    .select("created_at")
    .eq("role", "echo")
    .gte("created_at", chartFrom.toISOString())
    .lte("created_at", chartTo.toISOString())
    .limit(50000);

  const { data: recentSignups } = await signupsQuery;

  const signupsByDay: Record<string, number> = {};
  for (const key of chartBuckets) {
    signupsByDay[key] = 0;
  }
  for (const u of recentSignups || []) {
    const key = u.created_at.slice(0, 10);
    if (signupsByDay[key] !== undefined) signupsByDay[key]++;
  }
  const signupsChart = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }));

  // --- Chart data: user acquisition (echos + brands cumulative) ---
  // Use date range if provided, otherwise default to last 30 days
  const acqFrom = fromParam ? new Date(fromParam) : new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate() - 29));
  const acqDayCount = fromParam ? dayCount : 30;

  let echoAcqQuery = supabase.from("users").select("created_at").eq("role", "echo").gte("created_at", acqFrom.toISOString()).lte("created_at", chartTo.toISOString()).limit(50000);
  let brandAcqQuery = supabase.from("users").select("created_at").eq("role", "batteur").gte("created_at", acqFrom.toISOString()).lte("created_at", chartTo.toISOString()).limit(50000);

  const [{ data: echoSignups30 }, { data: brandSignups30 }, { count: echosBefore }, { count: brandsBefore }] = await Promise.all([
    echoAcqQuery,
    brandAcqQuery,
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").lt("created_at", acqFrom.toISOString()),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "batteur").lt("created_at", acqFrom.toISOString()),
  ]);

  const acqByDay: Record<string, { date: string; echos: number; brands: number; cumulEchos: number; cumulBrands: number }> = {};
  for (let i = 0; i < acqDayCount; i++) {
    const d = new Date(acqFrom);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    acqByDay[key] = { date: key, echos: 0, brands: 0, cumulEchos: 0, cumulBrands: 0 };
  }
  for (const u of echoSignups30 || []) {
    const key = u.created_at.slice(0, 10);
    if (acqByDay[key]) acqByDay[key].echos++;
  }
  for (const u of brandSignups30 || []) {
    const key = u.created_at.slice(0, 10);
    if (acqByDay[key]) acqByDay[key].brands++;
  }
  let runEchos = echosBefore || 0;
  let runBrands = brandsBefore || 0;
  const acquisitionChart = Object.values(acqByDay).map((d) => {
    runEchos += d.echos;
    runBrands += d.brands;
    return { ...d, cumulEchos: runEchos, cumulBrands: runBrands };
  });

  // --- Active campaigns with Écho engagement details ---
  const { data: activeCampaignsList } = await supabase
    .from("campaigns")
    .select("id, title, budget, spent, cpc, status")
    .eq("status", "active");

  interface ActiveCampaignDetail {
    id: string;
    title: string;
    budget: number;
    spent: number;
    cpc: number;
    status: string;
    engagedEchos: number;
    totalClicks: number;
    validClicks: number;
    topEchos: { id: string; name: string; city: string | null; validClicks: number }[];
  }

  const activeCampaignsDetails: ActiveCampaignDetail[] = [];

  for (const camp of activeCampaignsList || []) {
    // Fetch tracked links without nested clicks (avoids row-limit truncation)
    const { data: links } = await supabase
      .from("tracked_links")
      .select(`
        id,
        echo_id,
        users!tracked_links_echo_id_fkey(id, name, city)
      `)
      .eq("campaign_id", camp.id);

    const allLinkIds = (links || []).map((l) => l.id);
    const echoLinkMap = new Map<string, { user: { id: string; name: string; city: string | null }; linkIds: string[] }>();
    for (const link of links || []) {
      const echoUser = link.users as unknown as { id: string; name: string; city: string | null } | null;
      if (!echoUser) continue;
      if (!echoLinkMap.has(link.echo_id)) {
        echoLinkMap.set(link.echo_id, { user: echoUser, linkIds: [] });
      }
      echoLinkMap.get(link.echo_id)!.linkIds.push(link.id);
    }

    // Use Postgres COUNT(*) for accurate campaign-level totals
    const [campTotalClicks, campValidClicks] = await Promise.all([
      countClicks(supabase, allLinkIds),
      countClicks(supabase, allLinkIds, true),
    ]);

    // Per-echo valid clicks using Postgres COUNT(*)
    const echoEntries = Array.from(echoLinkMap.entries());
    const echoValidCounts = await Promise.all(
      echoEntries.map(([, { linkIds }]) => countClicks(supabase, linkIds, true))
    );

    const echoDetails = echoEntries.map(([, { user }], i) => ({
      id: user.id,
      name: user.name,
      city: user.city,
      validClicks: echoValidCounts[i],
    }));

    activeCampaignsDetails.push({
      ...camp,
      engagedEchos: echoLinkMap.size,
      totalClicks: campTotalClicks,
      validClicks: campValidClicks,
      topEchos: echoDetails
        .sort((a, b) => b.validClicks - a.validClicks)
        .slice(0, 5),
    });
  }

  return NextResponse.json({
    totalEchos: totalEchos || 0,
    totalBatteurs: totalBatteurs || 0,
    totalCampaigns: totalCampaigns || 0,
    activeCampaigns: activeCampaigns || 0,
    totalClicks: totalClicks || 0,
    validClicks: validClicks || 0,
    fraudClicks: fraudClicks || 0,
    pendingPayoutsCount: pendingPayouts || 0,
    grossRevenue,
    platformRevenue,
    paidToEchos,
    pendingPayoutAmount,
    fraudRate: parseFloat(fraudRate.toFixed(1)),
    recentEchos: recentEchos || [],
    recentCampaigns: recentCampaigns || [],
    topEchos: topEchos || [],
    recentClicks: recentClicks || [],
    pendingPayoutsList: pendingPayoutsList || [],
    clicksChart,
    campaignsByStatus,
    signupsChart,
    acquisitionChart,
    activeEchos7d,
    budgetRemainingPercent,
    activeCampaignsDetails,
  });
}
