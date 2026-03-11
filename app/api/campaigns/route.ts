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
  const { title, description, destination_url, cpc, budget, starts_at, ends_at } = body;

  if (!title || !destination_url || !cpc || !budget) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("campaigns").insert({
    batteur_id: session.user.id,
    title,
    description: description || null,
    destination_url,
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
