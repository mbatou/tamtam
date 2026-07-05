import { describe, it, expect } from "vitest";
import { scoreLead, type FraudScoringInput } from "@/lib/lead-fraud-scorer";
import { createMockSupabase, type MockSupabase } from "./helpers/mock-supabase";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function baseInput(overrides: Partial<FraudScoringInput> = {}): FraudScoringInput {
  return {
    ip_address: "41.82.0.1",
    user_agent: CHROME_UA,
    phone: "+221771234567",
    landing_page_id: "lp-1",
    // page loaded 60s ago — not a speed flag
    page_load_ts: Date.now() - 60_000,
    ...overrides,
  };
}

/** Queue the two `leads` count queries scoreLead runs: ip-velocity, phone-reuse. */
function queueCounts(mock: MockSupabase, { ipPages = 0, phoneVerified = 0 } = {}) {
  mock.queueTableResult("leads", { count: ipPages, error: null });
  mock.queueTableResult("leads", { count: phoneVerified, error: null });
}

describe("scoreLead (real module)", () => {
  it("scores 0 / verify for a clean lead", async () => {
    const mock = createMockSupabase();
    queueCounts(mock);

    const result = await scoreLead(mock.client, baseInput());

    expect(result).toEqual({ score: 0, factors: [], decision: "verify" });
  });

  it("adds +30 for an IP that hit 3+ other landing pages in 24h", async () => {
    const mock = createMockSupabase();
    queueCounts(mock, { ipPages: 3 });

    const result = await scoreLead(mock.client, baseInput());

    expect(result.score).toBe(30);
    expect(result.factors).toContain("ip_multi_page:3");
    expect(result.decision).toBe("flag");
  });

  it("adds +20 for a bot user agent", async () => {
    const mock = createMockSupabase();
    queueCounts(mock);

    const result = await scoreLead(mock.client, baseInput({ user_agent: "python-requests/2.31" }));

    expect(result.score).toBe(20);
    expect(result.factors).toContain("bot_ua");
    expect(result.decision).toBe("verify"); // < 30
  });

  it("treats an empty/short user agent as bot-like", async () => {
    const mock = createMockSupabase();
    queueCounts(mock);

    const result = await scoreLead(mock.client, baseInput({ user_agent: "" }));

    expect(result.factors).toContain("bot_ua");
  });

  it("adds +15 for a submission under 5 seconds after page load", async () => {
    const mock = createMockSupabase();
    queueCounts(mock);

    const result = await scoreLead(mock.client, baseInput({ page_load_ts: Date.now() - 2_000 }));

    expect(result.score).toBe(15);
    expect(result.factors.some((f) => f.startsWith("speed:"))).toBe(true);
  });

  it("adds +20 for a phone already verified on 5+ campaigns", async () => {
    const mock = createMockSupabase();
    queueCounts(mock, { phoneVerified: 5 });

    const result = await scoreLead(mock.client, baseInput());

    expect(result.score).toBe(20);
    expect(result.factors).toContain("phone_reuse:5");
  });

  it("rejects at score >= 70 when factors stack", async () => {
    const mock = createMockSupabase();
    queueCounts(mock, { ipPages: 4, phoneVerified: 6 }); // 30 + 20

    const result = await scoreLead(
      mock.client,
      baseInput({ user_agent: "curl/8.0", page_load_ts: Date.now() - 1_000 }) // +20 +15
    );

    expect(result.score).toBe(85);
    expect(result.decision).toBe("reject");
  });

  it("flags (manual review) in the 30-69 band", async () => {
    const mock = createMockSupabase();
    queueCounts(mock, { phoneVerified: 5 }); // 20

    const result = await scoreLead(mock.client, baseInput({ user_agent: "HeadlessChrome" })); // +20

    expect(result.score).toBe(40);
    expect(result.decision).toBe("flag");
  });
});
