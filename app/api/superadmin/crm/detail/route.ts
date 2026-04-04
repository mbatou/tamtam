import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  // Fetch campaigns for this brand
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, budget, cpc, created_at, moderation_status, target_cities")
    .eq("batteur_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get click counts per campaign
  const campaignIds = (campaigns || []).map(c => c.id);
  const clickCounts: Record<string, number> = {};
  if (campaignIds.length > 0) {
    const { data: links } = await supabase
      .from("tracked_links")
      .select("campaign_id")
      .in("campaign_id", campaignIds);

    for (const link of links || []) {
      clickCounts[link.campaign_id] = (clickCounts[link.campaign_id] || 0) + 1;
    }
  }

  const enrichedCampaigns = (campaigns || []).map(c => ({
    ...c,
    echoCount: clickCounts[c.id] || 0,
  }));

  // Fetch payment/recharge history
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, payment_method, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch wallet transactions
  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("id, amount, type, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Compute total spent (negative transactions = spending)
  const totalSpent = (transactions || [])
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Compute total recharged
  const totalRecharged = (payments || [])
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return NextResponse.json({
    campaigns: enrichedCampaigns,
    payments: payments || [],
    transactions: transactions || [],
    totalSpent,
    totalRecharged,
  });
}
