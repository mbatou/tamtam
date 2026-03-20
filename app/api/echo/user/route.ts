import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Try cookie-based session first, then fall back to Authorization header
  let userId: string | null = null;

  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (session) {
    userId = session.user.id;
  } else {
    // Fall back to Bearer token (used during login before cookies sync)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await authClient.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
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
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, city, mobile_money_provider } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;
  if (city !== undefined) updates.city = city || null;
  if (mobile_money_provider !== undefined) updates.mobile_money_provider = mobile_money_provider || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
