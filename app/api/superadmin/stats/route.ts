import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const [
    { count: totalEchos },
    { count: totalBatteurs },
    { count: totalCampaigns },
    { count: activeCampaigns },
    { count: totalClicks },
    { count: validClicks },
    { count: fraudClicks },
    { count: pendingPayouts },
    { data: recentEchos },
    { data: recentCampaigns },
    { data: topEchos },
    { data: recentClicks },
    { data: pendingPayoutsList },
    { data: allCampaigns },
    { data: sentPayouts },
    { data: settings },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "batteur"),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("clicks").select("*", { count: "exact", head: true }),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("users").select("id, name, phone, city, created_at").eq("role", "echo").order("created_at", { ascending: false }).limit(5),
    supabase.from("campaigns").select("id, title, status, budget, spent, cpc, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("users").select("id, name, total_earned, balance").eq("role", "echo").order("total_earned", { ascending: false }).limit(10),
    supabase.from("clicks").select("id, ip_address, is_valid, created_at, link_id").order("created_at", { ascending: false }).limit(20),
    supabase.from("payouts").select("id, echo_id, amount, provider, status, created_at, users!echo_id(name, phone)").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
    supabase.from("campaigns").select("spent, budget"),
    supabase.from("payouts").select("amount").eq("status", "sent"),
    supabase.from("platform_settings").select("key, value"),
  ]);

  const grossRevenue = (allCampaigns || []).reduce((s: number, c: { spent: number }) => s + (c.spent || 0), 0);
  const feePercent = parseInt((settings || []).find((s: { key: string }) => s.key === "platform_fee_percent")?.value || "25");
  const platformRevenue = Math.round(grossRevenue * feePercent / 100);
  const paidToEchos = (sentPayouts || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const pendingPayoutAmount = (pendingPayoutsList || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const fraudRate = (totalClicks || 0) > 0 ? ((fraudClicks || 0) / (totalClicks || 1) * 100) : 0;

  return NextResponse.json({
    totalEchos: totalEchos || 0,
    totalBatteurs: totalBatteurs || 0,
    totalCampaigns: totalCampaigns || 0,
    activeCampaigns: activeCampaigns || 0,
    totalClicks: totalClicks || 0,
    validClicks: validClicks || 0,
    fraudClicks: fraudClicks || 0,
    pendingPayoutsCount: pendingPayouts || 0,
    grossRevenue,
    platformRevenue,
    paidToEchos,
    pendingPayoutAmount,
    fraudRate: parseFloat(fraudRate.toFixed(1)),
    recentEchos: recentEchos || [],
    recentCampaigns: recentCampaigns || [],
    topEchos: topEchos || [],
    recentClicks: recentClicks || [],
    pendingPayoutsList: pendingPayoutsList || [],
  });
}
