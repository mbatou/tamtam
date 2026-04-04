import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendNewCampaignNotification, sendCampaignLiveToBrand } from "@/lib/email";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

async function notifyEchosNewCampaign(supabase: ReturnType<typeof createServiceClient>, campaignTitle: string, cpc: number) {
  try {
    const { data: echos } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "echo");
    if (!echos?.length) return;

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(authUsers?.map((u) => [u.id, u.email]) || []);

    for (const echo of echos) {
      const email = emailMap.get(echo.id);
      if (email) {
        sendNewCampaignNotification({ to: email, echoName: echo.name, campaignTitle, cpc }).catch(() => {});
      }
    }
  } catch { /* non-blocking */ }
}

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
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
  const session = auth.session;
  const body = await request.json();
  const { action } = body;

  // --- Create a campaign on behalf of a brand ---
  if (action === "create") {
    const { batteur_id, title, description, destination_url, cpc, budget, objective } = body;
    if (!batteur_id || !title || !destination_url || !cpc || !budget) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Verify the batteur exists and has enough balance
    const { data: batteur } = await supabase
      .from("users")
      .select("id, balance, role")
      .eq("id", batteur_id)
      .single();

    if (!batteur || batteur.role !== "batteur") {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    if ((batteur.balance || 0) < budget) {
      return NextResponse.json({ error: `Insufficient balance (${batteur.balance || 0} FCFA available)` }, { status: 400 });
    }

    // Deduct from batteur balance
    const { error: balErr } = await supabase
      .from("users")
      .update({ balance: (batteur.balance || 0) - budget })
      .eq("id", batteur_id);
    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 });

    await logWalletTransaction({
      supabase,
      userId: batteur_id,
      amount: -parseInt(budget),
      type: "campaign_budget_debit",
      description: `Campaign created by admin: ${title}`,
      sourceType: "campaign",
      createdBy: session.user.id,
    });

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
        moderated_by: session.user.id,
        moderated_at: new Date().toISOString(),
        objective: objective || "traffic",
      })
      .select()
      .single();

    if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
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
    try {
      const { data: brand } = await supabase
        .from("users")
        .select("referred_by_ambassador")
        .eq("id", batteur_id)
        .single();

      if (brand?.referred_by_ambassador) {
        const { data: ambassador } = await supabase
          .from("ambassadors")
          .select("id, commission_rate")
          .eq("id", brand.referred_by_ambassador)
          .eq("status", "active")
          .single();

        if (ambassador) {
          const commissionAmount = Math.round(parseInt(budget) * (ambassador.commission_rate / 100));
          const { data: referral } = await supabase
            .from("ambassador_referrals")
            .select("id, first_campaign_at, total_campaigns, total_commission_earned")
            .eq("ambassador_id", ambassador.id)
            .eq("brand_user_id", batteur_id)
            .single();

          if (referral) {
            const refUpdates: Record<string, unknown> = {
              total_campaigns: (referral.total_campaigns || 0) + 1,
              status: "active",
              total_commission_earned: (referral.total_commission_earned || 0) + commissionAmount,
            };
            if (!referral.first_campaign_at) refUpdates.first_campaign_at = new Date().toISOString();
            await supabase.from("ambassador_referrals").update(refUpdates).eq("id", referral.id);

            await supabase.from("ambassador_commissions").insert({
              ambassador_id: ambassador.id,
              referral_id: referral.id,
              campaign_id: campaign.id,
              campaign_budget: parseInt(budget),
              commission_rate: ambassador.commission_rate,
              commission_amount: commissionAmount,
              status: "earned",
            });

            const { data: amb } = await supabase.from("ambassadors").select("total_earned").eq("id", ambassador.id).single();
            if (amb) {
              await supabase.from("ambassadors").update({
                total_earned: (amb.total_earned || 0) + commissionAmount,
                updated_at: new Date().toISOString(),
              }).eq("id", ambassador.id);
            }
          }
        }
      }
    } catch { /* Non-blocking */ }

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
    .select("id, title, status, moderation_status, budget, spent, cpc, batteur_id")
    .eq("id", campaign_id)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    moderated_by: session.user.id,
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
        const { data: batteur } = await supabase
          .from("users")
          .select("balance")
          .eq("id", campaign.batteur_id)
          .single();

        if (!batteur || (batteur.balance || 0) < campaign.budget) {
          return NextResponse.json({
            error: `Insufficient brand balance (${batteur?.balance || 0} FCFA available, ${campaign.budget} FCFA required)`,
          }, { status: 400 });
        }

        const { error: balErr } = await supabase
          .from("users")
          .update({ balance: (batteur.balance || 0) - campaign.budget })
          .eq("id", campaign.batteur_id);

        if (balErr) {
          return NextResponse.json({ error: balErr.message }, { status: 500 });
        }

        await logWalletTransaction({
          supabase,
          userId: campaign.batteur_id,
          amount: -campaign.budget,
          type: "campaign_budget_debit",
          description: `Approbation campagne par admin`,
          sourceId: campaign_id,
          sourceType: "campaign",
          createdBy: session.user.id,
        });
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
            await supabase.rpc("increment_balance", {
              p_user_id: campaign.batteur_id,
              p_amount: unspent,
            });

            await logWalletTransaction({
              supabase,
              userId: campaign.batteur_id,
              amount: unspent,
              type: "campaign_budget_refund",
              description: `Refund for rejected campaign by admin`,
              sourceId: campaign_id,
              sourceType: "campaign",
              createdBy: session.user.id,
            });
          }
        }
        // else: no debit found = draft never submitted = no refund needed
      }
      // else: refund already issued, skip (idempotent)
      break;
    }
    case "pause": {
      if (campaign.status !== "active") {
        return NextResponse.json({ error: `Cannot pause — status: ${campaign.status}` }, { status: 400 });
      }
      updates.status = "paused";
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
          await supabase.rpc("increment_balance", {
            p_user_id: campaign.batteur_id,
            p_amount: stopRemaining,
          });

          await logWalletTransaction({
            supabase,
            userId: campaign.batteur_id,
            amount: stopRemaining,
            type: "campaign_budget_refund",
            description: `Refund for stopped campaign: ${campaign.title || campaign.id} (${stopRemaining} FCFA remaining)`,
            sourceId: campaign_id,
            sourceType: "campaign",
            createdBy: session.user.id,
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
      admin_id: session.user.id,
      action: `campaign_${action}`,
      target_type: "campaign",
      target_id: campaign_id,
      details: { reason },
    });
  } catch { /* admin_activity_log may not exist yet */ }

  // --- Ambassador commission (LUP-80) ---
  if (action === "approve") {
    try {
      const brandId = campaign.batteur_id;
      const { data: brand } = await supabase
        .from("users")
        .select("referred_by_ambassador")
        .eq("id", brandId)
        .single();

      if (brand?.referred_by_ambassador) {
        const { data: ambassador } = await supabase
          .from("ambassadors")
          .select("id, commission_rate")
          .eq("id", brand.referred_by_ambassador)
          .eq("status", "active")
          .single();

        if (ambassador) {
          const commissionAmount = Math.round(campaign.budget * (ambassador.commission_rate / 100));

          const { data: referral } = await supabase
            .from("ambassador_referrals")
            .select("id, first_campaign_at, total_campaigns, total_commission_earned")
            .eq("ambassador_id", ambassador.id)
            .eq("brand_user_id", brandId)
            .single();

          if (referral) {
            // Update referral record
            const refUpdates: Record<string, unknown> = {
              total_campaigns: (referral.total_campaigns || 0) + 1,
              status: "active",
              total_commission_earned: (referral.total_commission_earned || 0) + commissionAmount,
            };
            if (!referral.first_campaign_at) {
              refUpdates.first_campaign_at = new Date().toISOString();
            }
            await supabase.from("ambassador_referrals").update(refUpdates).eq("id", referral.id);

            // Log commission
            await supabase.from("ambassador_commissions").insert({
              ambassador_id: ambassador.id,
              referral_id: referral.id,
              campaign_id: campaign.id,
              campaign_budget: campaign.budget,
              commission_rate: ambassador.commission_rate,
              commission_amount: commissionAmount,
              status: "earned",
            });

            // Update ambassador totals
            const { data: amb } = await supabase
              .from("ambassadors")
              .select("total_earned")
              .eq("id", ambassador.id)
              .single();

            if (amb) {
              await supabase.from("ambassadors").update({
                total_earned: (amb.total_earned || 0) + commissionAmount,
                updated_at: new Date().toISOString(),
              }).eq("id", ambassador.id);
            }
          }
        }
      }
    } catch { /* Non-blocking: ambassador commission failure should not block approval */ }
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
      }
    } catch { /* non-blocking */ }
  }

  const refunded = action === "stop" ? campaign.budget - (campaign.spent || 0) : 0;
  return NextResponse.json({ success: true, refunded });
}
