import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { countClicks, getLinksForCampaigns, getClicksChart } from "@/lib/click-utils";

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

  // Verify the user is a brand (batteur)
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "batteur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

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
  const links = await getLinksForCampaigns(supabase, campaignIds);

  // Build per-campaign analytics using Postgres COUNT(*) for accurate totals
  const campaignAnalytics = await Promise.all(
    allCampaigns.map(async (campaign) => {
      const campaignLinks = links.filter((l) => l.campaign_id === campaign.id);
      const campaignLinkIds = campaignLinks.map((l) => l.id);
      const echoCount = new Set(campaignLinks.map((l) => l.echo_id)).size;

      // Postgres-level counts — immune to row-limit truncation
      const [totalClicks, validClicks, dailyClicks] = await Promise.all([
        countClicks(supabase, campaignLinkIds),
        countClicks(supabase, campaignLinkIds, true),
        getClicksChart(supabase, campaignLinkIds, 30),
      ]);

      return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        budget: campaign.budget,
        spent: campaign.spent || 0,
        cpc: campaign.cpc,
        created_at: campaign.created_at,
        totalClicks,
        validClicks,
        fraudClicks: totalClicks - validClicks,
        echoCount,
        dailyClicks,
      };
    })
  );

  return NextResponse.json({ campaigns: campaignAnalytics });
}
