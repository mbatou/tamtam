import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabaseAuth = createServiceClient();
  const { data: admin } = await supabaseAuth.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("user_id");
  const role = req.nextUrl.searchParams.get("role");
  if (!userId || !role) {
    return NextResponse.json({ error: "user_id and role required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Always fetch both echo and batteur history for dual-role support
  const echoCampaigns: unknown[] = [];
  const batteurCampaigns: unknown[] = [];

  // Echo history: campaigns joined via tracked_links
  const { data: links } = await supabase
    .from("tracked_links")
    .select("id, short_code, click_count, created_at, campaign_id, campaigns(id, title, status, cpc, budget, spent, created_at)")
    .eq("echo_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (links && links.length > 0) {
    for (const link of links) {
      const c = link.campaigns as unknown as {
        id: string; title: string; status: string; cpc: number;
        budget: number; spent: number; created_at: string;
      } | null;
      echoCampaigns.push({
        campaign_id: c?.id || link.campaign_id,
        title: c?.title || "—",
        status: c?.status || "unknown",
        cpc: c?.cpc || 0,
        clicks: link.click_count || 0,
        earned: Math.floor((link.click_count || 0) * (c?.cpc || 0) * ECHO_SHARE_PERCENT / 100),
        joined_at: link.created_at,
      });
    }
  }

  // Batteur history: campaigns created
  const { data: createdCampaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, cpc, budget, spent, created_at")
    .eq("batteur_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (createdCampaigns && createdCampaigns.length > 0) {
    const campaignIds = createdCampaigns.map((c) => c.id);
    const echoCounts: Record<string, number> = {};
    const { data: cLinks } = await supabase
      .from("tracked_links")
      .select("campaign_id")
      .in("campaign_id", campaignIds);
    if (cLinks) {
      for (const l of cLinks) {
        echoCounts[l.campaign_id] = (echoCounts[l.campaign_id] || 0) + 1;
      }
    }

    for (const c of createdCampaigns) {
      batteurCampaigns.push({
        campaign_id: c.id,
        title: c.title,
        status: c.status,
        cpc: c.cpc,
        budget: c.budget,
        spent: c.spent,
        echos: echoCounts[c.id] || 0,
        created_at: c.created_at,
      });
    }
  }

  // Payout history for this user
  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, provider, status, created_at, failure_reason, completed_at")
    .eq("echo_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // For backward compatibility, return campaigns based on primary role
  const campaigns = role === "batteur" ? batteurCampaigns : echoCampaigns;

  return NextResponse.json({
    campaigns,
    echoCampaigns,
    batteurCampaigns,
    payouts: payouts || [],
  });
}
