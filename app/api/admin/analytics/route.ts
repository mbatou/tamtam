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
  const batteurId = session.user.id;

  // Get all campaigns for this brand
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, budget, spent, status, cpc, created_at")
    .eq("batteur_id", batteurId)
    .order("created_at", { ascending: false });

  const allCampaigns = campaigns || [];
  const campaignIds = allCampaigns.map((c) => c.id);

  if (campaignIds.length === 0) {
    return NextResponse.json({ campaigns: [] });
  }

  // Get tracked links for all campaigns
  const { data: trackedLinks } = await supabase
    .from("tracked_links")
    .select("id, campaign_id, echo_id, click_count")
    .in("campaign_id", campaignIds);

  const links = trackedLinks || [];

  const linkIds = links.map((l) => l.id);

  // Query 1: ALL clicks (no date filter) for accurate per-campaign totals
  let allTimeClicks: { is_valid: boolean; link_id: string }[] = [];
  if (linkIds.length > 0) {
    const { data } = await supabase
      .from("clicks")
      .select("is_valid, link_id")
      .in("link_id", linkIds);
    allTimeClicks = data || [];
  }

  // Query 2: Recent clicks (last 30 days) for chart data
  // Use UTC dates to ensure chart bucket keys match click created_at timestamps
  const now = new Date();
  const chartStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));

  let recentClicks: { created_at: string; is_valid: boolean; link_id: string }[] = [];
  if (linkIds.length > 0) {
    const { data: clicks } = await supabase
      .from("clicks")
      .select("created_at, is_valid, link_id")
      .in("link_id", linkIds)
      .gte("created_at", chartStartUTC.toISOString())
      .order("created_at", { ascending: true });
    recentClicks = clicks || [];
  }

  // Build per-campaign analytics
  const campaignAnalytics = allCampaigns.map((campaign) => {
    const campaignLinks = links.filter((l) => l.campaign_id === campaign.id);
    const campaignLinkIds = new Set(campaignLinks.map((l) => l.id));

    // All-time clicks for accurate totals
    const campaignAllClicks = allTimeClicks.filter((c) => campaignLinkIds.has(c.link_id));
    const totalClickCount = campaignAllClicks.length;
    const validClicks = campaignAllClicks.filter((c) => c.is_valid).length;
    const fraudClicks = campaignAllClicks.filter((c) => !c.is_valid).length;
    const echoCount = new Set(campaignLinks.map((l) => l.echo_id)).size;

    // Recent clicks for chart (last 30 days) — using UTC bucket keys
    const campaignRecentClicks = recentClicks.filter((c) => campaignLinkIds.has(c.link_id));
    const dailyData: Record<string, { date: string; valid: number; fraud: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(chartStartUTC);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyData[key] = { date: key, valid: 0, fraud: 0 };
    }
    for (const click of campaignRecentClicks) {
      const key = click.created_at.slice(0, 10);
      if (dailyData[key]) {
        if (click.is_valid) dailyData[key].valid++;
        else dailyData[key].fraud++;
      }
    }

    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      budget: campaign.budget,
      spent: campaign.spent || 0,
      cpc: campaign.cpc,
      created_at: campaign.created_at,
      totalClicks: totalClickCount,
      validClicks,
      fraudClicks,
      echoCount,
      dailyClicks: Object.values(dailyData),
    };
  });

  return NextResponse.json({ campaigns: campaignAnalytics });
}
