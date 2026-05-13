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

  const { data: pixel } = await supabase
    .from("pixels")
    .select("*")
    .eq("pixel_id", pixel_id)
    .eq("brand_id", brandId)
    .single();

  if (!pixel) {
    return NextResponse.json({ error: "Pixel introuvable" }, { status: 404 });
  }

  const startTime = Date.now();

  try {
    const testRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/v1/conversions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pixel_id,
        event: "test",
      }),
    });

    const latency = Date.now() - startTime;
    const testStatus = testRes.ok ? "success" : "failed";
    const testError = testRes.ok ? null : `HTTP ${testRes.status}`;

    await supabase
      .from("pixels")
      .update({
        last_test_at: new Date().toISOString(),
        test_status: testStatus,
        test_count: (pixel.test_count || 0) + 1,
        last_test_error: testError,
        last_test_latency_ms: latency,
        updated_at: new Date().toISOString(),
      })
      .eq("pixel_id", pixel_id);

    return NextResponse.json({
      success: testRes.ok,
      status: testStatus,
      latency_ms: latency,
      error: testError,
    });
  } catch (err) {
    const latency = Date.now() - startTime;

    await supabase
      .from("pixels")
      .update({
        last_test_at: new Date().toISOString(),
        test_status: "failed",
        test_count: (pixel.test_count || 0) + 1,
        last_test_error: String(err),
        last_test_latency_ms: latency,
        updated_at: new Date().toISOString(),
      })
      .eq("pixel_id", pixel_id);

    return NextResponse.json({
      success: false,
      status: "failed",
      latency_ms: latency,
      error: String(err),
    });
  }
}
