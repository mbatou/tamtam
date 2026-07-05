import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Browser-sourced conversion events — the ingestion endpoint for the Tamtam
 * Pixel Chrome extension's visual event mapper (and, later, the injected
 * pixel itself).
 *
 * Auth model: the PUBLIC pixel id (`px_…`). Anything a browser sends can be
 * forged, so this endpoint is deliberately scoped to tracking/analytics:
 * events are validated, deduplicated, rate-limited, and attributed via
 * tm_ref exactly like server-side conversions — but they NEVER trigger CPA
 * payouts (payment_status stays "none"; conversions are tagged
 * metadata.source so dashboards can distinguish them). Payable conversions
 * require the server-side API (/api/v1/conversions with a secret tmk_ key).
 *
 * CORS: called from brand websites (content-script fetches run with the
 * page's origin), so it answers preflights and allows any origin.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tamtam-Key",
  "Cache-Control": "no-store",
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const eventSchema = z.object({
  pixel_id: z.string().regex(/^px_[A-Za-z0-9_-]{4,60}$/, "Invalid pixel_id").optional(),
  event: z.string().regex(/^[a-z0-9_]{1,50}$/, "Invalid event"),
  tm_ref: z.string().max(50).optional().nullable(),
  value: z.number().nonnegative().finite().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  event_id: z.string().max(120).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  page_url: z.string().max(500).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit per IP before any work
  const ipLimit = await rateLimit(`pixel-event:ip:${ip}`, 120, 60000);
  if (!ipLimit.allowed) {
    return json({ error: "Too many requests" }, 429);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, 400);
  }

  // The extension historically sent the pixel id in X-Tamtam-Key; accept
  // body.pixel_id first, header as fallback.
  const headerPixelId = request.headers.get("x-tamtam-key") || "";
  const pixelId =
    parsed.data.pixel_id ||
    (/^px_[A-Za-z0-9_-]{4,60}$/.test(headerPixelId) ? headerPixelId : null);

  if (!pixelId) {
    return json({ error: "pixel_id required" }, 400);
  }

  // Per-pixel rate limit
  const pixelLimit = await rateLimit(`pixel-event:px:${pixelId}`, 300, 60000);
  if (!pixelLimit.allowed) {
    return json({ error: "Too many requests" }, 429);
  }

  const supabase = createServiceClient();

  // select("*") like the v1 route — pixels has no attribution_window_hours
  // column (the 168h default lives on conversions), so a "*" select keeps
  // the same graceful fallback the server-side path relies on.
  const { data: pixel } = await supabase
    .from("pixels")
    .select("*")
    .eq("pixel_id", pixelId)
    .maybeSingle();

  if (!pixel || !pixel.is_active) {
    return json({ error: "Unknown or inactive pixel" }, 404);
  }

  const { event, tm_ref, value, currency, event_id, source, page_url } = parsed.data;

  if (Array.isArray(pixel.allowed_events) && pixel.allowed_events.length > 0 && !pixel.allowed_events.includes(event)) {
    return json({ error: `Event "${event}" not in this pixel's allowed events` }, 400);
  }

  // Dedup on event_id (stored as external_id, namespaced to browser events)
  const externalId = event_id ? `ext_${event_id}`.slice(0, 120) : null;
  if (externalId) {
    const { data: existing } = await supabase
      .from("conversions")
      .select("id")
      .eq("pixel_id", pixelId)
      .eq("external_id", externalId)
      .maybeSingle();
    if (existing) {
      return json({ ok: true, duplicate: true, conversion_id: existing.id });
    }
  }

  // Attribution via tm_ref — same rules as server-side conversions
  let attributed = false;
  let attribution_type = "unattributed";
  let campaign_id: string | null = null;
  let echo_id: string | null = null;
  let tracked_link_id: string | null = null;
  let click_to_conversion_seconds: number | null = null;

  if (tm_ref) {
    const { data: link } = await supabase
      .from("tracked_links")
      .select("id, campaign_id, echo_id, created_at")
      .eq("tm_ref", tm_ref)
      .maybeSingle();

    if (link) {
      // Cross-brand check: the linked campaign must belong to this pixel's brand
      let brandMatch = true;
      if (link.campaign_id) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("batteur_id")
          .eq("id", link.campaign_id)
          .single();
        if (campaign && campaign.batteur_id !== pixel.brand_id) {
          brandMatch = false;
        }
      }

      if (brandMatch) {
        const clickTime = new Date(link.created_at).getTime();
        const windowMs = (pixel.attribution_window_hours || 168) * 60 * 60 * 1000;
        if (Date.now() - clickTime <= windowMs) {
          attributed = true;
          attribution_type = "direct";
          campaign_id = link.campaign_id;
          echo_id = link.echo_id;
          tracked_link_id = link.id;
          click_to_conversion_seconds = Math.floor((Date.now() - clickTime) / 1000);
        }
      }
    }
  }

  // Record the conversion. payment_status stays "none": browser-sourced
  // events are tracking-grade, never payable (see header comment).
  const { data: conversion, error } = await supabase
    .from("conversions")
    .insert({
      pixel_id: pixelId,
      brand_id: pixel.brand_id,
      campaign_id,
      echo_id,
      tracked_link_id,
      event,
      event_name: null,
      value_amount: typeof value === "number" ? value : null,
      value_currency: currency || "XOF",
      tm_ref: tm_ref || null,
      attributed,
      attribution_type,
      click_to_conversion_seconds,
      external_id: externalId,
      ip_address: ip !== "unknown" ? ip : null,
      user_agent: request.headers.get("user-agent")?.substring(0, 500) || null,
      metadata: {
        source: source || "browser",
        ...(page_url ? { page_url } : {}),
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pixel/event] insert failed:", error.message);
    return json({ error: "Failed to record event" }, 500);
  }

  // Keep the pixel's health/status counters fresh (same as server-side path)
  await supabase
    .from("pixels")
    .update({
      total_conversions: (pixel.total_conversions || 0) + 1,
      last_conversion_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("pixel_id", pixelId);

  return json({ ok: true, conversion_id: conversion.id, attributed, attribution_type });
}
