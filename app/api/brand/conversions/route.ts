import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { searchParams } = request.nextUrl;
  const campaignId = searchParams.get("campaign_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format");

  if (!campaignId) {
    return NextResponse.json({ error: "campaign_id requis" }, { status: 400 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, batteur_id, pixel_id, spent, cpc, title")
    .eq("id", campaignId)
    .is("deleted_at", null)
    .single();

  if (!campaign || campaign.batteur_id !== brandId) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  if (!campaign.pixel_id) {
    return NextResponse.json({
      funnel: { clicks: 0, installs: 0, signups: 0, activations: 0, subscriptions: 0, purchases: 0, leads: 0, custom: 0 },
      rates: {},
      costs: {},
      revenue: { total_value: 0, currency: "XOF", roas: 0 },
      daily: [],
      recent: [],
      attribution: { direct: 0, unattributed: 0, total: 0 },
    });
  }

  // Get click count from clicks table (valid clicks only)
  const linkIds = (
    await supabase
      .from("tracked_links")
      .select("id")
      .eq("campaign_id", campaignId)
  ).data?.map((l) => l.id) || [];

  let clicksQuery = supabase
    .from("clicks")
    .select("id", { count: "exact", head: true })
    .eq("is_valid", true);

  if (linkIds.length > 0) {
    clicksQuery = clicksQuery.in("link_id", linkIds);
  } else {
    // No tracked links — no clicks possible
    clicksQuery = clicksQuery.eq("link_id", "00000000-0000-0000-0000-000000000000");
  }

  if (from) clicksQuery = clicksQuery.gte("created_at", from);
  if (to) clicksQuery = clicksQuery.lte("created_at", to);

  const { count: clickCount } = await clicksQuery;
  const totalClicks = clickCount || 0;

  // Get conversions: attributed to this campaign OR unattributed but through this pixel
  let conversionsQuery = supabase
    .from("conversions")
    .select("*")
    .eq("pixel_id", campaign.pixel_id)
    .or(`campaign_id.eq.${campaignId},campaign_id.is.null`);

  if (from) conversionsQuery = conversionsQuery.gte("created_at", from);
  if (to) conversionsQuery = conversionsQuery.lte("created_at", to);

  const { data: conversions } = await conversionsQuery.order("created_at", { ascending: false });
  const allConversions = conversions || [];

  // CSV export
  if (format === "csv") {
    const header = "date,event,event_name,value,currency,attributed,attribution_type,click_to_conversion_seconds,external_id";
    const rows = allConversions.map((c) =>
      [
        c.created_at,
        c.event,
        c.event_name || "",
        c.value_amount || "",
        c.value_currency || "XOF",
        c.attributed ? "oui" : "non",
        c.attribution_type || "",
        c.click_to_conversion_seconds || "",
        c.external_id || "",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const safeName = (campaign.title || "campagne").replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="conversions-${safeName}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // Count by event type
  const eventCounts: Record<string, number> = {};
  for (const c of allConversions) {
    if (c.event === "test") continue;
    eventCounts[c.event] = (eventCounts[c.event] || 0) + 1;
  }

  const funnel = {
    clicks: totalClicks,
    installs: eventCounts["install"] || 0,
    signups: eventCounts["signup"] || 0,
    activations: eventCounts["activation"] || 0,
    subscriptions: eventCounts["subscription"] || 0,
    purchases: eventCounts["purchase"] || 0,
    leads: eventCounts["lead"] || 0,
    custom: eventCounts["custom"] || 0,
  };

  // Rates
  const rates: Record<string, number> = {};
  if (totalClicks > 0 && funnel.installs > 0) {
    rates.click_to_install = Math.round((funnel.installs / totalClicks) * 1000) / 10;
  }
  if (funnel.installs > 0 && funnel.signups > 0) {
    rates.install_to_signup = Math.round((funnel.signups / funnel.installs) * 1000) / 10;
  }
  if (funnel.signups > 0 && funnel.activations > 0) {
    rates.signup_to_activation = Math.round((funnel.activations / funnel.signups) * 1000) / 10;
  }
  if (funnel.activations > 0 && funnel.subscriptions > 0) {
    rates.activation_to_subscription = Math.round((funnel.subscriptions / funnel.activations) * 1000) / 10;
  }
  if (funnel.signups > 0 && funnel.subscriptions > 0 && funnel.activations === 0) {
    rates.signup_to_subscription = Math.round((funnel.subscriptions / funnel.signups) * 1000) / 10;
  }

  // Costs
  const spent = campaign.spent || 0;
  const costs: Record<string, number> = {};
  if (totalClicks > 0) costs.cpc = Math.round(spent / totalClicks);
  if (funnel.installs > 0) costs.cpi = Math.round(spent / funnel.installs);
  if (funnel.signups > 0) costs.cpa_signup = Math.round(spent / funnel.signups);
  if (funnel.activations > 0) costs.cpa_activation = Math.round(spent / funnel.activations);
  if (funnel.subscriptions > 0) costs.cpa_subscription = Math.round(spent / funnel.subscriptions);
  if (funnel.purchases > 0) costs.cpa_purchase = Math.round(spent / funnel.purchases);
  if (funnel.leads > 0) costs.cpl = Math.round(spent / funnel.leads);

  // Revenue
  const nonTestConversions = allConversions.filter((c) => c.event !== "test");
  const totalValue = nonTestConversions.reduce((sum, c) => sum + (c.value_amount || 0), 0);
  const roas = spent > 0 ? Math.round((totalValue / spent) * 100) / 100 : 0;

  // Daily aggregation
  const dailyMap = new Map<string, Record<string, number>>();
  for (const c of nonTestConversions) {
    const date = c.created_at.split("T")[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { clicks: 0, installs: 0, signups: 0, activations: 0, subscriptions: 0, purchases: 0, leads: 0 });
    }
    const day = dailyMap.get(date)!;
    if (day[c.event] !== undefined) day[c.event]++;
  }

  // Also get daily clicks
  if (linkIds.length > 0) {
    let dailyClicksQuery = supabase
      .from("clicks")
      .select("created_at")
      .eq("is_valid", true)
      .in("link_id", linkIds);
    if (from) dailyClicksQuery = dailyClicksQuery.gte("created_at", from);
    if (to) dailyClicksQuery = dailyClicksQuery.lte("created_at", to);

    const { data: clickRows } = await dailyClicksQuery;
    for (const click of clickRows || []) {
      const date = click.created_at.split("T")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { clicks: 0, installs: 0, signups: 0, activations: 0, subscriptions: 0, purchases: 0, leads: 0 });
      }
      dailyMap.get(date)!.clicks++;
    }
  }

  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  // Recent conversions (last 20, excluding test)
  const recent = nonTestConversions.slice(0, 20).map((c) => ({
    id: c.id,
    event: c.event,
    event_name: c.event_name,
    value_amount: c.value_amount,
    value_currency: c.value_currency,
    attributed: c.attributed,
    attribution_type: c.attribution_type,
    click_to_conversion_seconds: c.click_to_conversion_seconds,
    created_at: c.created_at,
    external_id: c.external_id,
  }));

  // Attribution breakdown
  const directCount = nonTestConversions.filter((c) => c.attribution_type === "direct").length;
  const unattributedCount = nonTestConversions.filter((c) => c.attribution_type === "unattributed" || !c.attributed).length;

  return NextResponse.json({
    funnel,
    rates,
    costs,
    revenue: { total_value: totalValue, currency: "XOF", roas },
    daily,
    recent,
    attribution: {
      direct: directCount,
      unattributed: unattributedCount,
      total: nonTestConversions.length,
    },
  });
}
