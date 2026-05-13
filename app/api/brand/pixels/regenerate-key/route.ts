import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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

  const { pixel_id } = body as { pixel_id?: string };

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

  const newApiKey = `tmk_${crypto.randomBytes(24).toString("hex")}`;
  const newHash = await bcrypt.hash(newApiKey, 10);

  const { error } = await supabase
    .from("pixels")
    .update({
      api_key_hash: newHash,
      updated_at: new Date().toISOString(),
    })
    .eq("pixel_id", pixel_id)
    .eq("brand_id", brandId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    api_key: newApiKey,
    message: "Clé API régénérée. Conservez-la, elle ne sera plus affichée.",
  });
}
