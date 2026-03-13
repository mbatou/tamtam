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

  // Get brand's campaigns
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, cpc")
    .eq("batteur_id", batteurId);

  const campaignIds = (campaigns || []).map((c) => c.id);
  if (campaignIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get tracked links for brand's campaigns with echo info
  const { data: trackedLinks } = await supabase
    .from("tracked_links")
    .select("id, campaign_id, echo_id, click_count, created_at")
    .in("campaign_id", campaignIds);

  const links = trackedLinks || [];
  const echoIds = Array.from(new Set(links.map((l) => l.echo_id)));

  if (echoIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get echo user details
  const { data: echoUsers } = await supabase
    .from("users")
    .select("id, name, phone, city, mobile_money_provider, balance, total_earned, status, created_at")
    .in("id", echoIds);

  // Build campaign map for CPC lookup
  const campaignMap = new Map((campaigns || []).map((c) => [c.id, c]));

  // Aggregate per-echo stats for this brand
  const echoStats: Record<string, { totalClicks: number; totalEarned: number; campaignCount: number; campaigns: string[] }> = {};
  for (const link of links) {
    if (!echoStats[link.echo_id]) {
      echoStats[link.echo_id] = { totalClicks: 0, totalEarned: 0, campaignCount: 0, campaigns: [] };
    }
    const campaign = campaignMap.get(link.campaign_id);
    const cpc = campaign?.cpc || 0;
    echoStats[link.echo_id].totalClicks += link.click_count;
    echoStats[link.echo_id].totalEarned += Math.floor(link.click_count * cpc * 0.75);
    echoStats[link.echo_id].campaignCount += 1;
    if (campaign) echoStats[link.echo_id].campaigns.push(campaign.title);
  }

  // Merge user data with stats
  const result = (echoUsers || []).map((user) => ({
    ...user,
    brand_clicks: echoStats[user.id]?.totalClicks || 0,
    brand_earned: echoStats[user.id]?.totalEarned || 0,
    campaign_count: echoStats[user.id]?.campaignCount || 0,
    campaign_names: echoStats[user.id]?.campaigns || [],
  })).sort((a, b) => b.brand_earned - a.brand_earned);

  return NextResponse.json(result);
}
