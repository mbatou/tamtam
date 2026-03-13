import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getRoadmapMetrics() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: totalEchos },
    { data: activeEchos7d },
    { count: totalClicks },
    { count: invalidClicks },
    { count: activeCampaigns },
    { data: allCampaigns },
    { data: sentPayouts },
    { count: brandLeads },
    { data: echosWith30dActivity },
    { data: echosJoined30dAgo },
    { data: monthCampaigns },
    { data: goals },
    { data: milestones },
    // Weekly comparison data
    { count: echosThisWeek },
    { count: echosLastWeek },
    { count: clicksThisWeek },
    { count: clicksLastWeek },
    { data: leadsThisWeek },
    { data: leadsLastWeek },
    { data: campaignsThisWeek },
    { data: campaignsLastWeek },
  ] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "echo"),
    supabaseAdmin.from("tracked_links").select("echo_id").gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false),
    supabaseAdmin.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("campaigns").select("spent, budget, batteur_id, status"),
    supabaseAdmin.from("payouts").select("amount").eq("status", "sent"),
    supabaseAdmin.from("brand_leads").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("tracked_links").select("echo_id").gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("users").select("id").eq("role", "echo").lte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("campaigns").select("spent").gte("created_at", startOfMonth),
    supabaseAdmin.from("roadmap_goals").select("*").order("sort_order"),
    supabaseAdmin.from("roadmap_milestones").select("*").order("sort_order"),
    // This week echos
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").gte("created_at", sevenDaysAgo),
    // Last week echos
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    // This week clicks
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    // Last week clicks
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    // This week leads
    supabaseAdmin.from("brand_leads").select("id").gte("created_at", sevenDaysAgo),
    // Last week leads
    supabaseAdmin.from("brand_leads").select("id").gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    // This week campaign revenue
    supabaseAdmin.from("campaigns").select("spent").gte("created_at", sevenDaysAgo),
    // Last week campaign revenue
    supabaseAdmin.from("campaigns").select("spent").gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
  ]);

  const uniqueActiveEchos7d = new Set(activeEchos7d?.map((l) => l.echo_id) || []).size;
  const totalPaidOut = sentPayouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const fraudRate = (totalClicks || 0) > 0 ? ((invalidClicks || 0) / (totalClicks || 1)) * 100 : 0;
  const payingBrands = new Set(
    allCampaigns?.filter((c) => c.spent > 0).map((c) => c.batteur_id) || []
  ).size;
  const monthlyRevenue = Math.round(
    (monthCampaigns?.reduce((sum, c) => sum + (c.spent || 0), 0) || 0) * 0.25
  );

  // Retention
  const echosOlderThan30d = new Set(echosJoined30dAgo?.map((u) => u.id) || []);
  const echosActiveIn30d = new Set(echosWith30dActivity?.map((l) => l.echo_id) || []);
  const retainedEchos = Array.from(echosOlderThan30d).filter((id) => echosActiveIn30d.has(id)).length;
  const echoRetention30d =
    echosOlderThan30d.size > 0 ? Math.round((retainedEchos / echosOlderThan30d.size) * 100) : 0;

  const currentValues: Record<string, number> = {
    total_echos: totalEchos || 0,
    active_echos_7d: uniqueActiveEchos7d,
    total_clicks: totalClicks || 0,
    active_campaigns: activeCampaigns || 0,
    total_paid_out: totalPaidOut,
    first_payout_done: totalPaidOut > 0 ? 1 : 0,
    fraud_rate_below: Math.round(fraudRate * 10) / 10,
    brand_leads: brandLeads || 0,
    paying_brands: payingBrands,
    monthly_revenue: monthlyRevenue,
    echo_retention_30d: echoRetention30d,
    cities_active: 1,
  };

  // Weekly comparison
  const revenueThisWeek = (campaignsThisWeek || []).reduce((s, c) => s + (c.spent || 0), 0);
  const revenueLastWeek = (campaignsLastWeek || []).reduce((s, c) => s + (c.spent || 0), 0);

  const weeklyComparison = {
    echos: { current: echosThisWeek || 0, previous: echosLastWeek || 0 },
    clicks: { current: clicksThisWeek || 0, previous: clicksLastWeek || 0 },
    revenue: { current: Math.round(revenueThisWeek * 0.25), previous: Math.round(revenueLastWeek * 0.25) },
    leads: { current: leadsThisWeek?.length || 0, previous: leadsLastWeek?.length || 0 },
  };

  return { currentValues, goals: goals || [], milestones: milestones || [], weeklyComparison };
}

// Auto-detect milestone achievements
export async function autoCheckMilestones(currentValues: Record<string, number>) {
  const milestoneChecks: Record<string, () => boolean> = {
    "Premier Écho inscrit": () => currentValues.total_echos >= 1,
    "Première campagne lancée": () => currentValues.active_campaigns >= 1,
    "Premier clic tracké": () => currentValues.total_clicks >= 1,
    "Premier paiement Écho": () => currentValues.first_payout_done >= 1,
    "50 Échos inscrits": () => currentValues.total_echos >= 50,
    "100 Échos inscrits": () => currentValues.total_echos >= 100,
    "1000 clics totaux": () => currentValues.total_clicks >= 1000,
    "Premier lead marque reçu": () => currentValues.brand_leads >= 1,
    "Première marque payante": () => currentValues.paying_brands >= 1,
    "500 Échos inscrits": () => currentValues.total_echos >= 500,
    "10 marques payantes": () => currentValues.paying_brands >= 10,
    "250K FCFA revenu mensuel": () => currentValues.monthly_revenue >= 250000,
    "2000 Échos inscrits": () => currentValues.total_echos >= 2000,
    "1M FCFA revenu mensuel": () => currentValues.monthly_revenue >= 1000000,
  };

  // Get unachieved milestones
  const { data: unachieved } = await supabaseAdmin
    .from("roadmap_milestones")
    .select("id, title")
    .eq("achieved", false);

  if (!unachieved) return;

  const now = new Date().toISOString();
  for (const milestone of unachieved) {
    const check = milestoneChecks[milestone.title];
    if (check && check()) {
      await supabaseAdmin
        .from("roadmap_milestones")
        .update({ achieved: true, achieved_at: now })
        .eq("id", milestone.id);
    }
  }
}
