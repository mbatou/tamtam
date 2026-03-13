import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createCampaignSchema, updateCampaignSchema, deleteCampaignSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

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

  const { title, description, destination_url, cpc, budget, starts_at, ends_at, creative_urls } = parsed.data;

  const supabase = createServiceClient();

  // Check batteur's total_recharged (recharge pool for campaigns)
  const { data: batteur } = await supabase
    .from("users")
    .select("total_recharged")
    .eq("id", session.user.id)
    .single();

  if (!batteur || (batteur.total_recharged || 0) < budget) {
    return NextResponse.json(
      { error: "Solde rechargé insuffisant. Veuillez recharger votre portefeuille.", code: "INSUFFICIENT_BALANCE" },
      { status: 400 }
    );
  }

  // Debit from total_recharged (recharge pool)
  const { error: debitError } = await supabase
    .from("users")
    .update({ total_recharged: batteur.total_recharged - budget })
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
    status: "active",
    starts_at: starts_at || null,
    ends_at: ends_at || null,
  }).select().single();

  if (error) {
    // Rollback: restore total_recharged if campaign creation fails
    await supabase
      .from("users")
      .update({ total_recharged: batteur.total_recharged })
      .eq("id", session.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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

  // Handle budget change: charge or refund the difference
  if (budget !== undefined) {
    const oldBudget = existing.budget;
    const diff = budget - oldBudget;

    if (diff > 0) {
      // Need more budget: check total_recharged
      const { data: batteur } = await supabase.from("users").select("total_recharged").eq("id", session.user.id).single();
      if (!batteur || (batteur.total_recharged || 0) < diff) {
        return NextResponse.json(
          { error: "Solde rechargé insuffisant. Veuillez recharger votre portefeuille.", code: "INSUFFICIENT_BALANCE" },
          { status: 400 }
        );
      }
      await supabase.from("users").update({ total_recharged: batteur.total_recharged - diff }).eq("id", session.user.id);
    } else if (diff < 0) {
      // Reducing budget: refund the difference (but can't go below spent)
      if (budget < existing.spent) {
        return NextResponse.json({ error: "Le budget ne peut pas être inférieur au montant déjà dépensé." }, { status: 400 });
      }
      await supabase.rpc("increment_balance", { p_user_id: session.user.id, p_amount: Math.abs(diff) });
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

  // Re-debit from total_recharged when reactivating a paused campaign
  if (status === "active" && existing.status === "paused") {
    const unspent = existing.budget - existing.spent;
    if (unspent > 0) {
      const { data: batteur } = await supabase.from("users").select("total_recharged").eq("id", session.user.id).single();
      if (!batteur || (batteur.total_recharged || 0) < unspent) {
        return NextResponse.json(
          { error: "Solde rechargé insuffisant pour réactiver cette campagne.", code: "INSUFFICIENT_BALANCE" },
          { status: 400 }
        );
      }
      await supabase.from("users").update({ total_recharged: batteur.total_recharged - unspent }).eq("id", session.user.id);
    }
  }

  const { data, error } = await supabase.from("campaigns").update(updates).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
