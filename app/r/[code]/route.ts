import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ECHO_SHARE_PERCENT, SITE_URL } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { validateClick } from "@/lib/click-validator";
import * as Sentry from "@sentry/nextjs";
import { processGamification } from "@/lib/gamification";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { generateShortCode } from "@/lib/utils";

async function updateChallengeParticipation(supabase: ReturnType<typeof getSupabase>, echoId: string) {
  const now = new Date().toISOString();
  const { data: activeChallenge } = await supabase
    .from("challenges")
    .select("id, clicks_per_reward")
    .eq("status", "active")
    .lte("start_date", now)
    .gte("end_date", now)
    .single();

  if (!activeChallenge) return;

  const { data: existing } = await supabase
    .from("challenge_participants")
    .select("id, valid_clicks")
    .eq("challenge_id", activeChallenge.id)
    .eq("echo_id", echoId)
    .single();

  if (existing) {
    await supabase
      .from("challenge_participants")
      .update({ valid_clicks: existing.valid_clicks + 1 })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("challenge_participants")
      .insert({
        challenge_id: activeChallenge.id,
        echo_id: echoId,
        valid_clicks: 1,
      });
  }
}

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

      // Refund remaining balance to brand (if any)
      if (preRemaining > 0 && campaign.batteur_id) {
        const { data: existingRefund } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("source_id", campaign.id)
          .eq("type", "campaign_budget_refund")
          .ilike("description", "%fin de campagne%")
          .limit(1);

        if (!existingRefund || existingRefund.length === 0) {
          await supabase.rpc("increment_balance", {
            p_user_id: campaign.batteur_id,
            p_amount: preRemaining,
          });

          await logWalletTransaction({
            supabase,
            userId: campaign.batteur_id,
            amount: preRemaining,
            type: "campaign_budget_refund",
            description: `Remboursement fin de campagne: ${campaign.title || campaign.id} (${preRemaining} FCFA restants < CPC ${campaign.cpc} FCFA)`,
            sourceId: campaign.id,
            sourceType: "campaign",
          });
        }
      }

      return NextResponse.redirect(destinationUrl);
    }

    // Apply tier bonus to echo earnings
    const { data: echo } = await supabase
      .from("users")
      .select("tier_bonus_percent")
      .eq("id", link.echo_id)
      .single();

    const baseShare = Math.floor(
      (campaign.cpc * ECHO_SHARE_PERCENT) / 100
    );
    const tierBonus = Math.round(
      baseShare * ((echo?.tier_bonus_percent || 0) / 100)
    );
    const echoEarnings = baseShare + tierBonus;

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
      // Log click earning transaction + update click counter + gamification (async, don't block redirect)
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
      ])
        .then(() => processGamification(link.echo_id))
        .catch(console.error);

      // Update challenge participation if there's an active challenge
      updateChallengeParticipation(supabase, link.echo_id).catch(console.error);

      // Post-click check: if remaining budget < CPC after this click, auto-complete + refund
      const postRemaining = campaign.budget - ((campaign.spent || 0) + campaign.cpc);
      if (postRemaining < campaign.cpc && postRemaining > 0 && campaign.batteur_id) {
        (async () => {
          try {
            // Auto-complete the campaign (only if still active to prevent race condition)
            await supabase
              .from("campaigns")
              .update({ status: "completed" })
              .eq("id", campaign.id)
              .eq("status", "active");

            // Refund the small remaining balance (idempotent)
            const { data: existingRefund } = await supabase
              .from("wallet_transactions")
              .select("id")
              .eq("source_id", campaign.id)
              .eq("type", "campaign_budget_refund")
              .ilike("description", "%fin de campagne%")
              .limit(1);

            if (!existingRefund || existingRefund.length === 0) {
              await supabase.rpc("increment_balance", {
                p_user_id: campaign.batteur_id,
                p_amount: postRemaining,
              });
              await logWalletTransaction({
                supabase,
                userId: campaign.batteur_id,
                amount: postRemaining,
                type: "campaign_budget_refund",
                description: `Remboursement fin de campagne: ${campaign.title || campaign.id} (${postRemaining} FCFA restants < CPC ${campaign.cpc} FCFA)`,
                sourceId: campaign.id,
                sourceType: "campaign",
              });
            }
          } catch (err) {
            console.error("Auto-complete refund error:", err);
          }
        })();
      }
    }
  }

  // Redirect to destination with tm_ref for conversion attribution
  return NextResponse.redirect(appendTmRef(destinationUrl, tmRef));
}
