import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getClicksChart } from "@/lib/click-utils";
import { getEffectiveBrandId } from "@/lib/brand-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || !["batteur", "admin", "superadmin"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const campaignId = request.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId requis" }, { status: 400 });
  }

  // Verify ownership
  const brandId = await getEffectiveBrandId(supabase, session.user.id);
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, created_at, cpc, budget, spent, batteur_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.batteur_id !== brandId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Get tracked links for this campaign
  const { data: links } = await supabase
    .from("tracked_links")
    .select("id, echo_id")
    .eq("campaign_id", campaignId);

  const linkIds = (links || []).map(l => l.id);
  const uniqueEchoIds = Array.from(new Set((links || []).map(l => l.echo_id)));

  if (linkIds.length === 0) {
    return NextResponse.json({
      totalClicks: 0,
      validClicks: 0,
      activeEchos: 0,
      costPerVisitor: campaign.cpc,
      chartData: [],
      topEchos: [],
      geoBreakdown: [],
    });
  }

  // Run chart data, click counts, and echo user info in parallel
  const now = new Date();
  now.setUTCHours(23, 59, 59, 999);

  const [chartData, countResults, echoUsers] = await Promise.all([
    // Chart data (single query + in-memory grouping)
    getClicksChart(supabase, linkIds, 30, new Date(campaign.created_at), now),

    // Total + valid click counts in parallel
    Promise.all([
      supabase.from("clicks").select("*", { count: "exact", head: true }).in("link_id", linkIds),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true).in("link_id", linkIds),
    ]),

    // Fetch all echo user info in one query instead of N individual queries
    uniqueEchoIds.length > 0
      ? supabase.from("users").select("id, name, city").in("id", uniqueEchoIds).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const totalClicks = countResults[0].count || 0;
  const validClicks = countResults[1].count || 0;

  // Fetch valid clicks per link in one paginated query (replaces N individual COUNT queries)
  const linkClickCounts: Record<string, number> = {};
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("clicks")
      .select("link_id")
      .in("link_id", linkIds)
      .eq("is_valid", true)
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = data || [];
    for (const row of rows) {
      linkClickCounts[row.link_id] = (linkClickCounts[row.link_id] || 0) + 1;
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Build echo performance from pre-fetched data (no N+1 queries)
  const echoUserMap: Record<string, { name: string; city: string }> = {};
  for (const u of echoUsers.data || []) {
    echoUserMap[u.id] = { name: u.name, city: u.city };
  }

  const echoPerformance: { name: string; city: string; clicks: number; earnings: number }[] = [];
  for (const echoId of uniqueEchoIds) {
    const echoLinks = (links || []).filter(l => l.echo_id === echoId).map(l => l.id);
    const echoClicks = echoLinks.reduce((sum, lid) => sum + (linkClickCounts[lid] || 0), 0);
    const info = echoUserMap[echoId];

    echoPerformance.push({
      name: info?.name || "—",
      city: info?.city || "—",
      clicks: echoClicks,
      earnings: Math.round(echoClicks * campaign.cpc * 0.75),
    });
  }

  echoPerformance.sort((a, b) => b.clicks - a.clicks);

  // Geographic breakdown from pre-computed echo data
  const cityMap: Record<string, number> = {};
  for (const echo of echoPerformance) {
    const city = echo.city || "Autre";
    cityMap[city] = (cityMap[city] || 0) + echo.clicks;
  }
  const totalCityClicks = Object.values(cityMap).reduce((s, v) => s + v, 0);
  const geoBreakdown = Object.entries(cityMap)
    .map(([city, clicks]) => ({
      city,
      clicks,
      percentage: totalCityClicks > 0 ? Math.round((clicks / totalCityClicks) * 100) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return NextResponse.json({
    totalClicks,
    validClicks,
    activeEchos: uniqueEchoIds.length,
    costPerVisitor: validClicks > 0 ? Math.round(campaign.spent / validClicks) : campaign.cpc,
    chartData,
    topEchos: echoPerformance.slice(0, 5),
    geoBreakdown,
  });
}
