import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

async function authenticatePixel(supabase: ReturnType<typeof createServiceClient>, apiKey: string, pixelId: string) {
  const { data: pixel } = await supabase
    .from("pixels")
    .select("*")
    .eq("pixel_id", pixelId)
    .single();

  if (!pixel) return null;

  const valid = await bcrypt.compare(apiKey, pixel.api_key_hash);
  if (!valid) return null;

  return pixel;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Tamtam-Key",
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const apiKey = request.headers.get("X-Tamtam-Key");
  if (!apiKey) return json({ error: "Missing API key" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    pixel_id,
    event,
    tm_ref,
    external_id,
    value,
    currency,
    event_name,
    metadata,
  } = body as {
    pixel_id?: string;
    event?: string;
    tm_ref?: string;
    external_id?: string;
    value?: number;
    currency?: string;
    event_name?: string;
    metadata?: Record<string, unknown>;
  };

  if (!pixel_id || !event) {
    return json({ error: "Missing pixel_id or event" }, 400);
  }

  const supabase = createServiceClient();

  const pixel = await authenticatePixel(supabase, apiKey, pixel_id);
  if (!pixel) return json({ error: "Invalid pixel_id or API key" }, 401);

  if (!pixel.is_active) return json({ error: "Pixel is inactive" }, 403);

  if (!pixel.allowed_events?.includes(event)) {
    return json({ error: `Event '${event}' not allowed for this pixel` }, 422);
  }

  // Handle test events
  if (event === "test") {
    const latency = Date.now() - startTime;
    await supabase
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

    return json({
      success: true,
      test: true,
      message: "Connexion réussie ! Votre Pixel Tamtam fonctionne.",
      pixel_id,
      latency_ms: latency,
    });
  }

  // Deduplication
  if (external_id) {
    const { data: existing } = await supabase
      .from("conversions")
      .select("id")
      .eq("pixel_id", pixel_id)
      .eq("external_id", String(external_id))
      .maybeSingle();

    if (existing) {
      return json({
        success: true,
        duplicate: true,
        conversion_id: existing.id,
        message: "Conversion already recorded",
      });
    }
  }

  // Attribution via tm_ref
  let attributed = false;
  let attribution_type: string = "unattributed";
  let campaign_id: string | null = null;
  let echo_id: string | null = null;
  let tracked_link_id: string | null = null;
  let click_to_conversion_seconds: number | null = null;

  if (tm_ref) {
    const { data: link } = await supabase
      .from("tracked_links")
      .select("id, campaign_id, echo_id, created_at")
      .eq("tm_ref", String(tm_ref))
      .maybeSingle();

    if (link) {
      const clickTime = new Date(link.created_at).getTime();
      const now = Date.now();
      const windowMs = (pixel.attribution_window_hours || 168) * 60 * 60 * 1000;

      if (now - clickTime <= windowMs) {
        attributed = true;
        attribution_type = "direct";
        campaign_id = link.campaign_id;
        echo_id = link.echo_id;
        tracked_link_id = link.id;
        click_to_conversion_seconds = Math.floor((now - clickTime) / 1000);
      }
    }
  }

  // Insert conversion
  const { data: conversion, error } = await supabase
    .from("conversions")
    .insert({
      pixel_id,
      brand_id: pixel.brand_id,
      campaign_id,
      echo_id,
      tracked_link_id,
      event,
      event_name: event_name || null,
      value_amount: value || null,
      value_currency: currency || "XOF",
      tm_ref: tm_ref ? String(tm_ref) : null,
      attributed,
      attribution_type,
      click_to_conversion_seconds,
      external_id: external_id ? String(external_id) : null,
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: request.headers.get("user-agent") || null,
      metadata: metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Conversion insert error:", error);
    return json({ error: "Failed to record conversion" }, 500);
  }

  // Update pixel totals (non-blocking)
  supabase
    .from("pixels")
    .update({
      total_conversions: (pixel.total_conversions || 0) + 1,
      last_conversion_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("pixel_id", pixel_id)
    .then(() => {});

  let clickLabel: string | null = null;
  if (click_to_conversion_seconds !== null) {
    const h = Math.floor(click_to_conversion_seconds / 3600);
    const m = Math.floor((click_to_conversion_seconds % 3600) / 60);
    clickLabel = `${h}h ${m}m`;
  }

  return json({
    success: true,
    conversion_id: conversion.id,
    attributed,
    attribution_type,
    campaign: campaign_id ? "matched" : null,
    click_to_conversion: clickLabel,
  });
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-Tamtam-Key");
  if (!apiKey) return json({ error: "Missing API key" }, 401);

  const { searchParams } = request.nextUrl;
  const pixelId = searchParams.get("pixel_id");
  if (!pixelId) return json({ error: "Missing pixel_id parameter" }, 400);

  const supabase = createServiceClient();

  const pixel = await authenticatePixel(supabase, apiKey, pixelId);
  if (!pixel) return json({ error: "Invalid pixel_id or API key" }, 401);

  const event = searchParams.get("event");
  const campaignId = searchParams.get("campaign_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const attributedParam = searchParams.get("attributed");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  let query = supabase
    .from("conversions")
    .select("*", { count: "exact" })
    .eq("pixel_id", pixelId);

  if (event) query = query.eq("event", event);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (attributedParam === "true") query = query.eq("attributed", true);
  if (attributedParam === "false") query = query.eq("attributed", false);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Conversions query error:", error);
    return json({ error: "Failed to fetch conversions" }, 500);
  }

  return json({
    conversions: data || [],
    total: count || 0,
    limit,
    offset,
  });
}
