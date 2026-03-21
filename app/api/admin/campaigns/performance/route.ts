import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getClicksChart } from "@/lib/click-utils";

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
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, created_at, cpc, budget, spent, batteur_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.batteur_id !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Get tracked links for this campaign
  const { data: links } = await supabase
    .from("tracked_links")
    .select("id, echo_id")
    .eq("campaign_id", campaignId);

  const linkIds = (links || []).map(l => l.id);

  // Total + valid click counts
  const [{ count: totalClicks }, { count: validClicks }] = await Promise.all([
    supabase.from("clicks").select("*", { count: "exact", head: true }).in("link_id", linkIds),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true).in("link_id", linkIds),
  ]);

  // Unique Échos who generated clicks
  const uniqueEchoIds = Array.from(new Set((links || []).map(l => l.echo_id)));

  // Per-day chart data from campaign start to today
  const now = new Date();
  now.setUTCHours(23, 59, 59, 999);
  const chartData = await getClicksChart(
    supabase,
    linkIds,
    30,
    new Date(campaign.created_at),
    now
  );

  // Top Échos for this campaign
  const echoPerformance: { name: string; city: string; clicks: number; earnings: number }[] = [];
  for (const echoId of uniqueEchoIds) {
    const echoLinks = (links || []).filter(l => l.echo_id === echoId).map(l => l.id);

    const [{ count: echoClicks }, { data: echoInfo }] = await Promise.all([
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true).in("link_id", echoLinks),
      supabase.from("users").select("name, city").eq("id", echoId).single(),
    ]);

    echoPerformance.push({
      name: echoInfo?.name || "—",
      city: echoInfo?.city || "—",
      clicks: echoClicks || 0,
      earnings: Math.round((echoClicks || 0) * campaign.cpc * 0.75),
    });
  }

  echoPerformance.sort((a, b) => b.clicks - a.clicks);

  // Geographic breakdown
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
    totalClicks: totalClicks || 0,
    validClicks: validClicks || 0,
    activeEchos: uniqueEchoIds.length,
    costPerVisitor: (validClicks || 0) > 0 ? Math.round(campaign.spent / (validClicks || 1)) : campaign.cpc,
    chartData,
    topEchos: echoPerformance.slice(0, 5),
    geoBreakdown,
  });
}
