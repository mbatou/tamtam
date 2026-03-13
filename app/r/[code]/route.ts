import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { validateClick } from "@/lib/click-validator";

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

  // Rate limit check
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const { allowed } = rateLimit(`r:${ip}`, 100, 60000);
  if (!allowed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

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
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Validate click using click validator
  const { valid, reason } = await validateClick(ip, userAgent, link.id);

  // Social preview bots (WhatsApp, Snapchat, etc.) just redirect — don't record as a click
  if (reason === "social_preview") {
    return NextResponse.redirect(campaign.destination_url);
  }

  // Insert click record
  await supabase.from("clicks").insert({
    link_id: link.id,
    ip_address: ip,
    user_agent: userAgent.substring(0, 500),
    is_valid: valid,
  });

  // If valid click, update counters (with budget guard)
  if (valid) {
    const echoEarnings = Math.floor(
      (campaign.cpc * ECHO_SHARE_PERCENT) / 100
    );

    // increment_click returns false if budget would be exceeded
    const { data: budgetOk } = await supabase.rpc("increment_click", {
      p_link_id: link.id,
      p_campaign_id: campaign.id,
      p_echo_id: link.echo_id,
      p_cpc: campaign.cpc,
      p_echo_earnings: echoEarnings,
    });

    // Budget exhausted mid-flight — mark click as invalid retroactively
    if (budgetOk === false) {
      await supabase
        .from("clicks")
        .update({ is_valid: false })
        .eq("link_id", link.id)
        .eq("ip_address", ip)
        .order("created_at", { ascending: false })
        .limit(1);
    }
  }

  // Redirect to destination
  return NextResponse.redirect(campaign.destination_url);
}
