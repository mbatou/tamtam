import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { countClicks } from "@/lib/click-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

  // --- Active echos date range ---
  const activeFrom = fromParam || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString(); })();
  let activeEchoQuery = supabase
    .from("tracked_links")
    .select("echo_id, clicks!inner(created_at)")
    .gte("clicks.created_at", activeFrom)
    .limit(50000);
  if (toParam) activeEchoQuery = activeEchoQuery.lte("clicks.created_at", toParam);

  // --- Chart date range ---
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

  // --- Acquisition date range ---
  const acqFrom = fromParam ? new Date(fromParam) : new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate() - 29));
  const dayCount = chartBuckets.length;
  const acqDayCount = fromParam ? dayCount : 30;

  // =====================================================================
  // BATCH 1: Run ALL independent queries in parallel (was sequential)
  // =====================================================================
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
    { data: activeEchoLinks },
    { data: recentSignups },
    { data: echoSignups30 },
    { data: brandSignups30 },
    { count: echosBefore },
    { count: brandsBefore },
    { data: activeCampaignsList },
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
    // Active echos query (was sequential)
    activeEchoQuery,
    // Signups chart query (was sequential)
    supabase.from("users").select("created_at").eq("role", "echo")
      .gte("created_at", chartFrom.toISOString()).lte("created_at", chartTo.toISOString()).limit(50000),
    // Acquisition queries (were sequential)
    supabase.from("users").select("created_at").eq("role", "echo")
      .gte("created_at", acqFrom.toISOString()).lte("created_at", chartTo.toISOString()).limit(50000),
    supabase.from("users").select("created_at").eq("role", "batteur")
      .gte("created_at", acqFrom.toISOString()).lte("created_at", chartTo.toISOString()).limit(50000),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").lt("created_at", acqFrom.toISOString()),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "batteur").lt("created_at", acqFrom.toISOString()),
    // Active campaigns list (was sequential)
    supabase.from("campaigns").select("id, title, budget, spent, cpc, status").eq("status", "active"),
  ]);

  const grossRevenue = (allCampaigns || []).reduce((s: number, c: { spent: number }) => s + (c.spent || 0), 0);
  const feePercent = parseInt((settings || []).find((s: { key: string }) => s.key === "platform_fee_percent")?.value || "25");
  const platformRevenue = Math.round(grossRevenue * feePercent / 100);
  const paidToEchos = (sentPayouts || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const pendingPayoutAmount = (pendingPayoutsList || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const fraudRate = (totalClicks || 0) > 0 ? ((fraudClicks || 0) / (totalClicks || 1) * 100) : 0;

  // --- Active echos (computed from parallel query) ---
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

  // --- Chart data: clicks per day (single query + in-memory grouping) ---
  // Replaces 2*N parallel COUNT queries that could saturate the connection pool
  // and silently return 0 for later days.
  const clicksBucketMap: Record<string, { date: string; valid: number; fraud: number }> = {};
  for (const date of chartBuckets) {
    clicksBucketMap[date] = { date, valid: 0, fraud: 0 };
  }
  {
    const chartStartISO = chartFrom.toISOString();
    const chartEndISO = chartTo.toISOString();
    const PAGE = 1000;
    let off = 0;
    while (true) {
      const { data: rows } = await supabase
        .from("clicks")
        .select("created_at, is_valid")
        .gte("created_at", chartStartISO)
        .lte("created_at", chartEndISO)
        .range(off, off + PAGE - 1);
      const batch = rows || [];
      for (const row of batch) {
        const day = row.created_at.slice(0, 10);
        const bucket = clicksBucketMap[day];
        if (bucket) {
          if (row.is_valid) bucket.valid++;
          else bucket.fraud++;
        }
      }
      if (batch.length < PAGE) break;
      off += PAGE;
    }
  }
  const clicksChart = Object.values(clicksBucketMap).sort((a, b) => a.date.localeCompare(b.date));

  // --- Chart data: campaign status distribution ---
  const campaignsByStatus: Record<string, number> = {};
  for (const c of allCampaigns || []) {
    const s = (c as { status?: string }).status || "unknown";
    campaignsByStatus[s] = (campaignsByStatus[s] || 0) + 1;
  }

  // --- Chart data: echo signups per day (computed from parallel query) ---
  const signupsByDay: Record<string, number> = {};
  for (const key of chartBuckets) {
    signupsByDay[key] = 0;
  }
  for (const u of recentSignups || []) {
    const key = u.created_at.slice(0, 10);
    if (signupsByDay[key] !== undefined) signupsByDay[key]++;
  }
  const signupsChart = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }));

  // --- Chart data: user acquisition (computed from parallel queries) ---
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
  // Batch fetch all tracked links and clicks for active campaigns in parallel
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

  if (activeCampaignsList && activeCampaignsList.length > 0) {
    // Batch fetch all tracked links for all active campaigns in one query
    const activeCampaignIds = activeCampaignsList.map(c => c.id);
    const { data: allLinks } = await supabase
      .from("tracked_links")
      .select(`id, echo_id, campaign_id, users!tracked_links_echo_id_fkey(id, name, city)`)
      .in("campaign_id", activeCampaignIds);

    // Group links by campaign
    const linksByCampaign = new Map<string, typeof allLinks>();
    for (const link of allLinks || []) {
      const campId = link.campaign_id;
      if (!linksByCampaign.has(campId)) linksByCampaign.set(campId, []);
      linksByCampaign.get(campId)!.push(link);
    }

    // Compute per-campaign details with parallel click counts
    const campaignDetails = await Promise.all(
      activeCampaignsList.map(async (camp) => {
        const links = linksByCampaign.get(camp.id) || [];
        const allLinkIds = links.map((l) => l.id);
        const echoLinkMap = new Map<string, { user: { id: string; name: string; city: string | null }; linkIds: string[] }>();
        for (const link of links) {
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

        return {
          ...camp,
          engagedEchos: echoLinkMap.size,
          totalClicks: campTotalClicks,
          validClicks: campValidClicks,
          topEchos: echoDetails
            .sort((a, b) => b.validClicks - a.validClicks)
            .slice(0, 5),
        };
      })
    );

    activeCampaignsDetails.push(...campaignDetails);
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
