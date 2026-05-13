import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

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

  const startTime = Date.now();

  const { data: pixel } = await supabase
    .from("pixels")
    .select("*")
    .eq("pixel_id", pixel_id)
    .eq("brand_id", brandId)
    .single();

  if (!pixel) {
    return NextResponse.json({ error: "Pixel introuvable" }, { status: 404 });
  }

  if (!pixel.is_active) {
    return NextResponse.json({ error: "Pixel inactif" }, { status: 400 });
  }

  const latency = Date.now() - startTime;

  const { error } = await supabase
    .from("pixels")
    .update({
      last_test_at: new Date().toISOString(),
      test_status: "success",
      test_count: (pixel.test_count || 0) + 1,
      last_test_error: null,
      last_test_latency_ms: latency,
      updated_at: new Date().toISOString(),
    })
    .eq("pixel_id", pixel_id);

  if (error) {
    return NextResponse.json({
      success: false,
      status: "failed",
      latency_ms: latency,
      error: error.message,
    });
  }

  return NextResponse.json({
    success: true,
    status: "success",
    latency_ms: latency,
  });
}
