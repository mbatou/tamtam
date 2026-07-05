import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";
import { normalizeCity } from "@/lib/cities";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Cookie-based session, with Bearer token fallback (mobile app / login
  // before cookies sync) — both handled by the auth kernel.
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;
  const userId = auth.authUser.id;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const body = await request.json();
  const { name, phone, city, mobile_money_provider, platforms, primary_platform, audience_size_range } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;
  if (city !== undefined) updates.city = normalizeCity(city);
  if (mobile_money_provider !== undefined) updates.mobile_money_provider = mobile_money_provider || null;
  if (platforms !== undefined) updates.platforms = Array.isArray(platforms) ? platforms : [];
  if (primary_platform !== undefined) updates.primary_platform = primary_platform || null;
  if (audience_size_range !== undefined) updates.audience_size_range = audience_size_range || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", authUser.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
