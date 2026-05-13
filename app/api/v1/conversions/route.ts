import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const API_KEY_PREFIX = "tmk_";
const API_KEY_MIN_LENGTH = 30;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000",
  "Cache-Control": "no-store",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function logSecurity(event: string, details: Record<string, unknown>) {
  console.warn(`[PIXEL SECURITY] ${event}`, JSON.stringify({ ...details, timestamp: new Date().toISOString() }));
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function validatePixelId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 30 && /^[A-Za-z0-9_-]+$/.test(v);
}

function validateEvent(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 30 && /^[a-z_]+$/.test(v);
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
      ...SECURITY_HEADERS,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Tamtam-Key",
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);

  // --- Rate limit: per IP ---
  const { allowed: ipAllowed } = rateLimit(`pixel:ip:${ip}`, 200, 60000);
  if (!ipAllowed) {
    logSecurity("rate_limit_ip", { ip });
    return json({ error: "Rate limit exceeded" }, 429);
  }

  // --- Rate limit: failed auth per IP ---
  const { allowed: authAllowed } = rateLimit(`pixel:authfail:${ip}`, 10, 300000);
  if (!authAllowed) {
    logSecurity("auth_blocked", { ip });
    return json({ error: "Too many failed attempts. Try again in 15 minutes." }, 429);
  }

  // --- API key presence + prefix check (before bcrypt) ---
  const apiKey = request.headers.get("X-Tamtam-Key");
  if (!apiKey) return json({ error: "Missing API key" }, 401);

  if (!apiKey.startsWith(API_KEY_PREFIX) || apiKey.length < API_KEY_MIN_LENGTH) {
    logSecurity("invalid_key_format", { ip });
    // Consume a failed-auth slot
    rateLimit(`pixel:authfail:${ip}`, 10, 300000);
    return json({ error: "Invalid API key format" }, 401);
  }

  // --- Payload size guard ---
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 10240) {
    logSecurity("payload_too_large", { ip, size: contentLength });
    return json({ error: "Payload too large" }, 413);
  }

  // --- Parse body ---
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { pixel_id, event, tm_ref, external_id, value, currency, event_name, metadata } = body as {
    pixel_id?: unknown;
    event?: unknown;
    tm_ref?: unknown;
    external_id?: unknown;
    value?: unknown;
    currency?: unknown;
    event_name?: unknown;
    metadata?: unknown;
  };

  // --- Input validation (all before any DB query) ---
  if (!validatePixelId(pixel_id)) {
    return json({ error: "Invalid pixel_id format" }, 400);
  }
  if (!validateEvent(event)) {
    return json({ error: "Invalid event format" }, 400);
  }
  if (tm_ref !== undefined && tm_ref !== null && (typeof tm_ref !== "string" || tm_ref.length > 50)) {
    return json({ error: "Invalid tm_ref" }, 400);
  }
  if (external_id !== undefined && external_id !== null && (typeof external_id !== "string" || external_id.length > 200)) {
    return json({ error: "Invalid external_id" }, 400);
  }
  if (value !== undefined && value !== null && (typeof value !== "number" || value < 0 || value > 10000000)) {
    return json({ error: "Invalid value" }, 400);
  }
  if (currency !== undefined && currency !== null && (typeof currency !== "string" || currency.length !== 3)) {
    return json({ error: "Invalid currency" }, 400);
  }
  if (event_name !== undefined && event_name !== null && (typeof event_name !== "string" || event_name.length > 50)) {
    return json({ error: "Invalid event_name" }, 400);
  }
  if (metadata !== undefined && metadata !== null) {
    if (typeof metadata !== "object" || Array.isArray(metadata)) {
      return json({ error: "Invalid metadata" }, 400);
    }
    if (JSON.stringify(metadata).length > 5120) {
      return json({ error: "Metadata too large" }, 400);
    }
  }

  // --- Browser-origin warning ---
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (origin || referer) {
    logSecurity("browser_request", { ip, origin, referer, pixel_id });
  }

  // --- Authenticate ---
  const supabase = createServiceClient();
  const pixel = await authenticatePixel(supabase, apiKey, pixel_id);

  if (!pixel) {
    // Consume a failed-auth slot (the rateLimit call increments the counter)
    rateLimit(`pixel:authfail:${ip}`, 10, 300000);
    logSecurity("auth_failed", { ip, pixel_id });
    return json({ error: "Invalid pixel_id or API key" }, 401);
  }

  // --- Rate limit: per API key (after successful auth) ---
  const { allowed: keyAllowed } = rateLimit(`pixel:key:${pixel.pixel_id}`, 100, 60000);
  if (!keyAllowed) {
    logSecurity("rate_limit_key", { ip, pixel_id: pixel.pixel_id });
    return json({ error: "Rate limit exceeded for this pixel" }, 429);
  }

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
  const safeExternalId = external_id ? String(external_id) : null;
  if (safeExternalId) {
    const { data: existing } = await supabase
      .from("conversions")
      .select("id")
      .eq("pixel_id", pixel_id)
      .eq("external_id", safeExternalId)
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
  const safeTmRef = tm_ref ? String(tm_ref) : null;

  if (safeTmRef) {
    const { data: link } = await supabase
      .from("tracked_links")
      .select("id, campaign_id, echo_id, created_at")
      .eq("tm_ref", safeTmRef)
      .maybeSingle();

    if (link) {
      // Cross-brand attribution check: verify the campaign belongs to this pixel's brand
      let brandMatch = true;
      if (link.campaign_id) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("batteur_id")
          .eq("id", link.campaign_id)
          .single();

        if (campaign && campaign.batteur_id !== pixel.brand_id) {
          logSecurity("cross_brand_attribution", {
            ip,
            pixel_id,
            tm_ref: safeTmRef,
            pixel_brand: pixel.brand_id,
            campaign_brand: campaign.batteur_id,
          });
          brandMatch = false;
        }
      }

      if (brandMatch) {
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
      event_name: typeof event_name === "string" ? event_name : null,
      value_amount: typeof value === "number" ? value : null,
      value_currency: typeof currency === "string" ? currency : "XOF",
      tm_ref: safeTmRef,
      attributed,
      attribution_type,
      click_to_conversion_seconds,
      external_id: safeExternalId,
      ip_address: ip !== "unknown" ? ip : null,
      user_agent: request.headers.get("user-agent")?.substring(0, 500) || null,
      metadata: (metadata && typeof metadata === "object" && !Array.isArray(metadata)) ? metadata : {},
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
    click_to_conversion: clickLabel,
  });
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit
  const { allowed: ipAllowed } = rateLimit(`pixel:ip:${ip}`, 200, 60000);
  if (!ipAllowed) return json({ error: "Rate limit exceeded" }, 429);

  const { allowed: authAllowed } = rateLimit(`pixel:authfail:${ip}`, 10, 300000);
  if (!authAllowed) return json({ error: "Too many failed attempts. Try again in 15 minutes." }, 429);

  const apiKey = request.headers.get("X-Tamtam-Key");
  if (!apiKey) return json({ error: "Missing API key" }, 401);

  if (!apiKey.startsWith(API_KEY_PREFIX) || apiKey.length < API_KEY_MIN_LENGTH) {
    rateLimit(`pixel:authfail:${ip}`, 10, 300000);
    return json({ error: "Invalid API key format" }, 401);
  }

  const { searchParams } = request.nextUrl;
  const pixelId = searchParams.get("pixel_id");

  if (!pixelId || !validatePixelId(pixelId)) {
    return json({ error: "Invalid pixel_id parameter" }, 400);
  }

  const supabase = createServiceClient();
  const pixel = await authenticatePixel(supabase, apiKey, pixelId);

  if (!pixel) {
    rateLimit(`pixel:authfail:${ip}`, 10, 300000);
    logSecurity("auth_failed", { ip, pixel_id: pixelId, method: "GET" });
    return json({ error: "Invalid pixel_id or API key" }, 401);
  }

  const { allowed: keyAllowed } = rateLimit(`pixel:key:${pixel.pixel_id}`, 100, 60000);
  if (!keyAllowed) return json({ error: "Rate limit exceeded for this pixel" }, 429);

  const event = searchParams.get("event");
  const campaignId = searchParams.get("campaign_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const attributedParam = searchParams.get("attributed");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  let query = supabase
    .from("conversions")
    .select("id, event, event_name, value_amount, value_currency, attributed, attribution_type, click_to_conversion_seconds, external_id, created_at", { count: "exact" })
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
