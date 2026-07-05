import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockSupabase, type MockSupabase } from "./helpers/mock-supabase";

// Route module imports createServiceClient at module scope — mock it before import
let mock: MockSupabase;
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => mock.client,
}));

import { POST } from "@/app/api/pixel/event/route";

const PIXEL = {
  pixel_id: "px_test1234",
  brand_id: "00000000-0000-0000-0000-00000000000b",
  is_active: true,
  allowed_events: ["purchase", "signup"],
  total_conversions: 5,
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://tamma.me/api/pixel/event", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "41.82.0.9", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mock = createMockSupabase();
});

describe("POST /api/pixel/event (browser events)", () => {
  it("records an unattributed event and returns CORS headers", async () => {
    mock.queueTableResult("pixels", { data: PIXEL, error: null });
    mock.queueTableResult("conversions", { data: { id: "conv-1" }, error: null });

    const res = await POST(makeRequest({ pixel_id: "px_test1234", event: "purchase", value: 5000 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(body).toMatchObject({ ok: true, conversion_id: "conv-1", attributed: false });

    const inserted = mock.insertsInto("conversions")[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({
      pixel_id: "px_test1234",
      brand_id: PIXEL.brand_id,
      event: "purchase",
      value_amount: 5000,
      attributed: false,
    });
    // Browser events are never payable — no payment fields are set
    expect(inserted.payment_status).toBeUndefined();
    expect((inserted.metadata as Record<string, unknown>).source).toBe("browser");
  });

  it("accepts the pixel id via the legacy X-Tamtam-Key header", async () => {
    mock.queueTableResult("pixels", { data: PIXEL, error: null });
    mock.queueTableResult("conversions", { data: { id: "conv-2" }, error: null });

    const res = await POST(makeRequest({ event: "signup" }, { "x-tamtam-key": "px_test1234" }));

    expect(res.status).toBe(200);
  });

  it("attributes via tm_ref within the window (tracked link -> campaign/echo)", async () => {
    mock.queueTableResult("pixels", { data: PIXEL, error: null });
    mock.queueTableResult("tracked_links", {
      data: {
        id: "link-1",
        campaign_id: "camp-1",
        echo_id: "echo-1",
        created_at: new Date(Date.now() - 3600_000).toISOString(),
      },
      error: null,
    });
    mock.queueTableResult("campaigns", { data: { batteur_id: PIXEL.brand_id }, error: null });
    mock.queueTableResult("conversions", { data: { id: "conv-3" }, error: null });

    const res = await POST(
      makeRequest({ pixel_id: "px_test1234", event: "purchase", tm_ref: "tm_abc123" })
    );
    const body = await res.json();

    expect(body).toMatchObject({ ok: true, attributed: true, attribution_type: "direct" });
    const inserted = mock.insertsInto("conversions")[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({ campaign_id: "camp-1", echo_id: "echo-1", tracked_link_id: "link-1" });
  });

  it("refuses cross-brand attribution (link belongs to another brand's campaign)", async () => {
    mock.queueTableResult("pixels", { data: PIXEL, error: null });
    mock.queueTableResult("tracked_links", {
      data: { id: "link-2", campaign_id: "camp-2", echo_id: "echo-2", created_at: new Date().toISOString() },
      error: null,
    });
    mock.queueTableResult("campaigns", { data: { batteur_id: "someone-else" }, error: null });
    mock.queueTableResult("conversions", { data: { id: "conv-4" }, error: null });

    const res = await POST(
      makeRequest({ pixel_id: "px_test1234", event: "purchase", tm_ref: "tm_stolen" })
    );
    const body = await res.json();

    expect(body.attributed).toBe(false);
    const inserted = mock.insertsInto("conversions")[0] as Record<string, unknown>;
    expect(inserted.campaign_id).toBeNull();
    expect(inserted.echo_id).toBeNull();
  });

  it("dedupes on event_id", async () => {
    mock.queueTableResult("pixels", { data: PIXEL, error: null });
    mock.queueTableResult("conversions", { data: { id: "conv-existing" }, error: null }); // dedup lookup hit

    const res = await POST(
      makeRequest({ pixel_id: "px_test1234", event: "purchase", event_id: "purchase_123" })
    );
    const body = await res.json();

    expect(body).toMatchObject({ ok: true, duplicate: true, conversion_id: "conv-existing" });
    expect(mock.insertsInto("conversions")).toHaveLength(0);
  });

  it("rejects events outside the pixel's allowed list", async () => {
    mock.queueTableResult("pixels", { data: PIXEL, error: null });

    const res = await POST(makeRequest({ pixel_id: "px_test1234", event: "custom" }));

    expect(res.status).toBe(400);
    expect(mock.insertsInto("conversions")).toHaveLength(0);
  });

  it("404s unknown or inactive pixels", async () => {
    mock.queueTableResult("pixels", { data: { ...PIXEL, is_active: false }, error: null });

    const res = await POST(makeRequest({ pixel_id: "px_test1234", event: "purchase" }));

    expect(res.status).toBe(404);
  });

  it("rejects malformed payloads", async () => {
    const res = await POST(makeRequest({ pixel_id: "px_test1234", event: "DROP TABLE;" }));
    expect(res.status).toBe(400);
  });
});
