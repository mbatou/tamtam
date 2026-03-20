import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";

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
  const userId = session.user.id;
  const echoShare = ECHO_SHARE_PERCENT / 100;

  // Get campaign-level earnings
  const { data: links } = await supabase
    .from("tracked_links")
    .select("id, campaign_id, click_count, campaigns(id, title, creative_urls, cpc)")
    .eq("echo_id", userId);

  const campaignEarnings = (links || [])
    .filter((l) => l.click_count > 0)
    .map((l) => {
      const rawCampaign = l.campaigns;
      const campaign = (Array.isArray(rawCampaign) ? rawCampaign[0] : rawCampaign) as { id: string; title: string; creative_urls: string[] | null; cpc: number } | null;
      const imageUrl = campaign?.creative_urls?.find((u) => !u.match(/\.(mp4|webm)/)) || null;
      return {
        id: l.campaign_id,
        name: campaign?.title || "—",
        image_url: imageUrl,
        myClicks: l.click_count,
        myEarnings: Math.floor(l.click_count * (campaign?.cpc || 0) * echoShare),
      };
    });

  // Get bonus earnings from achievements
  const { data: achievements } = await supabase
    .from("echo_achievements")
    .select("type, reward_amount")
    .eq("echo_id", userId);

  const bonusEarnings = {
    streaks: (achievements || []).filter((a) => a.type === "streak").reduce((s, a) => s + (a.reward_amount || 0), 0),
    badges: (achievements || []).filter((a) => a.type === "badge").reduce((s, a) => s + (a.reward_amount || 0), 0),
    referrals: (achievements || []).filter((a) => a.type === "referral").reduce((s, a) => s + (a.reward_amount || 0), 0),
  };

  // Average CPC across active/completed campaigns
  const { data: avgData } = await supabase
    .from("campaigns")
    .select("cpc")
    .in("status", ["active", "completed"]);

  const avgCpc =
    avgData && avgData.length > 0
      ? Math.round(avgData.reduce((s, c) => s + c.cpc, 0) / avgData.length)
      : 25;

  // Top earner this week - approximate from leaderboard
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const { data: topLinks } = await supabase
    .from("tracked_links")
    .select("echo_id, click_count, campaigns(cpc)")
    .gte("created_at", oneWeekAgo.toISOString());

  let topEchoEarnings = 0;
  if (topLinks && topLinks.length > 0) {
    const earningsByEcho: Record<string, number> = {};
    for (const link of topLinks) {
      const rawCampaign = link.campaigns;
      const cpc = ((Array.isArray(rawCampaign) ? rawCampaign[0] : rawCampaign) as { cpc: number } | null)?.cpc || 0;
      const earned = Math.floor(link.click_count * cpc * echoShare);
      earningsByEcho[link.echo_id] = (earningsByEcho[link.echo_id] || 0) + earned;
    }
    topEchoEarnings = Math.max(...Object.values(earningsByEcho), 0);
  }

  return NextResponse.json({
    campaignEarnings,
    bonusEarnings,
    avgCpc,
    topEchoEarnings,
  });
}
