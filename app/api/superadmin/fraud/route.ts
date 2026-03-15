import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Period filter
  const period = request.nextUrl.searchParams.get("period") || "all";
  let sinceDate: string | null = null;
  const now = new Date();
  if (period === "today") {
    sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (period === "week") {
    sinceDate = new Date(now.getTime() - 7 * 86400000).toISOString();
  }

  // Build queries with optional date filter
  let totalQuery = supabase.from("clicks").select("*", { count: "exact", head: true });
  let flaggedQuery = supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false);
  let recentQuery = supabase.from("clicks").select("id, ip_address, user_agent, is_valid, country, created_at, link_id, tracked_links!link_id(short_code, echo_id, campaign_id, users!echo_id(name), campaigns!campaign_id(title))").order("created_at", { ascending: false }).limit(200);
  let fraudIPQuery = supabase.from("clicks").select("ip_address").eq("is_valid", false);

  if (sinceDate) {
    totalQuery = totalQuery.gte("created_at", sinceDate);
    flaggedQuery = flaggedQuery.gte("created_at", sinceDate);
    recentQuery = recentQuery.gte("created_at", sinceDate);
    fraudIPQuery = fraudIPQuery.gte("created_at", sinceDate);
  }

  const [
    { count: totalClicks },
    { count: flaggedClicks },
    { data: recentClicks },
    { data: fraudIPs },
    { data: blockedIPs },
  ] = await Promise.all([
    totalQuery,
    flaggedQuery,
    recentQuery,
    fraudIPQuery,
    supabase.from("blocked_ips").select("*").order("created_at", { ascending: false }),
  ]);

  // Build IP clusters
  const ipCounts: Record<string, number> = {};
  if (fraudIPs) {
    for (const c of fraudIPs) {
      if (c.ip_address) ipCounts[c.ip_address] = (ipCounts[c.ip_address] || 0) + 1;
    }
  }
  const suspiciousIPs = Object.entries(ipCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([ip, count]) => ({ ip, count }));

  return NextResponse.json({
    totalClicks: totalClicks || 0,
    flaggedClicks: flaggedClicks || 0,
    fraudRate: (totalClicks || 0) > 0 ? parseFloat(((flaggedClicks || 0) / (totalClicks || 1) * 100).toFixed(1)) : 0,
    suspiciousIPs,
    recentClicks: recentClicks || [],
    blockedIPs: blockedIPs || [],
  });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { action, ip, click_id } = await request.json();

  if (action === "block_ip" && ip) {
    await supabase.from("blocked_ips").upsert({ ip_address: ip, blocked_by: session.user.id, reason: "Bloqué par superadmin" });
    try {
      await supabase.from("admin_activity_log").insert({ admin_id: session.user.id, action: "block_ip", target_type: "ip", target_id: ip });
    } catch { /* admin_activity_log may not exist yet */ }
    return NextResponse.json({ success: true });
  }

  if (action === "toggle_validity" && click_id) {
    // Get click data
    const { data: click } = await supabase
      .from("clicks")
      .select("id, is_valid, link_id")
      .eq("id", click_id)
      .single();

    if (click) {
      const newValid = !click.is_valid;
      await supabase.from("clicks").update({ is_valid: newValid }).eq("id", click_id);

      // Get link + campaign info for counter adjustments
      const { data: link } = await supabase
        .from("tracked_links")
        .select("echo_id, campaign_id, campaigns(cpc)")
        .eq("id", click.link_id)
        .single();

      if (link) {
        const campaign = link.campaigns as unknown as { cpc: number } | null;
        if (campaign) {
          const cpc = campaign.cpc;
          const echoEarnings = Math.floor((cpc * ECHO_SHARE_PERCENT) / 100);
          const direction = newValid ? 1 : -1;

          await supabase.rpc("adjust_click_counters", {
            p_link_id: click.link_id,
            p_campaign_id: link.campaign_id,
            p_echo_id: link.echo_id,
            p_cpc: cpc * direction,
            p_echo_earnings: echoEarnings * direction,
            p_click_delta: direction,
          });
        }
      }

      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: session.user.id,
          action: newValid ? "validate_click" : "invalidate_click",
          target_type: "click",
          target_id: click_id,
        });
      } catch { /* admin_activity_log may not exist yet */ }
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
