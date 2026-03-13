import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const [
    { count: totalClicks },
    { count: flaggedClicks },
    { data: recentClicks },
    { data: fraudIPs },
    { data: blockedIPs },
  ] = await Promise.all([
    supabase.from("clicks").select("*", { count: "exact", head: true }),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false),
    supabase.from("clicks").select("id, ip_address, user_agent, is_valid, country, created_at, link_id, tracked_links!link_id(short_code, echo_id, campaign_id, users!echo_id(name), campaigns!campaign_id(title))").order("created_at", { ascending: false }).limit(100),
    supabase.from("clicks").select("ip_address").eq("is_valid", false),
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
    await supabase.from("admin_activity_log").insert({ admin_id: session.user.id, action: "block_ip", target_type: "ip", target_id: ip });
    return NextResponse.json({ success: true });
  }

  if (action === "toggle_validity" && click_id) {
    const { data: click } = await supabase.from("clicks").select("is_valid").eq("id", click_id).single();
    if (click) {
      await supabase.from("clicks").update({ is_valid: !click.is_valid }).eq("id", click_id);
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
