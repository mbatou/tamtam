import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { alertLeadGenPendingApproval } from "@/lib/notifications/ops-alerts";
import { LEAD_GEN_SETUP_FEE_FCFA } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { campaign_id } = await request.json();
  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id requis" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, authUser.id);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, batteur_id, budget, status, moderation_status, objective, landing_page_id, setup_fee_paid, title, cost_per_lead_fcfa")
    .eq("id", campaign_id)
    .eq("batteur_id", brandId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Seuls les brouillons peuvent etre lances" }, { status: 400 });
  }

  const totalCost = campaign.budget + (campaign.setup_fee_paid ? 0 : LEAD_GEN_SETUP_FEE_FCFA);

  const { data: batteur } = await supabase
    .from("users")
    .select("balance, name")
    .eq("id", brandId)
    .single();

  if (!batteur || (batteur.balance || 0) < totalCost) {
    return NextResponse.json(
      { error: `Solde insuffisant. Montant requis: ${totalCost.toLocaleString()} FCFA.`, code: "INSUFFICIENT_BALANCE" },
      { status: 400 }
    );
  }

  const { error: debitError } = await supabase
    .from("users")
    .update({ balance: batteur.balance - totalCost })
    .eq("id", brandId);

  if (debitError) {
    return NextResponse.json({ error: debitError.message }, { status: 500 });
  }

  const { data: approvalSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "require_campaign_approval")
    .maybeSingle();

  const requireApproval = approvalSetting?.value !== "false";

  await supabase
    .from("campaigns")
    .update({
      moderation_status: requireApproval ? "pending" : "approved",
      status: requireApproval ? "draft" : "active",
      setup_fee_paid: true,
    })
    .eq("id", campaign_id);

  if (campaign.landing_page_id) {
    await supabase
      .from("landing_pages")
      .update({
        landing_page_approved: true,
        status: requireApproval ? "draft" : "active",
      })
      .eq("id", campaign.landing_page_id);
  }

  await logWalletTransaction({
    supabase,
    userId: brandId,
    amount: -campaign.budget,
    type: "campaign_budget_debit",
    description: `Campagne lead gen: ${campaign.title}`,
    sourceId: campaign_id,
    sourceType: "campaign",
  });

  if (!campaign.setup_fee_paid) {
    await logWalletTransaction({
      supabase,
      userId: brandId,
      amount: -LEAD_GEN_SETUP_FEE_FCFA,
      type: "campaign_budget_debit",
      description: `Frais de mise en place lead gen`,
      sourceId: campaign_id,
      sourceType: "campaign_setup_fee",
    });
  }

  if (requireApproval) {
    await alertLeadGenPendingApproval({
      campaignTitle: campaign.title,
      brandName: batteur.name || null,
      budget: campaign.budget,
      costPerLead: campaign.cost_per_lead_fcfa ?? null,
      campaignId: campaign_id,
    });
  }

  return NextResponse.json({
    success: true,
    status: requireApproval ? "pending" : "active",
  });
}
