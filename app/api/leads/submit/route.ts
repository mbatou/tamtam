import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { submitLeadSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { scoreLead } from "@/lib/lead-fraud-scorer";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { notifyNewLead } from "@/lib/notifications/lead-notification";
import { ECHO_LEAD_SHARE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/leads/submit — Public lead capture endpoint
// Flow: rate limit → validate → dedup → fraud score → insert → debit CPL → notify
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Rate limit: max 5 submissions per IP per hour
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(`lead_submit:${ip}`, 5, 3600000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de soumissions. Reessayez plus tard." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = submitLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Donnees invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { landing_page_id, name, phone, email, custom_fields, ref, page_load_ts } = parsed.data;
  const userAgent = req.headers.get("user-agent") || "";

  // Fetch landing page + campaign
  const { data: landingPage } = await supabaseAdmin
    .from("landing_pages")
    .select("id, campaign_id, batteur_id, notification_phone, notification_email, status, form_fields")
    .eq("id", landing_page_id)
    .is("deleted_at", null)
    .single();

  if (!landingPage || landingPage.status !== "active") {
    return NextResponse.json({ error: "Page introuvable ou inactive" }, { status: 404 });
  }

  // Fetch campaign to check status and get CPL
  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("id, status, cost_per_lead_fcfa, title, batteur_id")
    .eq("id", landingPage.campaign_id)
    .single();

  if (!campaign || campaign.status !== "active") {
    return NextResponse.json({ error: "Campagne inactive" }, { status: 400 });
  }

  // Dedup: same phone on same landing page within 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingLead } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("landing_page_id", landing_page_id)
    .eq("phone", phone)
    .gte("created_at", twentyFourHoursAgo)
    .limit(1);

  if (existingLead?.length) {
    // Silent success (don't reveal duplicate to spammers)
    return NextResponse.json({ success: true });
  }

  // Resolve echo attribution via ref (tracked_link short_code)
  let trackedLinkId: string | null = null;
  let echoId: string | null = null;

  if (ref) {
    const { data: link } = await supabaseAdmin
      .from("tracked_links")
      .select("id, echo_id")
      .eq("short_code", ref)
      .eq("campaign_id", campaign.id)
      .single();

    if (link) {
      trackedLinkId = link.id;
      echoId = link.echo_id;
    }
  }

  // Fraud scoring
  const fraudResult = await scoreLead(supabaseAdmin, {
    ip_address: ip,
    user_agent: userAgent,
    phone,
    landing_page_id,
    page_load_ts,
  });

  // Country check: add 15 if not SN
  const country = req.headers.get("x-vercel-ip-country") || "";
  let finalScore = fraudResult.score;
  const factors = [...fraudResult.factors];
  if (country && country !== "SN") {
    finalScore += 15;
    factors.push(`country:${country}`);
  }

  // Determine final decision
  let status: "pending" | "verified" | "rejected" | "flagged";
  if (finalScore >= 70) {
    status = "rejected";
  } else if (finalScore >= 30) {
    status = "flagged";
  } else {
    status = "verified";
  }

  // Insert lead
  const { data: lead, error: insertError } = await supabaseAdmin
    .from("leads")
    .insert({
      landing_page_id,
      campaign_id: campaign.id,
      tracked_link_id: trackedLinkId,
      echo_id: echoId,
      name,
      phone,
      email: email || null,
      custom_fields: custom_fields || null,
      ip_address: ip,
      user_agent: userAgent,
      consent_given: true,
      fraud_score: finalScore,
      status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Lead insert error:", insertError);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  // If verified and echo attributed: debit CPL from campaign, credit echo
  if (status === "verified" && echoId && campaign.cost_per_lead_fcfa) {
    const cpl = campaign.cost_per_lead_fcfa;
    const echoEarnings = Math.floor(cpl * ECHO_LEAD_SHARE_PERCENT / 100);

    const { data: debitSuccess } = await supabaseAdmin.rpc("debit_campaign_for_lead", {
      p_campaign_id: campaign.id,
      p_cpl: cpl,
      p_echo_id: echoId,
      p_echo_earnings: echoEarnings,
    });

    if (debitSuccess) {
      // Update lead payout info
      await supabaseAdmin
        .from("leads")
        .update({ payout_amount: echoEarnings, payout_status: "paid" })
        .eq("id", lead.id);

      // Log wallet transaction for echo
      await logWalletTransaction({
        supabase: supabaseAdmin,
        userId: echoId,
        amount: echoEarnings,
        type: "lead_earning",
        description: `Lead verifie: ${name}`,
        sourceId: lead.id,
        sourceType: "lead",
      });
    } else {
      // Budget exhausted — lead is still captured but unpaid
      await supabaseAdmin
        .from("leads")
        .update({ payout_status: "failed", rejection_reason: "budget_exhausted" })
        .eq("id", lead.id);
    }
  }

  // Notify brand (non-blocking, only for verified leads)
  if (status === "verified") {
    // Get brand name
    const { data: brand } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", campaign.batteur_id)
      .single();

    notifyNewLead({
      leadName: name,
      leadPhone: phone,
      leadEmail: email,
      campaignTitle: campaign.title,
      brandName: brand?.name || "Marque",
      notificationEmail: landingPage.notification_email,
      notificationPhone: landingPage.notification_phone,
    }).catch(() => {});
  }

  // Always return success (don't leak status to potential spammers)
  return NextResponse.json({ success: true });
}
