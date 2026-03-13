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

  // Get all clicks for these links (last 30 days)
  const linkIds = links.map((l) => l.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  let allClicks: { created_at: string; is_valid: boolean; link_id: string }[] = [];
  if (linkIds.length > 0) {
    const { data: clicks } = await supabase
      .from("clicks")
      .select("created_at, is_valid, link_id")
      .in("link_id", linkIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });
    allClicks = clicks || [];
  }

  // Build per-campaign analytics
  const campaignAnalytics = allCampaigns.map((campaign) => {
    const campaignLinks = links.filter((l) => l.campaign_id === campaign.id);
    const campaignLinkIds = new Set(campaignLinks.map((l) => l.id));
    const campaignClicks = allClicks.filter((c) => campaignLinkIds.has(c.link_id));
    const validClicks = campaignClicks.filter((c) => c.is_valid).length;
    const fraudClicks = campaignClicks.filter((c) => !c.is_valid).length;
    const echoCount = new Set(campaignLinks.map((l) => l.echo_id)).size;
    const totalClickCount = campaignLinks.reduce((sum, l) => sum + l.click_count, 0);

    // Daily clicks for this campaign (last 30 days)
    const dailyData: Record<string, { date: string; valid: number; fraud: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyData[key] = { date: key, valid: 0, fraud: 0 };
    }
    for (const click of campaignClicks) {
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
