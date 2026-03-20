import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createCampaignSchema, updateCampaignSchema, deleteCampaignSchema } from "@/lib/validations";
import { sendCampaignCompletedToEcho, sendEmail } from "@/lib/email";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function notifyCampaignCompleted(campaignId: string) {
  try {
    const supabase = createServiceClient();
    // Get campaign info
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("title, cpc")
      .eq("id", campaignId)
      .single();
    if (!campaign) return;

    // Get all echos who participated (have tracked links)
    const { data: links } = await supabase
      .from("tracked_links")
      .select("echo_id, click_count")
      .eq("campaign_id", campaignId);
    if (!links?.length) return;

    // Get echo details
    const echoIds = links.map((l) => l.echo_id);
    const { data: echos } = await supabase
      .from("users")
      .select("id, name")
      .in("id", echoIds);
    if (!echos) return;

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(authUsers?.map((u) => [u.id, u.email]) || []);

    const clickMap = new Map(links.map((l) => [l.echo_id, l.click_count]));

    for (const echo of echos) {
      const email = emailMap.get(echo.id);
      const clicks = clickMap.get(echo.id) || 0;
      const earnings = Math.floor(clicks * campaign.cpc * ECHO_SHARE_PERCENT / 100);
      if (email) {
        sendCampaignCompletedToEcho({
          to: email,
          echoName: echo.name,
          campaignTitle: campaign.title,
          clickCount: clicks,
          earnings,
        }).catch(() => {});
      }
    }
  } catch { /* non-blocking */ }
}

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const batteurId = request.nextUrl.searchParams.get("batteur_id");

  let query = supabase.from("campaigns").select("*").order("created_at", { ascending: false });

  if (batteurId) {
    query = query.eq("batteur_id", batteurId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title, description, destination_url, cpc, budget, starts_at, ends_at, creative_urls, save_as_draft } = parsed.data;

  const supabase = createServiceClient();

  // Draft: save without balance check or deduction
  if (save_as_draft) {
    const { data, error } = await supabase.from("campaigns").insert({
      batteur_id: session.user.id,
      title,
      description: description || null,
      destination_url,
      creative_urls: creative_urls || [],
      cpc,
      budget,
      status: "draft",
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // Active: check and debit balance
  const { data: batteur } = await supabase
    .from("users")
    .select("balance")
    .eq("id", session.user.id)
    .single();

  if (!batteur || (batteur.balance || 0) < budget) {
    return NextResponse.json(
      { error: "Solde insuffisant. Veuillez recharger votre portefeuille.", code: "INSUFFICIENT_BALANCE" },
      { status: 400 }
    );
  }

  const { error: debitError } = await supabase
    .from("users")
    .update({ balance: batteur.balance - budget })
    .eq("id", session.user.id);

  if (debitError) {
    return NextResponse.json({ error: debitError.message }, { status: 500 });
  }

  const { data, error } = await supabase.from("campaigns").insert({
    batteur_id: session.user.id,
    title,
    description: description || null,
    destination_url,
    creative_urls: creative_urls || [],
    cpc,
    budget,
    status: "pending_review",
    moderation_status: "pending",
    starts_at: starts_at || null,
    ends_at: ends_at || null,
  }).select().single();

  if (error) {
    // Rollback: restore balance if campaign creation fails
    await supabase
      .from("users")
      .update({ balance: batteur.balance })
      .eq("id", session.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get brand name for notification
  const { data: brand } = await supabase
    .from("users")
    .select("name")
    .eq("id", session.user.id)
    .single();

  // Notify superadmin about new campaign pending review
  sendEmail({
    to: "support@tamma.me",
    subject: `Nouvelle campagne soumise: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Nouvelle campagne à valider</h2>
        <p><strong>Marque:</strong> ${brand?.name || "—"}</p>
        <p><strong>Campagne:</strong> ${title}</p>
        <p><strong>Budget:</strong> ${budget.toLocaleString()} FCFA</p>
        <p><strong>CPC:</strong> ${cpc} FCFA</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/superadmin/campaigns" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Valider maintenant →</a>
        </p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, title, description, destination_url, cpc, budget, starts_at, ends_at, creative_urls, status } = parsed.data;

  const supabase = createServiceClient();

  // Verify ownership and get current campaign data
  const { data: existing } = await supabase.from("campaigns").select("batteur_id, budget, spent, status").eq("id", id).single();
  if (!existing || existing.batteur_id !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (destination_url !== undefined) updates.destination_url = destination_url;
  if (cpc !== undefined) updates.cpc = cpc;
  if (starts_at !== undefined) updates.starts_at = starts_at || null;
  if (ends_at !== undefined) updates.ends_at = ends_at || null;
  if (creative_urls !== undefined) updates.creative_urls = creative_urls;
  if (status !== undefined) updates.status = status;

  // Handle budget change: charge or refund the difference (skip for drafts - no balance was deducted)
  if (budget !== undefined) {
    if (existing.status !== "draft") {
      const oldBudget = existing.budget;
      const diff = budget - oldBudget;

      if (diff > 0) {
        // Need more budget: check balance
        const { data: batteur } = await supabase.from("users").select("balance").eq("id", session.user.id).single();
        if (!batteur || (batteur.balance || 0) < diff) {
          return NextResponse.json(
            { error: "Solde insuffisant. Veuillez recharger votre portefeuille.", code: "INSUFFICIENT_BALANCE" },
            { status: 400 }
          );
        }
        await supabase.from("users").update({ balance: batteur.balance - diff }).eq("id", session.user.id);
      } else if (diff < 0) {
        // Reducing budget: refund the difference (but can't go below spent)
        if (budget < existing.spent) {
          return NextResponse.json({ error: "Le budget ne peut pas être inférieur au montant déjà dépensé." }, { status: 400 });
        }
        await supabase.rpc("increment_balance", { p_user_id: session.user.id, p_amount: Math.abs(diff) });
      }
    }
    updates.budget = budget;
  }

  // Refund unspent budget when pausing or completing a campaign
  if (status !== undefined && (status === "paused" || status === "completed") && existing.status === "active") {
    const unspent = existing.budget - existing.spent;
    if (unspent > 0) {
      await supabase.rpc("increment_balance", { p_user_id: session.user.id, p_amount: unspent });
    }
  }

  // Debit balance when publishing a draft campaign
  if (status === "active" && existing.status === "draft") {
    const campaignBudget = budget !== undefined ? budget : existing.budget;
    const { data: batteur } = await supabase.from("users").select("balance").eq("id", session.user.id).single();
    if (!batteur || (batteur.balance || 0) < campaignBudget) {
      return NextResponse.json(
        { error: "Solde insuffisant. Veuillez recharger votre portefeuille.", code: "INSUFFICIENT_BALANCE" },
        { status: 400 }
      );
    }
    await supabase.from("users").update({ balance: batteur.balance - campaignBudget }).eq("id", session.user.id);
  }

  // Re-debit from balance when reactivating a paused campaign
  if (status === "active" && existing.status === "paused") {
    const unspent = existing.budget - existing.spent;
    if (unspent > 0) {
      const { data: batteur } = await supabase.from("users").select("balance").eq("id", session.user.id).single();
      if (!batteur || (batteur.balance || 0) < unspent) {
        return NextResponse.json(
          { error: "Solde insuffisant pour réactiver cette campagne.", code: "INSUFFICIENT_BALANCE" },
          { status: 400 }
        );
      }
      await supabase.from("users").update({ balance: batteur.balance - unspent }).eq("id", session.user.id);
    }
  }

  const { data, error } = await supabase.from("campaigns").update(updates).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify echos when campaign is completed
  if (status === "completed" && existing.status === "active") {
    notifyCampaignCompleted(id);
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id } = parsed.data;

  const supabase = createServiceClient();

  // Verify ownership and get campaign data for refund
  const { data: existing } = await supabase.from("campaigns").select("batteur_id, budget, spent, status").eq("id", id).single();
  if (!existing || existing.batteur_id !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Refund unspent budget if campaign was active or paused
  if (existing.status === "active" || existing.status === "paused") {
    const unspent = existing.budget - existing.spent;
    if (unspent > 0) {
      await supabase.rpc("increment_balance", { p_user_id: session.user.id, p_amount: unspent });
    }
  }

  // Delete related tracked_links first, then the campaign
  await supabase.from("tracked_links").delete().eq("campaign_id", id);
  const { error } = await supabase.from("campaigns").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
