import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (!user || !["superadmin", "admin"].includes(user.role)) return null;
  return { session, supabase };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("pixelId");

  if (detail) {
    return getPixelDetail(supabase, detail);
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [pixelsRes, eventsToday, events24h] = await Promise.all([
    supabase
      .from("pixels")
      .select(
        "id, pixel_id, name, is_active, total_conversions, last_conversion_at, last_test_at, test_status, test_count, last_test_error, last_test_latency_ms, platform, created_at, brand_id, brand:users!brand_id(id, name, company_name, logo_url)"
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("conversions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),

    supabase
      .from("conversions")
      .select("event, created_at")
      .gte("created_at", yesterday),
  ]);

  const pixels = pixelsRes.data || [];
  const totalPixels = pixels.length;
  const activePixels = pixels.filter((p) => p.is_active).length;
  const testedPixels = pixels.filter((p) => p.test_count > 0).length;

  const allEvents = events24h.data || [];
  const errorEvents = allEvents.filter((e) => e.event === "error");
  const errorRate =
    allEvents.length > 0
      ? Math.round((errorEvents.length / allEvents.length) * 100)
      : 0;

  const latencyValues = pixels
    .map((p) => p.last_test_latency_ms)
    .filter((v): v is number => v !== null && v > 0);
  const avgLatency =
    latencyValues.length > 0
      ? Math.round(
          latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length
        )
      : 0;

  return NextResponse.json({
    pixels,
    stats: {
      totalPixels,
      activePixels,
      testedPixels,
      eventsToday: eventsToday.count || 0,
      avgLatency,
      errorRate,
    },
  });
}

async function getPixelDetail(
  supabase: ReturnType<typeof createServiceClient>,
  pixelId: string
) {
  const yesterday = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const [recentEvents, errorEvents] = await Promise.all([
    supabase
      .from("conversions")
      .select("id, event, event_name, value_amount, tm_ref, attributed, created_at, metadata, external_id")
      .eq("pixel_id", pixelId)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("conversions")
      .select("id, event, event_name, created_at, metadata")
      .eq("pixel_id", pixelId)
      .eq("event", "error")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const { data: latencyEvents } = await supabase
    .from("conversions")
    .select("created_at, metadata")
    .eq("pixel_id", pixelId)
    .gte("created_at", yesterday)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({
    recentEvents: recentEvents.data || [],
    errorEvents: errorEvents.data || [],
    latencyData: latencyEvents || [],
  });
}
