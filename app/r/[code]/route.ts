import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ECHO_SHARE_PERCENT, SITE_URL } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { validateClick } from "@/lib/click-validator";
import * as Sentry from "@sentry/nextjs";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { unlockCampaignEarnings } from "@/lib/unlock-earnings";
import { generateShortCode } from "@/lib/utils";
import { refundCampaignRemaining } from "@/lib/campaign-refund";
import { sendCampaignReport } from "@/lib/notifications/campaign-report";
import { crossesBudgetThreshold, sendBudgetAlert } from "@/lib/notifications/budget-alert";

function appendTmRef(url: string, tmRef: string): string {
  try {
    if (url.includes("play.google.com")) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}referrer=${encodeURIComponent(`tm_ref=${tmRef}`)}`;
    }
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}tm_ref=${tmRef}`;
  } catch {
    return url;
  }
}

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
  const { allowed } = await rateLimit(`r:${ip}`, 100, 60000);
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

  // Generate or reuse tm_ref for conversion attribution
  let tmRef = link.tm_ref;
  if (!tmRef) {
    tmRef = `tm_${generateShortCode()}${generateShortCode()}`;
    supabase.from("tracked_links").update({ tm_ref: tmRef }).eq("id", link.id).then(() => {});
  }

  // Resolve destination: for lead_gen campaigns, redirect to landing page
  let destinationUrl = campaign.destination_url;
  if (campaign.objective === "lead_generation" && campaign.landing_page_id) {
    const { data: lp } = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("id", campaign.landing_page_id)
      .single();
    if (lp?.slug) {
      destinationUrl = `${SITE_URL}/l/${lp.slug}?ref=${code}`;
    }
  }

  // If campaign not active, redirect anyway
  if (campaign.status !== "active") {
    return NextResponse.redirect(appendTmRef(destinationUrl, tmRef));
  }

  // Gather visitor data
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Validate click using click validator
  const { valid, reason } = await validateClick(ip, userAgent, link.id);

  // Social preview bots (WhatsApp, Snapchat, etc.) just redirect — don't record as a click
  if (reason === "social_preview") {
    return NextResponse.redirect(appendTmRef(destinationUrl, tmRef));
  }

  // Insert click record with rejection reason for analytics
  await supabase.from("clicks").insert({
    link_id: link.id,
    ip_address: ip,
    user_agent: userAgent.substring(0, 500),
    is_valid: valid,
    rejection_reason: valid ? null : reason,
  });

  // If valid click, update counters (with budget guard)
  if (valid) {
    // CPA campaigns: clicks are free, no CPC debit
    const isCpa = campaign.pricing_model === "cpa";

    // Check if echo is suspended — don't credit suspended users
    const { data: echoUser } = await supabase
      .from("users")
      .select("status")
      .eq("id", link.echo_id)
      .single();

    if (echoUser?.status === "suspended") {
      await supabase
        .from("clicks")
        .update({ is_valid: false, rejection_reason: "echo_suspended" })
        .eq("link_id", link.id)
        .eq("ip_address", ip)
        .order("created_at", { ascending: false })
        .limit(1);

      return NextResponse.redirect(appendTmRef(destinationUrl, tmRef));
    }

    if (isCpa) {
      // CPA: just count the click, no balance operations
      supabase.from("tracked_links")
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq("id", link.id)
        .then(() => {});

      supabase.rpc("increment_echo_clicks", { p_echo_id: link.echo_id }).then(() => {});

      return NextResponse.redirect(appendTmRef(destinationUrl, tmRef));
    }

    // Pre-check: can the campaign afford this click?
    const preRemaining = campaign.budget - (campaign.spent || 0);
    if (preRemaining < campaign.cpc) {
      // Campaign cannot afford this click — reject it
      await supabase
        .from("clicks")
        .update({ is_valid: false, rejection_reason: "budget_exhausted" })
        .eq("link_id", link.id)
        .eq("ip_address", ip)
        .order("created_at", { ascending: false })
        .limit(1);

      // Auto-complete the campaign
      await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaign.id)
        .eq("status", "active");

      unlockCampaignEarnings(campaign.id, campaign.title || campaign.id).catch(console.error);

      // Refund remaining budget to the brand — atomic + exactly-once (F7)
      await refundCampaignRemaining(supabase, campaign.id, {
        reason: "fin de campagne (budget insuffisant)",
      });

      // Awaited, not fire-and-forget: work started after the redirect is
      // dropped when the serverless function freezes (that is exactly how the
      // pending_earnings drift happened).
      await sendCampaignReport(supabase, campaign.id);

      return NextResponse.redirect(destinationUrl);
    }

    const echoEarnings = Math.floor(
      (campaign.cpc * ECHO_SHARE_PERCENT) / 100
    );

    // increment_click returns false if budget would be exceeded
    Sentry.addBreadcrumb({
      category: "wallet",
      message: "CPC debit attempted",
      level: "info",
      data: { campaign_id: campaign.id, cpc: campaign.cpc, echo_id: link.echo_id, echo_earnings: echoEarnings },
    });
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
    } else {
      // pending_earnings is written ATOMICALLY inside the increment_click RPC
      // (migration 20260823_echo_payout_drift_fix.sql), in the same transaction
      // as the pending_balance credit — so the row can never drift or be dropped
      // by a serverless freeze after the response. Do NOT upsert it here too, or
      // earnings would be double-counted.

      // Log click earning transaction + update click counter (async, don't block redirect)
      Promise.all([
        logWalletTransaction({
          supabase,
          userId: link.echo_id,
          amount: echoEarnings,
          type: "click_earning",
          description: `Clic valide — ${campaign.title}`,
          sourceId: campaign.id,
          sourceType: "campaign",
        }),
        supabase.rpc("increment_echo_clicks", { p_echo_id: link.echo_id }),
      ]).catch(console.error);

      const spentBefore = campaign.spent || 0;
      const spentAfter = spentBefore + campaign.cpc;

      // Post-click check: if remaining budget < CPC after this click, auto-complete + refund
      const postRemaining = campaign.budget - spentAfter;
      if (postRemaining < campaign.cpc && postRemaining > 0 && campaign.batteur_id) {
        // Awaited. This branch moves money (the refund) and closes the
        // campaign; work started and left running past the response is dropped
        // when the serverless function freezes, which is how the
        // pending_earnings drift happened. It costs latency on exactly one
        // click per campaign — the one that ends it.
        try {
          // Auto-complete the campaign (only if still active to prevent race condition)
          await supabase
            .from("campaigns")
            .update({ status: "completed" })
            .eq("id", campaign.id)
            .eq("status", "active");

          unlockCampaignEarnings(campaign.id, campaign.title || campaign.id).catch(console.error);

          // Refund the small remaining balance — atomic + exactly-once (F7)
          await refundCampaignRemaining(supabase, campaign.id, {
            reason: "fin de campagne (budget insuffisant)",
          });

          await sendCampaignReport(supabase, campaign.id);
        } catch (err) {
          console.error("Auto-complete refund error:", err);
        }
      } else if (campaign.batteur_id && crossesBudgetThreshold(campaign.budget, spentBefore, spentAfter)) {
        // The primary budget alert. `crossesBudgetThreshold` is pure
        // arithmetic on numbers already in hand — no query on the hot path —
        // and it is true for exactly one click per campaign, so this awaits on
        // that click and nowhere else. The daily cron is only the safety net
        // (Vercel Hobby caps crons at one run a day, which is far too slow to
        // be the thing a brand relies on).
        await sendBudgetAlert(supabase, campaign.id);
      }
    }
  }

  // Redirect to destination with tm_ref for conversion attribution
  return NextResponse.redirect(appendTmRef(destinationUrl, tmRef));
}
