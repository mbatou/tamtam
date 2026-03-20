import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const campaignId = params.id;

  // Get campaign CPC
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("cpc")
    .eq("id", campaignId)
    .single();
  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  // Get all tracked links with echo info and clicks
  const { data: links } = await supabase
    .from("tracked_links")
    .select(`
      echo_id,
      created_at,
      users!tracked_links_echo_id_fkey(id, name, city, phone),
      clicks(id, is_valid, created_at)
    `)
    .eq("campaign_id", campaignId);

  // Process into echo map
  const echoMap = new Map<string, {
    id: string;
    name: string;
    city: string | null;
    phone: string | null;
    joinedAt: string;
    totalClicks: number;
    validClicks: number;
    earnings: number;
  }>();

  for (const link of links || []) {
    const echoId = link.echo_id;
    const echoUser = link.users as unknown as { id: string; name: string; city: string | null; phone: string | null } | null;
    if (!echoUser) continue;

    if (!echoMap.has(echoId)) {
      echoMap.set(echoId, {
        id: echoUser.id,
        name: echoUser.name,
        city: echoUser.city,
        phone: echoUser.phone,
        joinedAt: link.created_at,
        totalClicks: 0,
        validClicks: 0,
        earnings: 0,
      });
    }
    const echo = echoMap.get(echoId)!;
    const clicks = (link.clicks || []) as unknown as { id: string; is_valid: boolean; created_at: string }[];
    for (const click of clicks) {
      echo.totalClicks++;
      if (click.is_valid) {
        echo.validClicks++;
        echo.earnings += Math.floor((campaign.cpc * ECHO_SHARE_PERCENT) / 100);
      }
    }
  }

  const echos = Array.from(echoMap.values()).sort((a, b) => b.validClicks - a.validClicks);

  // Get total echo count
  const { count: totalEchos } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "echo");

  const engagedCount = echos.length;

  // Get recent clicks for the click log
  const { data: recentClicks } = await supabase
    .from("clicks")
    .select(`
      id, created_at, is_valid, ip_address, user_agent,
      tracked_links!inner(
        campaign_id,
        users!tracked_links_echo_id_fkey(name, city)
      )
    `)
    .eq("tracked_links.campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    echos,
    engagedCount,
    totalEchos: totalEchos || 0,
    participationRate: totalEchos ? Math.round((engagedCount / totalEchos) * 100) : 0,
    recentClicks: recentClicks || [],
  });
}
