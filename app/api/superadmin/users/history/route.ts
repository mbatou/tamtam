import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("user_id");
  const role = req.nextUrl.searchParams.get("role");
  if (!userId || !role) {
    return NextResponse.json({ error: "user_id and role required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (role === "echo") {
    // For echos: get campaigns they joined via tracked_links
    const { data: links } = await supabase
      .from("tracked_links")
      .select("id, short_code, click_count, created_at, campaign_id, campaigns(id, title, status, cpc, budget, spent, created_at)")
      .eq("echo_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const campaigns = (links || []).map((link) => {
      const c = link.campaigns as unknown as {
        id: string; title: string; status: string; cpc: number;
        budget: number; spent: number; created_at: string;
      } | null;
      return {
        campaign_id: c?.id || link.campaign_id,
        title: c?.title || "—",
        status: c?.status || "unknown",
        cpc: c?.cpc || 0,
        clicks: link.click_count || 0,
        earned: Math.floor((link.click_count || 0) * (c?.cpc || 0) * 0.75),
        joined_at: link.created_at,
      };
    });

    return NextResponse.json({ campaigns });
  }

  if (role === "batteur") {
    // For batteurs: get campaigns they created
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, title, status, cpc, budget, spent, created_at")
      .eq("batteur_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get echo count per campaign
    const campaignIds = (campaigns || []).map((c) => c.id);
    const echoCounts: Record<string, number> = {};
    if (campaignIds.length > 0) {
      const { data: links } = await supabase
        .from("tracked_links")
        .select("campaign_id")
        .in("campaign_id", campaignIds);
      if (links) {
        for (const l of links) {
          echoCounts[l.campaign_id] = (echoCounts[l.campaign_id] || 0) + 1;
        }
      }
    }

    const enriched = (campaigns || []).map((c) => ({
      campaign_id: c.id,
      title: c.title,
      status: c.status,
      cpc: c.cpc,
      budget: c.budget,
      spent: c.spent,
      echos: echoCounts[c.id] || 0,
      created_at: c.created_at,
    }));

    return NextResponse.json({ campaigns: enriched });
  }

  return NextResponse.json({ campaigns: [] });
}
