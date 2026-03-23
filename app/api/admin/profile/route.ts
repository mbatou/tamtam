import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeCity } from "@/lib/cities";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, city, mobile_money_provider, logo_url, industry, notification_prefs, created_at")
    .eq("id", session.user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...data, email: session.user.email });
}

export async function PUT(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { name, phone, city, mobile_money_provider, industry, notification_prefs } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;
  if (city !== undefined) updates.city = normalizeCity(city);
  if (mobile_money_provider !== undefined) updates.mobile_money_provider = mobile_money_provider || null;
  if (industry !== undefined) updates.industry = industry || null;
  if (notification_prefs !== undefined) updates.notification_prefs = notification_prefs;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.user.id)
    .select("id, name, phone, city, mobile_money_provider, logo_url, industry, notification_prefs, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...data, email: session.user.email });
}
