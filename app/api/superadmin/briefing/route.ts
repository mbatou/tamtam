import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

  // Launch date: first user created_at
  const { data: firstUser } = await supabase
    .from("users")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const launchDate = firstUser?.created_at ? new Date(firstUser.created_at) : now;
  const daysSinceLaunch = Math.max(1, Math.floor((now.getTime() - launchDate.getTime()) / 86400000));

  const [
    // Totals
    { count: totalEchos },
    { count: totalClicks },
    { count: validClicks },
    { count: fraudClicks },
    { count: activeCampaigns },
    { count: pendingPayouts },
    { data: pendingPayoutsList },
    // Today
    { count: signupsToday },
    { count: clicksToday },
    // Yesterday
    { count: signupsYesterday },
    { count: clicksYesterday },
    // Leads
    { data: newLeads },
    // Revenue
    { data: allCampaigns },
    { data: sentPayouts },
    { data: feeSetting },
    // Fraud today
    { count: fraudToday },
    { count: totalClicksToday },
    // Suspicious IPs
    { data: fraudIPs },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo"),
    supabase.from("clicks").select("*", { count: "exact", head: true }),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payouts").select("id, amount").eq("status", "pending"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").gte("created_at", todayStart),
    supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").gte("created_at", yesterdayStart).lt("created_at", todayStart),
    supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", yesterdayStart).lt("created_at", todayStart),
    supabase.from("brand_leads").select("id, created_at").eq("status", "new"),
    supabase.from("campaigns").select("spent, budget, status"),
    supabase.from("payouts").select("amount").eq("status", "sent"),
    supabase.from("platform_settings").select("value").eq("key", "platform_fee_percent").single(),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false).gte("created_at", todayStart),
    supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("clicks").select("ip_address").eq("is_valid", false),
  ]);

  // Revenue calculations
  const grossRevenue = (allCampaigns || []).reduce((s: number, c: { spent: number }) => s + (c.spent || 0), 0);
  const feePercent = parseInt(feeSetting?.value || String(PLATFORM_FEE_PERCENT));
  const commission = Math.round(grossRevenue * feePercent / 100);
  const paidToEchos = (sentPayouts || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const pendingPayoutAmount = (pendingPayoutsList || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);

  // Fraud rate
  const fraudRate = (totalClicks || 0) > 0
    ? parseFloat(((fraudClicks || 0) / (totalClicks || 1) * 100).toFixed(1))
    : 0;
  const fraudRateToday = (totalClicksToday || 0) > 0
    ? parseFloat(((fraudToday || 0) / (totalClicksToday || 1) * 100).toFixed(1))
    : 0;

  // Suspicious IPs to block
  const ipCounts: Record<string, number> = {};
  if (fraudIPs) {
    for (const c of fraudIPs) {
      if (c.ip_address) ipCounts[c.ip_address] = (ipCounts[c.ip_address] || 0) + 1;
    }
  }
  const ipsToBlock = Object.values(ipCounts).filter((count) => count >= 5).length;

  // Oldest new lead age
  let oldestLeadAge = 0;
  if (newLeads && newLeads.length > 0) {
    const oldest = newLeads.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b
    );
    oldestLeadAge = Math.round((now.getTime() - new Date(oldest.created_at).getTime()) / 3600000);
  }

  // Revenue today (from clicks today * avg CPC — approximate)
  const revenueToday = 0; // Would need campaign-level CPC data per click; use 0 for now

  // Trends (delta vs yesterday)
  const signupsDelta = (signupsToday || 0) - (signupsYesterday || 0);
  const clicksDelta = (clicksToday || 0) - (clicksYesterday || 0);

  // Suggested actions (data-driven)
  const suggestedActions: { label: string; href: string; priority: "high" | "medium" | "low" }[] = [];

  if ((newLeads?.length || 0) > 0) {
    suggestedActions.push({ label: "process_leads", href: "/superadmin/leads", priority: "high" });
  }
  if ((pendingPayouts || 0) > 0) {
    suggestedActions.push({ label: "process_payouts", href: "/superadmin/finance", priority: "high" });
  }
  if (fraudRate > 15) {
    suggestedActions.push({ label: "review_fraud", href: "/superadmin/fraud", priority: "high" });
  }
  if ((activeCampaigns || 0) === 0) {
    suggestedActions.push({ label: "no_campaigns", href: "/superadmin/campaigns", priority: "medium" });
  }
  if (ipsToBlock > 0) {
    suggestedActions.push({ label: "block_ips", href: "/superadmin/fraud", priority: "medium" });
  }

  return NextResponse.json({
    daysSinceLaunch,
    date: now.toISOString(),
    actionRequired: {
      newLeads: newLeads?.length || 0,
      oldestLeadAge,
      activeCampaigns: activeCampaigns || 0,
      fraudRate,
      fraudRateToday,
      ipsToBlock,
      pendingPayouts: pendingPayouts || 0,
      pendingPayoutAmount,
    },
    today: {
      signups: signupsToday || 0,
      clicks: clicksToday || 0,
      revenue: revenueToday,
    },
    totals: {
      echos: totalEchos || 0,
      clicks: validClicks || 0,
      paid: paidToEchos,
    },
    trends: {
      signupsDelta,
      clicksDelta,
    },
    financial: {
      commission,
      grossRevenue,
      pendingPayouts: pendingPayoutAmount,
    },
    suggestedActions,
  });
}
