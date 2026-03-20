import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { countClicks, getLinksForCampaigns, getClicksChart } from "@/lib/click-utils";
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

  // Verify the user is a brand (batteur)
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || !["batteur", "admin", "superadmin"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const batteurId = session.user.id;

  // Get batteur's wallet balance
  const { data: batteurUser } = await supabase
    .from("users")
    .select("balance")
    .eq("id", batteurId)
    .single();

  const walletBalance = batteurUser?.balance || 0;

  // Get brand's campaigns
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, budget, spent, status, cpc, created_at")
    .eq("batteur_id", batteurId);

  const allCampaigns = campaigns || [];
  const campaignIds = allCampaigns.map((c) => c.id);
  const activeCampaigns = allCampaigns.filter((c) => c.status === "active");
  const totalSpent = allCampaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const totalBudget = allCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  // Get tracked links for brand's campaigns
  const links = await getLinksForCampaigns(supabase, campaignIds);
  const echoIds = Array.from(new Set(links.map((l) => l.echo_id)));
  const linkIds = links.map((l) => l.id);

  // Count clicks using Postgres COUNT(*) — immune to row-limit truncation
  const [totalClicks, validClicks] = await Promise.all([
    countClicks(supabase, linkIds),
    countClicks(supabase, linkIds, true),
  ]);

  // Get top echos for this brand's campaigns
  const echoEarnings: Record<string, { id: string; clicks: number; earned: number }> = {};
  for (const link of links) {
    if (!echoEarnings[link.echo_id]) {
      echoEarnings[link.echo_id] = { id: link.echo_id, clicks: 0, earned: 0 };
    }
    const campaign = allCampaigns.find((c) => c.id === link.campaign_id);
    const cpc = campaign?.cpc || 0;
    echoEarnings[link.echo_id].clicks += link.click_count;
    echoEarnings[link.echo_id].earned += Math.floor(link.click_count * cpc * ECHO_SHARE_PERCENT / 100);
  }

  // Fetch echo names
  let topEchos: { id: string; name: string; clicks: number; earned: number }[] = [];
  if (echoIds.length > 0) {
    const { data: echoUsers } = await supabase
      .from("users")
      .select("id, name")
      .in("id", echoIds);

    const nameMap = new Map((echoUsers || []).map((u) => [u.id, u.name]));
    topEchos = Object.values(echoEarnings)
      .map((e) => ({ ...e, name: nameMap.get(e.id) || "Inconnu" }))
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);
  }

  // Chart data: daily clicks for brand's campaigns (last 14 days)
  const clicksChart = await getClicksChart(supabase, linkIds, 14);

  // --- Chart data: budget per campaign ---
  const campaignBudgets = allCampaigns.map((c) => ({
    name: c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title,
    budget: c.budget,
    spent: c.spent || 0,
  }));

  // Enrich campaigns with real click counts using Postgres COUNT(*)
  const enrichedCampaigns = await Promise.all(
    allCampaigns.map(async (c) => {
      const campaignLinkIds = links
        .filter((l) => l.campaign_id === c.id)
        .map((l) => l.id);
      const [realClicks, realValidClicks] = await Promise.all([
        countClicks(supabase, campaignLinkIds),
        countClicks(supabase, campaignLinkIds, true),
      ]);
      return { ...c, realClicks, realValidClicks };
    })
  );

  return NextResponse.json({
    totalClicks,
    validClicks,
    activeEchos: echoIds.length,
    budgetSpent: totalSpent,
    budgetTotal: totalBudget,
    walletBalance,
    activeRythmes: activeCampaigns.length,
    totalCampaigns: allCampaigns.length,
    topEchos,
    campaigns: enrichedCampaigns,
    clicksChart,
    campaignBudgets,
  });
}
