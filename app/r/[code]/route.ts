import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ANTI_FRAUD, ECHO_SHARE_PERCENT } from "@/lib/constants";

export const runtime = "edge";

function getSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const supabase = getSupabase();

  // Lookup tracked link with campaign data
  const { data: link } = await supabase
    .from("tracked_links")
    .select("*, campaigns(*)")
    .eq("short_code", code)
    .single();

  if (!link || !link.campaigns) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const campaign = link.campaigns;

  // If campaign not active, redirect anyway
  if (campaign.status !== "active") {
    return NextResponse.redirect(campaign.destination_url);
  }

  // Gather visitor data
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Anti-fraud checks
  let isValid = true;

  // 1. IP dedup: same IP + same link within 24h
  const dedupTime = new Date(
    Date.now() - ANTI_FRAUD.IP_DEDUP_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { count: recentIpClicks } = await supabase
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", link.id)
    .eq("ip_address", ip)
    .gte("created_at", dedupTime);

  if (recentIpClicks && recentIpClicks > 0) {
    isValid = false;
  }

  // 2. Rate limit: >50 clicks on same link in 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourlyClicks } = await supabase
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", link.id)
    .gte("created_at", oneHourAgo);

  if (hourlyClicks && hourlyClicks >= ANTI_FRAUD.MAX_CLICKS_PER_HOUR) {
    isValid = false;
  }

  // 3. Budget check
  if (campaign.spent + campaign.cpc > campaign.budget) {
    isValid = false;
  }

  // Insert click record
  await supabase.from("clicks").insert({
    link_id: link.id,
    ip_address: ip,
    user_agent: userAgent,
    is_valid: isValid,
  });

  // If valid click, update counters
  if (isValid) {
    const echoEarnings = Math.floor(
      (campaign.cpc * ECHO_SHARE_PERCENT) / 100
    );

    // Increment click count on tracked link
    await supabase.rpc("increment_click", {
      p_link_id: link.id,
      p_campaign_id: campaign.id,
      p_echo_id: link.echo_id,
      p_cpc: campaign.cpc,
      p_echo_earnings: echoEarnings,
    });
  }

  // Redirect to destination
  return NextResponse.redirect(campaign.destination_url);
}
