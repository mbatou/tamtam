import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  // Auth check
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  let flagged = 0;

  // 1. Find IPs with 5+ clicks on same link in 24h
  const { data: recentClicks } = await supabase
    .from("clicks")
    .select("id, ip_address, link_id, is_valid, created_at")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq("is_valid", true);

  if (recentClicks) {
    const ipLinkMap = new Map<string, string[]>();
    recentClicks.forEach((click: { id: string; ip_address: string | null; link_id: string; is_valid: boolean; created_at: string }) => {
      if (!click.ip_address) return;
      const key = `${click.ip_address}:${click.link_id}`;
      const existing = ipLinkMap.get(key) || [];
      existing.push(click.id);
      ipLinkMap.set(key, existing);
    });

    const idsToFlag: string[] = [];
    ipLinkMap.forEach((ids) => {
      if (ids.length >= 5) idsToFlag.push(...ids);
    });

    if (idsToFlag.length > 0) {
      await supabase.from("clicks").update({ is_valid: false }).in("id", idsToFlag);
      flagged += idsToFlag.length;
    }
  }

  // 2. Find bot user agents
  const botPatterns = ["curl", "python", "bot", "spider", "scrapy", "wget", "httpie"];
  const { data: allValid } = await supabase
    .from("clicks")
    .select("id, user_agent")
    .eq("is_valid", true)
    .not("user_agent", "is", null);

  if (allValid) {
    const botIds = allValid
      .filter((c: { id: string; user_agent: string | null }) => {
        const ua = (c.user_agent || "").toLowerCase();
        return botPatterns.some((p) => ua.includes(p));
      })
      .map((c: { id: string; user_agent: string | null }) => c.id);

    if (botIds.length > 0) {
      await supabase.from("clicks").update({ is_valid: false }).in("id", botIds);
      flagged += botIds.length;
    }
  }

  // 3. Self-click detection: clicks where IP matches echo's other clicks on their own links
  // This is a simplified version — would need registration IP for full implementation
  const { data: selfClickCandidates } = await supabase
    .from("clicks")
    .select("id, ip_address, tracked_links(echo_id)")
    .eq("is_valid", true);

  if (selfClickCandidates) {
    // Group by echo and check if same IP is used across many of their links
    const echoIPMap = new Map<string, Map<string, string[]>>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selfClickCandidates.forEach((c: any) => {
      if (!c.ip_address || !c.tracked_links) return;
      const link = Array.isArray(c.tracked_links) ? c.tracked_links[0] : c.tracked_links;
      if (!link) return;
      const echoId = link.echo_id;
      if (!echoIPMap.has(echoId)) echoIPMap.set(echoId, new Map());
      const ipMap = echoIPMap.get(echoId)!;
      const ids = ipMap.get(c.ip_address) || [];
      ids.push(c.id);
      ipMap.set(c.ip_address, ids);
    });

    const selfClickIds: string[] = [];
    echoIPMap.forEach((ipMap) => {
      ipMap.forEach((ids) => {
        if (ids.length >= 10) selfClickIds.push(...ids);
      });
    });

    if (selfClickIds.length > 0) {
      await supabase.from("clicks").update({ is_valid: false }).in("id", selfClickIds);
      flagged += selfClickIds.length;
    }
  }

  return NextResponse.json({ flagged, scanned_at: new Date().toISOString() });
}
