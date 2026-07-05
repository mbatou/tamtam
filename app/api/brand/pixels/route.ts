import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { apiError, validationError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

const createPixelBodySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  // Any unknown platform silently falls back to "app" (existing behavior)
  platform: z.string().max(20).optional().nullable(),
});

const updatePixelBodySchema = z.object({
  pixel_id: z.string().min(1, "pixel_id requis").max(50),
  name: z.string().min(1).max(200).optional(),
  platform: z.string().max(20).optional().nullable(),
  is_active: z.boolean().optional(),
  allowed_events: z.array(z.string().max(50)).max(50).optional(),
  webhook_url: z.string().url("URL invalide").max(2000).or(z.literal("")).optional().nullable(),
});

function generatePixelId(): string {
  return `px_${crypto.randomBytes(8).toString("hex")}`;
}

function generateApiKey(): string {
  return `tmk_${crypto.randomBytes(24).toString("hex")}`;
}

export async function GET() {
  const authClient = createClient();
  const {
    data: { user: authUser },
  } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, authUser.id);

  const { data, error } = await supabase
    .from("pixels")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[brand/pixels] pixels fetch failed:", error);
    return apiError(500, "Erreur interne");
  }

  return NextResponse.json({ pixels: data || [] });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { user: authUser },
  } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, authUser.id);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsedCreate = createPixelBodySchema.safeParse(body);
  if (!parsedCreate.success) {
    return validationError(parsedCreate.error);
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
    console.error("[brand/pixels] pixel insert failed:", error);
    return apiError(500, "Erreur interne");
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
    data: { user: authUser },
  } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, authUser.id);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsedUpdate = updatePixelBodySchema.safeParse(body);
  if (!parsedUpdate.success) {
    return validationError(parsedUpdate.error);
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
    console.error("[brand/pixels] pixel update failed:", error);
    return apiError(500, "Erreur interne");
  }

  return NextResponse.json({ pixel: data });
}
