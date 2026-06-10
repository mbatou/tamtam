import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = rateLimit(`pixel-check:${ip}`, 20, 60000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited" },
      { status: 429, headers: cors() }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400, headers: cors() }
    );
  }

  const pixelId = body.pixel_id;
  if (typeof pixelId !== "string" || !pixelId.startsWith("px_") || pixelId.length > 30) {
    return NextResponse.json(
      { success: false, error: "Invalid pixel_id" },
      { status: 400, headers: cors() }
    );
  }

  const startTime = Date.now();
  const supabase = createServiceClient();

  const { data: pixel } = await supabase
    .from("pixels")
    .select("pixel_id, is_active")
    .eq("pixel_id", pixelId)
    .single();

  const latency = Date.now() - startTime;

  if (!pixel) {
    return NextResponse.json(
      { success: false, error: "Pixel not found" },
      { status: 404, headers: cors() }
    );
  }

  return NextResponse.json(
    { success: true, active: pixel.is_active, latency_ms: latency },
    { headers: cors() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}
