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
  const { data: trackedLinks } = campaignIds.length > 0
    ? await supabase
        .from("tracked_links")
        .select("id, campaign_id, echo_id, click_count")
        .in("campaign_id", campaignIds)
    : { data: [] };

  const links = trackedLinks || [];
  const echoIds = Array.from(new Set(links.map((l) => l.echo_id)));

  // Get clicks for brand's tracked links
  const linkIds = links.map((l) => l.id);
  let totalClicks = 0;
  let validClicks = 0;

  if (linkIds.length > 0) {
    const { count: totalCount } = await supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds);

    const { count: validCount } = await supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds)
      .eq("is_valid", true);

    totalClicks = totalCount || 0;
    validClicks = validCount || 0;
  }

  // Get top echos for this brand's campaigns
  const echoEarnings: Record<string, { id: string; clicks: number; earned: number }> = {};
  for (const link of links) {
    if (!echoEarnings[link.echo_id]) {
      echoEarnings[link.echo_id] = { id: link.echo_id, clicks: 0, earned: 0 };
    }
    const campaign = allCampaigns.find((c) => c.id === link.campaign_id);
    const cpc = campaign?.cpc || 0;
    echoEarnings[link.echo_id].clicks += link.click_count;
    echoEarnings[link.echo_id].earned += Math.floor(link.click_count * cpc * 0.75);
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

  // --- Chart data: daily clicks for brand's campaigns (last 14 days) ---
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  let clicksChart: { date: string; valid: number; fraud: number }[] = [];
  if (linkIds.length > 0) {
    const { data: dailyClicks } = await supabase
      .from("clicks")
      .select("created_at, is_valid")
      .in("link_id", linkIds)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const clicksByDay: Record<string, { date: string; valid: number; fraud: number }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      clicksByDay[key] = { date: key, valid: 0, fraud: 0 };
    }
    for (const click of dailyClicks || []) {
      const key = click.created_at.slice(0, 10);
      if (clicksByDay[key]) {
        if (click.is_valid) clicksByDay[key].valid++;
        else clicksByDay[key].fraud++;
      }
    }
    clicksChart = Object.values(clicksByDay);
  }

  // --- Chart data: budget per campaign ---
  const campaignBudgets = allCampaigns.map((c) => ({
    name: c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title,
    budget: c.budget,
    spent: c.spent || 0,
  }));

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
    campaigns: allCampaigns,
    clicksChart,
    campaignBudgets,
  });
}
