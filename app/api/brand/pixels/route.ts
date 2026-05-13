import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generatePixelId(): string {
  return `px_${crypto.randomBytes(8).toString("hex")}`;
}

function generateApiKey(): string {
  return `tmk_${crypto.randomBytes(24).toString("hex")}`;
}

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { data, error } = await supabase
    .from("pixels")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pixels: data || [] });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { name, platform } = body as { name?: string; platform?: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  const validPlatforms = ["app", "web", "both"];
  const pixelPlatform = validPlatforms.includes(platform || "") ? platform : "app";

  const pixelId = generatePixelId();
  const rawApiKey = generateApiKey();
  const apiKeyHash = await bcrypt.hash(rawApiKey, 10);

  const { data: pixel, error } = await supabase
    .from("pixels")
    .insert({
      brand_id: brandId,
      name: name.trim(),
      pixel_id: pixelId,
      api_key_hash: apiKeyHash,
      platform: pixelPlatform,
    })
    .select("id, pixel_id, name, platform, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pixel,
    credentials: {
      pixel_id: pixelId,
      api_key: rawApiKey,
    },
    message: "Pixel créé avec succès. Conservez votre clé API, elle ne sera plus affichée.",
  });
}

export async function PATCH(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { pixel_id, name, platform, is_active, allowed_events, webhook_url } = body as {
    pixel_id?: string;
    name?: string;
    platform?: string;
    is_active?: boolean;
    allowed_events?: string[];
    webhook_url?: string | null;
  };

  if (!pixel_id) {
    return NextResponse.json({ error: "pixel_id requis" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("pixels")
    .select("id")
    .eq("pixel_id", pixel_id)
    .eq("brand_id", brandId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Pixel introuvable" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (platform !== undefined && ["app", "web", "both"].includes(platform)) updates.platform = platform;
  if (is_active !== undefined) updates.is_active = is_active;
  if (allowed_events !== undefined) updates.allowed_events = allowed_events;
  if (webhook_url !== undefined) updates.webhook_url = webhook_url;

  const { data, error } = await supabase
    .from("pixels")
    .update(updates)
    .eq("pixel_id", pixel_id)
    .eq("brand_id", brandId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pixel: data });
}
