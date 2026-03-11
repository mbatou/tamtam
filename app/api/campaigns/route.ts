import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
  const { title, description, destination_url, cpc, budget, starts_at, ends_at, creative_urls } = body;

  if (!title || !destination_url || !cpc || !budget) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("campaigns").insert({
    batteur_id: session.user.id,
    title,
    description: description || null,
    destination_url,
    creative_urls: creative_urls || [],
    cpc: parseInt(cpc),
    budget: parseInt(budget),
    status: "active",
    starts_at: starts_at || null,
    ends_at: ends_at || null,
  }).select().single();

  if (error) {
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
  const { id, title, description, destination_url, cpc, budget, starts_at, ends_at, creative_urls, status } = body;

  if (!id) {
    return NextResponse.json({ error: "ID de campagne manquant" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: existing } = await supabase.from("campaigns").select("batteur_id").eq("id", id).single();
  if (!existing || existing.batteur_id !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (destination_url !== undefined) updates.destination_url = destination_url;
  if (cpc !== undefined) updates.cpc = parseInt(cpc);
  if (budget !== undefined) updates.budget = parseInt(budget);
  if (starts_at !== undefined) updates.starts_at = starts_at || null;
  if (ends_at !== undefined) updates.ends_at = ends_at || null;
  if (creative_urls !== undefined) updates.creative_urls = creative_urls;
  if (status !== undefined) updates.status = status;

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

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "ID de campagne manquant" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: existing } = await supabase.from("campaigns").select("batteur_id").eq("id", id).single();
  if (!existing || existing.batteur_id !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Delete related tracked_links first, then the campaign
  await supabase.from("tracked_links").delete().eq("campaign_id", id);
  const { error } = await supabase.from("campaigns").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
