import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNewCampaignNotification, sendCampaignLiveToBrand } from "@/lib/email";
import { unlockCampaignEarnings } from "@/lib/unlock-earnings";
import { triggerNewCampaign } from "@/lib/notifications/engine";
import { processNotificationQueue } from "@/lib/notifications/sender";
import { sendSmsBatch } from "@/lib/sms/sms-service";
import { requireAuth } from "@/lib/api/auth";
import { awardAmbassadorCommission } from "@/lib/ambassador-commission";
import { debitBrandBudgetLogged, creditBrandWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

async function notifyEchosNewCampaign(supabase: ReturnType<typeof createServiceClient>, campaignTitle: string, cpc: number) {
  try {
    const { data: echos } = await supabase
      .from("users")
      .select("id, name, phone")
      .eq("role", "echo")
      .is("deleted_at", null);
    if (!echos?.length) return;

    // Paginate through all auth users to build email map
    const emailMap = new Map<string, string>();
    let page = 1;
    while (true) {
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ page, perPage: 500 });
      if (!authUsers || authUsers.length === 0) break;
      for (const u of authUsers) {
        if (u.email) emailMap.set(u.id, u.email);
      }
      if (authUsers.length < 500) break;
      page++;
    }

    // Send emails in batches of 10 to avoid EMFILE
    const toSend = echos
      .map((echo) => ({ echo, email: emailMap.get(echo.id) }))
      .filter((e): e is { echo: typeof echos[number]; email: string } => !!e.email);

    for (let i = 0; i < toSend.length; i += 10) {
      const batch = toSend.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(({ echo, email }) =>
          sendNewCampaignNotification({ to: email, echoName: echo.name, campaignTitle, cpc })
        )
      );
    }
  } catch { /* non-blocking */ }
}

async function requireSuperadmin() {
  try {
    return await requireAuth(["superadmin"]);
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, users!batteur_id(name, phone, company_name)")
    .order("created_at", { ascending: false });

  // Get echo counts and click counts per campaign in a single query
  const echoCountMap: Record<string, Set<string>> = {};
  const clickCountMap: Record<string, number> = {};

  const campaignIds = (campaigns || []).map((c: Record<string, unknown>) => c.id as string);

  if (campaignIds.length > 0) {
    // Paginate to avoid Supabase default 1000-row limit
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: links } = await supabase
        .from("tracked_links")
        .select("campaign_id, echo_id, click_count")
        .in("campaign_id", campaignIds)
        .range(offset, offset + PAGE_SIZE - 1);

      if (links && links.length > 0) {
        for (const link of links) {
          if (!echoCountMap[link.campaign_id]) {
            echoCountMap[link.campaign_id] = new Set();
          }
          echoCountMap[link.campaign_id].add(link.echo_id);
          clickCountMap[link.campaign_id] = (clickCountMap[link.campaign_id] || 0) + (link.click_count || 0);
        }
        hasMore = links.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
  }

  const enriched = (campaigns || []).map((c: Record<string, unknown>) => ({
    ...c,
    echo_count: echoCountMap[c.id as string]?.size || 0,
    total_clicks: clickCountMap[c.id as string] || 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const authUser = auth.authUser;
  const body = await request.json();
  const { action } = body;

  // --- Create a campaign on behalf of a brand ---
  if (action === "create") {
    const { batteur_id, title, description, destination_url, cpc, budget, objective } = body;
    if (!batteur_id || !title || !destination_url || !cpc || !budget) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Verify the batteur exists
    const { data: batteur } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", batteur_id)
      .single();

    if (!batteur || batteur.role !== "batteur") {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Atomically deduct from batteur balance
    const createDebit = await debitBrandBudgetLogged(supabase, {
      brandId: batteur_id,
      amount: parseInt(budget),
      description: `Campaign created by admin: ${title}`,
      createdBy: authUser.id,
    });
    if (!createDebit.ok) {
      if (createDebit.reason === "insufficient_balance") {
        return NextResponse.json({ error: "Insufficient brand balance" }, { status: 400 });
      }
      return NextResponse.json({ error: createDebit.message }, { status: 500 });
    }

    // Create campaign pre-approved
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        batteur_id,
        title,
        description: description || null,
        destination_url,
        cpc: parseInt(cpc),
        budget: parseInt(budget),
        spent: 0,
        status: "active",
        moderation_status: "approved",
        moderated_by: authUser.id,
        moderated_at: new Date().toISOString(),
        objective: objective || "traffic",
      })
      .select()
      .single();

    if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: authUser.id,
        action: "campaign_create",
        target_type: "campaign",
        target_id: campaign.id,
        details: { title, batteur_id, budget },
      });
    } catch { /* admin_activity_log may not exist yet */ }

    // Notify brand that campaign is live
    try {
      const { data: brandUser } = await supabase.from("users").select("name").eq("id", batteur_id).single();
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(batteur_id);
      if (authUser?.email && brandUser) {
        sendCampaignLiveToBrand({
          to: authUser.email,
          brandName: brandUser.name,
          campaignTitle: title,
          budget: parseInt(budget),
          cpc: parseInt(cpc),
        }).catch(() => {});
      }
    } catch { /* non-blocking */ }

    // Notify echos about new campaign
    notifyEchosNewCampaign(supabase, title, parseInt(cpc));

    // Ambassador commission for superadmin-created campaigns (LUP-80)
    await awardAmbassadorCommission(supabase, {
      brandUserId: batteur_id,
      campaignId: campaign.id,
      campaignBudget: parseInt(budget),
    });

    return NextResponse.json({ success: true, campaign });
  }

  // --- Moderate existing campaign ---
  const { campaign_id, reason } = body;

  if (!campaign_id || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Get current campaign state
  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("id, title, status, moderation_status, budget, spent, cpc, batteur_id, objective, setup_fee_paid, setup_fee_amount_fcfa, landing_page_id, target_cities")
    .eq("id", campaign_id)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    moderated_by: authUser.id,
    moderated_at: new Date().toISOString(),
  };

  switch (action) {
    case "approve": {
      updates.moderation_status = "approved";
      updates.status = "active";

      // Only deduct budget if it wasn't already deducted at submission.
      // Campaigns with moderation_status "pending" had their budget deducted
      // when the brand submitted them. Pure drafts (moderation_status is null)
      // need budget deducted now.
      if (campaign.status === "draft" && campaign.moderation_status !== "pending") {
        const approveDebit = await debitBrandBudgetLogged(supabase, {
          brandId: campaign.batteur_id,
          amount: campaign.budget,
          description: `Approbation campagne par admin`,
          sourceId: campaign_id,
          createdBy: authUser.id,
        });
        if (!approveDebit.ok) {
          if (approveDebit.reason === "insufficient_balance") {
            return NextResponse.json({
              error: `Insufficient brand balance (${campaign.budget} FCFA required)`,
            }, { status: 400 });
          }
          return NextResponse.json({ error: approveDebit.message }, { status: 500 });
        }
      }

      // Activate landing page for lead gen campaigns
      if (campaign.objective === "lead_generation" && campaign.landing_page_id) {
        await supabase
          .from("landing_pages")
          .update({ status: "active" })
          .eq("id", campaign.landing_page_id);
      }
      break;
    }
    case "reject": {
      // Guard: only reject if campaign is actually pending review
      if (campaign.moderation_status === "rejected") {
        return NextResponse.json({
          error: "This campaign is already rejected",
        }, { status: 400 });
      }

      updates.moderation_status = "rejected";
      updates.status = "rejected";
      updates.moderation_reason = reason || "Rejected by admin";

      // Idempotent refund: check if a refund was already issued for this campaign
      const { data: existingRefund } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("source_id", campaign_id)
        .eq("type", "campaign_budget_refund")
        .limit(1);

      if (!existingRefund || existingRefund.length === 0) {
        // Only refund if budget was actually deducted (check for existing debit)
        const { data: existingDebit } = await supabase
          .from("wallet_transactions")
          .select("id, amount")
          .eq("source_id", campaign_id)
          .eq("type", "campaign_budget_debit")
          .limit(1);

        if (existingDebit && existingDebit.length > 0) {
          const unspent = campaign.budget - (campaign.spent || 0);
          if (unspent > 0) {
            await creditBrandWallet(supabase, {
              brandId: campaign.batteur_id,
              amount: unspent,
              description: `Refund for rejected campaign by admin`,
              sourceId: campaign_id,
              createdBy: authUser.id,
            });
          }
        }
        // else: no debit found = draft never submitted = no refund needed
      }
      // else: refund already issued, skip (idempotent)

      // Refund setup fee for lead gen campaigns
      if (campaign.objective === "lead_generation" && campaign.setup_fee_paid && campaign.setup_fee_amount_fcfa) {
        const { data: existingSetupRefund } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("source_id", campaign_id)
          .eq("source_type", "campaign_setup_fee")
          .eq("type", "campaign_budget_refund")
          .limit(1);

        if (!existingSetupRefund || existingSetupRefund.length === 0) {
          await creditBrandWallet(supabase, {
            brandId: campaign.batteur_id,
            amount: campaign.setup_fee_amount_fcfa,
            description: `Remboursement frais landing page (campagne rejetee)`,
            sourceId: campaign_id,
            sourceType: "campaign_setup_fee",
            createdBy: authUser.id,
          });
        }
      }
      break;
    }
    case "pause": {
      if (campaign.status !== "active") {
        return NextResponse.json({ error: `Cannot pause — status: ${campaign.status}` }, { status: 400 });
      }
      updates.status = "paused";
      unlockCampaignEarnings(campaign_id, campaign.title || campaign_id).catch(console.error);
      break;
    }
    case "resume": {
      if (campaign.status !== "paused") {
        return NextResponse.json({ error: `Cannot resume — status: ${campaign.status}` }, { status: 400 });
      }
      const remaining = campaign.budget - (campaign.spent || 0);
      if (remaining < campaign.cpc) {
        return NextResponse.json({
          error: `Remaining budget (${remaining} FCFA) is less than CPC (${campaign.cpc} FCFA). Cannot resume.`,
        }, { status: 400 });
      }
      updates.status = "active";
      break;
    }
    case "stop": {
      if (!["active", "paused"].includes(campaign.status)) {
        return NextResponse.json({ error: `Cannot stop — status: ${campaign.status}` }, { status: 400 });
      }
      updates.status = "completed";
      unlockCampaignEarnings(campaign_id, campaign.title || campaign_id).catch(console.error);

      const stopRemaining = campaign.budget - (campaign.spent || 0);

      // After updating the campaign, refund remaining budget to brand
      if (stopRemaining > 0 && campaign.batteur_id) {
        // Idempotency: check if a stop refund already exists
        const { data: existingRefund } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("source_id", campaign_id)
          .eq("type", "campaign_budget_refund")
          .ilike("description", "%arrêtée%")
          .limit(1);

        if (!existingRefund || existingRefund.length === 0) {
          await creditBrandWallet(supabase, {
            brandId: campaign.batteur_id,
            amount: stopRemaining,
            description: `Refund for stopped campaign: ${campaign.title || campaign.id} (${stopRemaining} FCFA remaining)`,
            sourceId: campaign_id,
            createdBy: authUser.id,
          });
        }
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", campaign_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log action
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: authUser.id,
      action: `campaign_${action}`,
      target_type: "campaign",
      target_id: campaign_id,
      details: { reason },
    });
  } catch { /* admin_activity_log may not exist yet */ }

  // --- Ambassador commission (LUP-80) ---
  if (action === "approve") {
    await awardAmbassadorCommission(supabase, {
      brandUserId: campaign.batteur_id,
      campaignId: campaign.id,
      campaignBudget: campaign.budget,
    });
  }

  // Send engagement emails based on action
  if (action === "approve") {
    // Notify brand that campaign is live
    try {
      const { data: campaignFull } = await supabase
        .from("campaigns")
        .select("title, cpc, budget, batteur_id")
        .eq("id", campaign_id)
        .single();
      if (campaignFull) {
        const { data: brandUser } = await supabase.from("users").select("name").eq("id", campaignFull.batteur_id).single();
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(campaignFull.batteur_id);
        if (authUser?.email && brandUser) {
          sendCampaignLiveToBrand({
            to: authUser.email,
            brandName: brandUser.name,
            campaignTitle: campaignFull.title,
            budget: campaignFull.budget,
            cpc: campaignFull.cpc,
          }).catch(() => {});
        }
        // Notify echos about new campaign
        notifyEchosNewCampaign(supabase, campaignFull.title, campaignFull.cpc);
        // Smart push notifications — enqueue + send
        triggerNewCampaign(supabase, campaign_id)
          .then(() => processNotificationQueue(supabase))
          .catch(() => {});
        // SMS blast to eligible echos
        sendSmsBatch({
          type: "new_campaign",
          campaignId: campaign_id,
          segment: "all",
          cityFilter: campaign.target_cities?.length ? campaign.target_cities : undefined,
          vars: { cpc: campaignFull.cpc || 50 },
        }).catch((err) => console.error("[SMS] Campaign blast failed:", err));
      }
    } catch { /* non-blocking */ }
  }

  const refunded = action === "stop" ? campaign.budget - (campaign.spent || 0) : 0;
  return NextResponse.json({ success: true, refunded });
}
