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
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  let sinceDate: string | null = null;
  let untilDate: string | null = null;
  const now = new Date();

  if (fromParam) {
    sinceDate = fromParam;
    untilDate = toParam || null;
  } else if (period === "today") {
    sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (period === "week") {
    sinceDate = new Date(now.getTime() - 7 * 86400000).toISOString();
  } else if (period === "month") {
    sinceDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  // Build queries with optional date filter
  let totalQuery = supabase.from("clicks").select("*", { count: "exact", head: true });
  let validQuery = supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true);
  let flaggedQuery = supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false);

  // Try with rejection_reason column (added by antifraud migration)
  const recentSelect = "id, ip_address, user_agent, is_valid, country, created_at, link_id, rejection_reason, tracked_links!link_id(short_code, echo_id, campaign_id, users!echo_id(name), campaigns!campaign_id(title))";
  const recentSelectFallback = "id, ip_address, user_agent, is_valid, country, created_at, link_id, tracked_links!link_id(short_code, echo_id, campaign_id, users!echo_id(name), campaigns!campaign_id(title))";

  let recentQuery = supabase.from("clicks").select(recentSelect).order("created_at", { ascending: false }).limit(200);

  if (sinceDate) {
    totalQuery = totalQuery.gte("created_at", sinceDate);
    validQuery = validQuery.gte("created_at", sinceDate);
    flaggedQuery = flaggedQuery.gte("created_at", sinceDate);
    recentQuery = recentQuery.gte("created_at", sinceDate);
  }
  if (untilDate) {
    totalQuery = totalQuery.lte("created_at", untilDate);
    validQuery = validQuery.lte("created_at", untilDate);
    flaggedQuery = flaggedQuery.lte("created_at", untilDate);
    recentQuery = recentQuery.lte("created_at", untilDate);
  }

  // Core queries (clicks table — always exists)
  const [
    { count: totalClicks },
    { count: validClicks },
    { count: flaggedClicks },
    recentResult,
    { data: blockedIPs },
  ] = await Promise.all([
    totalQuery,
    validQuery,
    flaggedQuery,
    recentQuery,
    supabase.from("blocked_ips").select("*").order("created_at", { ascending: false }),
  ]);

  // Fallback: if rejection_reason column doesn't exist, re-query without it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentClicks: any[] | null = recentResult.data;
  if (!recentClicks && recentResult.error) {
    let fallbackQuery = supabase.from("clicks").select(recentSelectFallback).order("created_at", { ascending: false }).limit(200);
    if (sinceDate) fallbackQuery = fallbackQuery.gte("created_at", sinceDate);
    if (untilDate) fallbackQuery = fallbackQuery.lte("created_at", untilDate);
    const { data } = await fallbackQuery;
    recentClicks = data;
  }

  // Rejection reason breakdown (only works if column exists)
  let rejectionData: { rejection_reason: string }[] | null = null;
  {
    let rejectionQuery = supabase.from("clicks").select("rejection_reason").eq("is_valid", false).not("rejection_reason", "is", null);
    if (sinceDate) rejectionQuery = rejectionQuery.gte("created_at", sinceDate);
    if (untilDate) rejectionQuery = rejectionQuery.lte("created_at", untilDate);
    const { data } = await rejectionQuery;
    rejectionData = data;
  }

  // Optional queries (views/tables from antifraud migration — may not exist yet)
  let carrierRanges: { carrier: string; ip_prefix: string; country: string }[] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ipAnalysis: any[] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let echoAnalysis: any[] | null = null;
  try {
    const [crRes, ipRes, echoRes] = await Promise.all([
      supabase.from("carrier_ip_ranges").select("*"),
      supabase.from("fraud_ip_analysis").select("*").order("total_clicks", { ascending: false }).limit(100),
      supabase.from("fraud_echo_analysis").select("*").order("total_clicks", { ascending: false }).limit(50),
    ]);
    carrierRanges = crRes.data;
    ipAnalysis = ipRes.data;
    echoAnalysis = echoRes.data;
  } catch {
    // Views/tables from migration not applied yet — continue with empty data
  }

  // Build rejection breakdown
  const rejectionBreakdown: Record<string, number> = {};
  if (rejectionData) {
    for (const r of rejectionData) {
      const reason = r.rejection_reason || "unknown";
      rejectionBreakdown[reason] = (rejectionBreakdown[reason] || 0) + 1;
    }
  }

  // Enrich IP analysis with carrier info
  const enrichedIpAnalysis = (ipAnalysis || []).map((ip) => {
    const matchedCarrier = (carrierRanges || []).find((cr) =>
      ip.ip_address?.startsWith(cr.ip_prefix)
    );
    return {
      ...ip,
      carrier: matchedCarrier?.carrier || null,
      carrier_country: matchedCarrier?.country || null,
    };
  });

  // Revenue saved calculation (rejected clicks × avg CPC × echo share)
  const avgCpc = 25;
  const revenueSaved = (flaggedClicks || 0) * avgCpc * (ECHO_SHARE_PERCENT / 100);

  return NextResponse.json({
    totalClicks: totalClicks || 0,
    validClicks: validClicks || 0,
    flaggedClicks: flaggedClicks || 0,
    rejectionRate: (totalClicks || 0) > 0 ? parseFloat(((flaggedClicks || 0) / (totalClicks || 1) * 100).toFixed(1)) : 0,
    rejectionBreakdown,
    revenueSaved: Math.round(revenueSaved),
    recentClicks: recentClicks || [],
    blockedIPs: blockedIPs || [],
    carrierRanges: carrierRanges || [],
    ipAnalysis: enrichedIpAnalysis,
    echoAnalysis: echoAnalysis || [],
  });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const body = await request.json();
  const { action, ip, click_id } = body;

  if (action === "block_ip" && ip) {
    const blockType = body.block_type || "manual";

    // Check if this is a carrier IP
    const { data: carrierMatch } = await supabase
      .from("carrier_ip_ranges")
      .select("carrier, ip_prefix")
      .limit(100);

    const matchedCarrier = (carrierMatch || []).find((cr) => ip.startsWith(cr.ip_prefix));

    if (matchedCarrier && !body.force) {
      return NextResponse.json({
        error: "carrier_ip",
        carrier: matchedCarrier.carrier,
        message: `This IP belongs to ${matchedCarrier.carrier}'s carrier network. Blocking will affect all subscribers on this cell tower.`,
        requires_confirmation: true,
      }, { status: 409 });
    }

    await supabase.from("blocked_ips").upsert({
      ip_address: ip,
      blocked_by: session.user.id,
      reason: body.reason || "Bloqué par superadmin",
      block_type: blockType,
      carrier_ip: !!matchedCarrier,
      expires_at: body.expires_at || null,
    });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "block_ip",
        target_type: "ip",
        target_id: ip,
        details: { block_type: blockType, carrier: matchedCarrier?.carrier || null },
      });
    } catch { /* admin_activity_log may not exist yet */ }

    return NextResponse.json({ success: true });
  }

  if (action === "unblock_ip" && ip) {
    await supabase.from("blocked_ips").delete().eq("ip_address", ip);
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "unblock_ip",
        target_type: "ip",
        target_id: ip,
      });
    } catch {}
    return NextResponse.json({ success: true });
  }

  if (action === "bulk_block_ips") {
    const threshold = body.threshold || 5;
    // Get IP analysis data — only block non-carrier IPs assessed as bot/suspicious
    const { data: ipAnalysis } = await supabase
      .from("fraud_ip_analysis")
      .select("ip_address, risk_assessment, is_carrier_ip")
      .in("risk_assessment", ["bot", "targeted_abuse", "suspicious"]);

    // Get already blocked IPs
    const { data: existingBlocked } = await supabase.from("blocked_ips").select("ip_address");
    const blockedSet = new Set((existingBlocked || []).map((b) => b.ip_address));

    // Filter: only non-carrier IPs that are bots
    const ipsToBlock = (ipAnalysis || [])
      .filter((ip) => !ip.is_carrier_ip && !blockedSet.has(ip.ip_address))
      .filter((ip) => ip.risk_assessment === "bot" || ip.risk_assessment === "targeted_abuse");

    if (ipsToBlock.length > 0) {
      await supabase.from("blocked_ips").insert(
        ipsToBlock.map((ip) => ({
          ip_address: ip.ip_address,
          blocked_by: session.user.id,
          reason: `Auto-blocked: ${ip.risk_assessment}`,
          block_type: "bot" as const,
          carrier_ip: false,
        }))
      );
      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: session.user.id,
          action: "bulk_block_ips",
          target_type: "ip",
          target_id: "bulk",
          details: { count: ipsToBlock.length, threshold },
        });
      } catch {}
    }
    return NextResponse.json({ success: true, blocked: ipsToBlock.length });
  }

  if (action === "toggle_validity" && click_id) {
    const { data: click } = await supabase
      .from("clicks")
      .select("id, is_valid, link_id")
      .eq("id", click_id)
      .single();

    if (click) {
      const newValid = !click.is_valid;
      await supabase.from("clicks").update({
        is_valid: newValid,
        rejection_reason: newValid ? null : "manual_invalidation",
      }).eq("id", click_id);

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
      } catch {}
    }
    return NextResponse.json({ success: true });
  }

  if (action === "flag_echo" && body.echo_id) {
    const riskLevel = body.risk_level || "high";
    await supabase.from("users").update({ risk_level: riskLevel }).eq("id", body.echo_id);
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "flag_echo_fraud",
        target_type: "user",
        target_id: body.echo_id,
        details: { risk_level: riskLevel },
      });
    } catch {}
    return NextResponse.json({ success: true });
  }

  if (action === "update_fraud_settings") {
    const settings = body.settings as Record<string, string>;
    const validKeys = [
      "fraud_ip_cooldown_hours",
      "fraud_link_hourly_limit",
      "fraud_ip_daily_valid_limit",
      "fraud_speed_check_seconds",
      "fraud_auto_block_datacenter",
      "fraud_carrier_ip_protection",
    ];

    for (const [key, value] of Object.entries(settings)) {
      if (validKeys.includes(key)) {
        await supabase.from("platform_settings").upsert({
          key,
          value: String(value),
          updated_at: new Date().toISOString(),
          updated_by: session.user.id,
        });
      }
    }

    return NextResponse.json({ success: true });
  }

  // Get IP details (click timeline)
  if (action === "ip_details" && ip) {
    const { data: clicks } = await supabase
      .from("clicks")
      .select("id, ip_address, is_valid, created_at, rejection_reason, tracked_links!link_id(short_code, users!echo_id(name))")
      .eq("ip_address", ip)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: carrierMatch } = await supabase
      .from("carrier_ip_ranges")
      .select("carrier, ip_prefix, notes")
      .limit(100);

    const matched = (carrierMatch || []).find((cr) => ip.startsWith(cr.ip_prefix));

    return NextResponse.json({
      clicks: clicks || [],
      carrier: matched?.carrier || null,
      carrier_notes: matched?.notes || null,
      is_carrier_ip: !!matched,
    });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
