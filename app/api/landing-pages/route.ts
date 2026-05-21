import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createLeadCampaignSchema, createLeadCampaignDraftSchema } from "@/lib/validations";
import { generateLandingPageContent } from "@/lib/ai/landing-page-generator";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { sendEmail } from "@/lib/email";
import { LEAD_GEN_SETUP_FEE_FCFA } from "@/lib/constants";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/landing-pages — Create a lead generation campaign + landing page
// Flow: validate → check balance → debit (budget + setup fee) → AI gen → create campaign → create landing page
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json();
  const isDraft = body.save_as_draft === true;

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  // Draft mode: relaxed validation, skip AI generation and landing page
  if (isDraft) {
    const parsed = createLeadCampaignDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        batteur_id: brandId,
        title: data.title,
        description: data.description || null,
        destination_url: data.destination_url || "",
        creative_urls: data.creative_urls || [],
        cpc: data.cpc || 25,
        cost_per_lead_fcfa: data.cost_per_lead_fcfa || null,
        budget: data.budget || 15000,
        status: "draft",
        moderation_status: null,
        objective: "lead_generation",
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        target_cities: data.target_cities?.length ? data.target_cities : null,
      })
      .select()
      .single();

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 500 });
    }

    return NextResponse.json({ campaign, landing_page: null }, { status: 201 });
  }

  // Active mode: full validation
  const parsed = createLeadCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Donnees invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const isPreviewMode = body.preview_mode === true;

  Sentry.setContext("ai_generation", {
    brand_id: brandId,
    budget: data.budget,
    setup_fee: LEAD_GEN_SETUP_FEE_FCFA,
  });

  // Total cost = budget + setup fee
  const totalCost = data.budget + LEAD_GEN_SETUP_FEE_FCFA;

  // Check balance covers budget + setup fee (even in preview mode, verify they can afford it)
  const { data: batteur } = await supabase
    .from("users")
    .select("balance, name")
    .eq("id", brandId)
    .single();

  if (!batteur || (batteur.balance || 0) < totalCost) {
    return NextResponse.json(
      { error: `Solde insuffisant. Montant requis: ${totalCost.toLocaleString()} FCFA (budget + frais de mise en place).`, code: "INSUFFICIENT_BALANCE" },
      { status: 400 }
    );
  }

  // Debit balance only if NOT preview mode (preview = draft with AI gen, no charge yet)
  if (!isPreviewMode) {
    const { error: debitError } = await supabase
      .from("users")
      .update({ balance: batteur.balance - totalCost })
      .eq("id", brandId);

    if (debitError) {
      return NextResponse.json({ error: debitError.message }, { status: 500 });
    }
  }

  // Generate AI content
  const aiResult = await generateLandingPageContent(
    {
      brand_name: data.brand_name,
      brand_industry: data.brand_industry,
      campaign_description: data.campaign_description_for_ai,
      target_audience: data.target_audience,
      brand_color: data.brand_color,
      form_field_labels: data.form_fields.map((f) => f.label),
    },
    brandId
  );

  // Create or update campaign (if launching from a draft)
  const existingCampaignId = body.existing_campaign_id;
  let campaign: { id: string; [key: string]: unknown };

  if (existingCampaignId) {
    // Launching an existing draft — update it
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id, batteur_id, status")
      .eq("id", existingCampaignId)
      .eq("batteur_id", brandId)
      .in("status", ["draft", "rejected"])
      .single();

    if (!existing) {
      if (!isPreviewMode) await supabase.from("users").update({ balance: batteur.balance }).eq("id", brandId);
      return NextResponse.json({ error: "Brouillon introuvable" }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("campaigns")
      .update({
        title: data.title,
        description: data.description || null,
        destination_url: data.destination_url,
        creative_urls: data.creative_urls || [],
        cpc: data.cpc,
        cost_per_lead_fcfa: data.cost_per_lead_fcfa,
        budget: data.budget,
        moderation_status: isPreviewMode ? null : "pending",
        status: "draft",
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        target_cities: data.target_cities?.length ? data.target_cities : null,
        setup_fee_paid: isPreviewMode ? false : true,
        setup_fee_amount_fcfa: LEAD_GEN_SETUP_FEE_FCFA,
      })
      .eq("id", existingCampaignId)
      .select()
      .single();

    if (updateErr) {
      await supabase.from("users").update({ balance: batteur.balance }).eq("id", brandId);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    campaign = updated!;
  } else {
    // New campaign
    const { data: newCampaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        batteur_id: brandId,
        title: data.title,
        description: data.description || null,
        destination_url: data.destination_url,
        creative_urls: data.creative_urls || [],
        cpc: data.cpc,
        cost_per_lead_fcfa: data.cost_per_lead_fcfa,
        budget: data.budget,
        status: "draft",
        moderation_status: isPreviewMode ? null : "pending",
        objective: "lead_generation",
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        target_cities: data.target_cities?.length ? data.target_cities : null,
        setup_fee_paid: isPreviewMode ? false : true,
        setup_fee_amount_fcfa: LEAD_GEN_SETUP_FEE_FCFA,
      })
      .select()
      .single();

    if (campaignError) {
      if (!isPreviewMode) await supabase.from("users").update({ balance: batteur.balance }).eq("id", brandId);
      return NextResponse.json({ error: campaignError.message }, { status: 500 });
    }

    campaign = newCampaign!;
  }

  // Create landing page
  const slug = generateSlug(data.brand_name);
  const { data: landingPage, error: lpError } = await supabase
    .from("landing_pages")
    .insert({
      campaign_id: campaign.id,
      batteur_id: brandId,
      slug,
      headline: aiResult.result.headline,
      subheadline: aiResult.result.subheadline,
      description: aiResult.result.description,
      cta_text: aiResult.result.cta_text,
      brand_color: data.brand_color,
      brand_accent_color: data.brand_accent_color || null,
      logo_url: data.logo_url || null,
      hero_image_url: data.hero_image_url || null,
      form_fields: data.form_fields,
      notification_phone: data.notification_phone || null,
      notification_email: data.notification_email || null,
      ai_generation_id: aiResult.cacheId,
      template: data.template || "simple",
      landing_page_approved: false,
      status: "active",
    })
    .select()
    .single();

  if (lpError) {
    // Rollback: restore balance; only delete campaign if we created it
    if (!existingCampaignId) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);
    }
    if (!isPreviewMode) {
      await supabase.from("users").update({ balance: batteur.balance }).eq("id", brandId);
    }
    return NextResponse.json({ error: lpError.message }, { status: 500 });
  }

  // Link campaign to landing page
  await supabase
    .from("campaigns")
    .update({ landing_page_id: landingPage.id })
    .eq("id", campaign.id);

  // Log wallet transactions + notify only when actually launching (not preview)
  if (!isPreviewMode) {
    await logWalletTransaction({
      supabase,
      userId: brandId,
      amount: -data.budget,
      type: "campaign_budget_debit",
      description: `Campagne lead gen: ${data.title}`,
      sourceId: campaign.id,
      sourceType: "campaign",
    });

    await logWalletTransaction({
      supabase,
      userId: brandId,
      amount: -LEAD_GEN_SETUP_FEE_FCFA,
      type: "campaign_budget_debit",
      description: `Frais de mise en place lead gen`,
      sourceId: campaign.id,
      sourceType: "campaign_setup_fee",
    });

    sendEmail({
      to: "support@tamma.me",
      subject: `Nouvelle campagne Lead Gen: ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #D35400;">Nouvelle campagne Lead Generation</h2>
          <p><strong>Marque:</strong> ${batteur.name || data.brand_name}</p>
          <p><strong>Campagne:</strong> ${data.title}</p>
          <p><strong>Budget:</strong> ${data.budget.toLocaleString()} FCFA</p>
          <p><strong>CPL:</strong> ${data.cost_per_lead_fcfa} FCFA</p>
          <p><strong>CPC:</strong> ${data.cpc} FCFA</p>
          <p><strong>Landing page:</strong> /l/${landingPage.slug}</p>
          <p style="margin-top: 20px;">
            <a href="https://www.tamma.me/superadmin/campaigns" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Valider maintenant</a>
          </p>
        </div>
      `,
    }).catch(() => {});
  }

  return NextResponse.json({ campaign, landing_page: landingPage }, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET /api/landing-pages — List landing pages for the current brand
// ---------------------------------------------------------------------------

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("batteur_id", brandId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// PATCH /api/landing-pages — Update landing page content (inline editor)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json();
  const { landing_page_id, ...updates } = body;

  if (!landing_page_id || typeof landing_page_id !== "string") {
    return NextResponse.json({ error: "landing_page_id requis" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { data: existing } = await supabase
    .from("landing_pages")
    .select("id, batteur_id")
    .eq("id", landing_page_id)
    .eq("batteur_id", brandId)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Landing page introuvable" }, { status: 404 });
  }

  const allowedFields: Record<string, boolean> = {
    headline: true,
    subheadline: true,
    description: true,
    cta_text: true,
    brand_color: true,
    brand_accent_color: true,
    logo_url: true,
    hero_image_url: true,
    form_fields: true,
    template: true,
    landing_page_approved: true,
  };

  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields[key]) {
      safeUpdates[key] = value;
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("landing_pages")
    .update(safeUpdates)
    .eq("id", landing_page_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // When LP is approved, auto-activate campaign if approval is not required
  if (safeUpdates.landing_page_approved === true && updated.campaign_id) {
    const { data: approvalSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "require_campaign_approval")
      .maybeSingle();

    if (approvalSetting?.value === "false") {
      await supabase
        .from("campaigns")
        .update({ moderation_status: "approved", status: "active" })
        .eq("id", updated.campaign_id);
    }
  }

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(brandName: string): string {
  const base = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base}-${suffix}`;
}
