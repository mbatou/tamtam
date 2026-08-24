import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./helpers/mock-supabase";

const sendRoutedEmail = vi.fn();
vi.mock("@/lib/notifications/email-router", () => ({
  sendRoutedEmail: (...args: unknown[]) => sendRoutedEmail(...args),
}));

import { sendCampaignReport } from "@/lib/notifications/campaign-report";
import { sendRechargeReceipt } from "@/lib/notifications/recharge-receipt";
import { buildBudgetAlertEmail, buildCampaignReportEmail, buildRechargeReceiptEmail } from "@/lib/email";
import {
  BUDGET_ALERT_THRESHOLD,
  crossesBudgetThreshold,
  isAtRisk,
} from "@/lib/notifications/budget-alert";

// fr-FR groups with U+202F (narrow no-break space), not a plain space — assert
// against the same formatter rather than hand-typing the separator.
const fr = (n: number) => n.toLocaleString("fr-FR");

const BRAND = "00000000-0000-0000-0000-0000000000b1";
const CAMPAIGN = "00000000-0000-0000-0000-0000000000c1";

beforeEach(() => {
  sendRoutedEmail.mockReset().mockResolvedValue({ status: "sent", resendId: "re_1" });
});

describe("sendCampaignReport", () => {
  function seed(mock: ReturnType<typeof createMockSupabase>, over: Record<string, unknown> = {}) {
    mock.queueTableResult("campaigns", {
      data: {
        id: CAMPAIGN,
        title: "Lancement Kaay",
        batteur_id: BRAND,
        budget: 50000,
        spent: 42000,
        cpc: 100,
        pricing_model: "cpc",
        created_at: "2026-08-01T00:00:00Z",
        ends_at: "2026-08-20T00:00:00Z",
        ...over,
      },
    });
    mock.queueTableResult("users", { data: { name: "Kaay Store" } });
    mock.queueTableResult("tracked_links", { data: [{ echo_id: "e1" }, { echo_id: "e2" }, { echo_id: "e1" }] });
    mock.queueTableResult("clicks", {
      data: [{ is_valid: true }, { is_valid: true }, { is_valid: false }],
    });
    mock.queueTableResult("conversions", { count: 0 });
    mock.queueTableResult("wallet_transactions", { data: [{ amount: 8000 }] });
  }

  it("sends exactly once per campaign, whichever completion path calls it", async () => {
    const mock = createMockSupabase();
    seed(mock);

    expect(await sendCampaignReport(mock.client, CAMPAIGN)).toBe("sent");
    expect(sendRoutedEmail.mock.calls[0][1]).toMatchObject({
      event: "campaign_completed_report",
      userId: BRAND,
      campaignId: CAMPAIGN,
      oncePerCampaign: true,
    });
  });

  it("counts distinct Échos, not tracked links", async () => {
    const mock = createMockSupabase();
    seed(mock);
    await sendCampaignReport(mock.client, CAMPAIGN);
    // 3 links, 2 distinct échos
    expect(sendRoutedEmail.mock.calls[0][1].html).toContain(">2<");
  });

  it("counts only the exactly-once refund, not F7 duplicates", async () => {
    // The remediation migration demoted superseded duplicates to
    // `campaign_completion_refund_duplicate`; an exact source_type match keeps
    // a historically over-refunded campaign from reporting the inflated figure.
    const mock = createMockSupabase();
    seed(mock);
    await sendCampaignReport(mock.client, CAMPAIGN);

    const refundQuery = mock.fromCalls.find((c) => c.table === "wallet_transactions");
    const eqCalls = (refundQuery!.builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls).toContainEqual(["source_type", "campaign_completion_refund"]);
  });

  it("skips a campaign with no brand rather than throwing", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("campaigns", { data: { id: CAMPAIGN, batteur_id: null } });
    expect(await sendCampaignReport(mock.client, CAMPAIGN)).toBe("skipped");
    expect(sendRoutedEmail).not.toHaveBeenCalled();
  });

  it("never throws — a report must not fail a completion", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = createMockSupabase();
    seed(mock);
    sendRoutedEmail.mockRejectedValue(new Error("boom"));
    expect(await sendCampaignReport(mock.client, CAMPAIGN)).toBe("skipped");
  });
});

describe("sendRechargeReceipt", () => {
  it("passes the payment reference as the idempotency key", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: { name: "Kaay Store", balance: 75000 } });
    mock.queueTableResult("sent_emails", { count: 0 });

    expect(
      await sendRechargeReceipt(mock.client, {
        brandId: BRAND,
        amount: 25000,
        method: "Wave",
        reference: "cos-abc123",
      }),
    ).toBe("sent");

    expect(sendRoutedEmail.mock.calls[0][1]).toMatchObject({
      event: "recharge_received",
      userId: BRAND,
      reference: "cos-abc123",
    });
  });

  it("does not send a second receipt for the same reference", async () => {
    // Both Wave webhook handlers can credit one checkout.
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: { name: "Kaay Store", balance: 75000 } });
    mock.queueTableResult("sent_emails", { count: 1 });

    expect(
      await sendRechargeReceipt(mock.client, {
        brandId: BRAND,
        amount: 25000,
        method: "Wave",
        reference: "cos-abc123",
      }),
    ).toBe("skipped");
    expect(sendRoutedEmail).not.toHaveBeenCalled();
  });

  it("never throws — a receipt must not fail a credit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: { name: "K", balance: 0 } });
    mock.queueTableResult("sent_emails", { count: 0 });
    sendRoutedEmail.mockRejectedValue(new Error("boom"));

    expect(
      await sendRechargeReceipt(mock.client, { brandId: BRAND, amount: 1, method: "Wave", reference: "r" }),
    ).toBe("skipped");
  });
});

describe("brand email templates", () => {
  it("reports cost per unit and labels CPA campaigns by conversion", () => {
    const { subject, html } = buildCampaignReportEmail({
      campaignTitle: "Kaay",
      brandName: "Kaay Store",
      pricingModel: "cpa",
      budget: 50000,
      spent: 40000,
      refunded: 10000,
      validClicks: 900,
      totalClicks: 1000,
      conversions: 40,
      echoCount: 12,
      startedAt: "2026-08-01T00:00:00Z",
      endedAt: "2026-08-20T00:00:00Z",
    });

    expect(subject).toContain("Kaay");
    expect(html).toContain("Conversions");
    expect(html).toContain(`${fr(1000)} FCFA`); // 40 000 / 40 conversions
    expect(html).toContain("Clics rejetés"); // 1000 - 900
  });

  it("omits the rejected-clicks row when nothing was rejected", () => {
    const { html } = buildCampaignReportEmail({
      campaignTitle: "K",
      brandName: "B",
      pricingModel: "cpc",
      budget: 100,
      spent: 100,
      refunded: 0,
      validClicks: 10,
      totalClicks: 10,
      conversions: 0,
      echoCount: 1,
      startedAt: null,
      endedAt: null,
    });
    expect(html).not.toContain("Clics rejetés");
    expect(html).toContain("L'intégralité du budget a été utilisée");
  });

  it("never divides by zero on a campaign that spent nothing", () => {
    const { html } = buildCampaignReportEmail({
      campaignTitle: "K",
      brandName: "B",
      pricingModel: "cpc",
      budget: 1000,
      spent: 0,
      refunded: 1000,
      validClicks: 0,
      totalClicks: 0,
      conversions: 0,
      echoCount: 0,
      startedAt: null,
      endedAt: null,
    });
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });

  it("puts the reference and the new balance on the receipt", () => {
    const { subject, html } = buildRechargeReceiptEmail({
      brandName: "Kaay Store",
      amount: 25000,
      newBalance: 75000,
      method: "Wave",
      reference: "cos-abc123",
      paidAt: "2026-08-20T10:00:00Z",
    });
    expect(subject).toContain(fr(25000));
    expect(html).toContain("cos-abc123");
    expect(html).toContain(`${fr(75000)} FCFA`);
  });

  it("tells the brand how many more clicks the remaining budget buys", () => {
    const { subject, html } = buildBudgetAlertEmail({
      brandName: "Kaay Store",
      campaignTitle: "Lancement",
      budget: 50000,
      spent: 45000,
      cpc: 100,
      pricingModel: "cpc",
    });
    expect(subject).toContain("Lancement");
    expect(html).toContain("90%");
    expect(html).toContain(`${fr(5000)} FCFA`);
    expect(html).toContain("50 clics"); // 5 000 / 100
  });

  it("does not divide by zero when the unit price is unset", () => {
    const { html } = buildBudgetAlertEmail({
      brandName: "B",
      campaignTitle: "C",
      budget: 1000,
      spent: 900,
      cpc: 0,
      pricingModel: "cpc",
    });
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });
});

describe("budget alert threshold", () => {
  // The primary alert fires from the click route, so the crossing test has to
  // be pure arithmetic on numbers already in hand — no query on the hot path.
  it("is true for exactly one click per campaign", () => {
    const budget = 1000;
    const cpc = 100;
    let crossings = 0;
    for (let spent = 0; spent < budget; spent += cpc) {
      if (crossesBudgetThreshold(budget, spent, spent + cpc)) crossings++;
    }
    expect(crossings).toBe(1);
  });

  it("fires on the click that takes spend to the threshold", () => {
    // 700 → 800 of 1000 is the crossing at 80%.
    expect(crossesBudgetThreshold(1000, 700, 800)).toBe(true);
    expect(crossesBudgetThreshold(1000, 600, 700)).toBe(false);
    expect(crossesBudgetThreshold(1000, 800, 900)).toBe(false);
  });

  it("fires when a single large click jumps clean over the threshold", () => {
    expect(crossesBudgetThreshold(1000, 100, 950)).toBe(true);
  });

  it("never divides by zero on a budget-less campaign", () => {
    expect(crossesBudgetThreshold(0, 0, 100)).toBe(false);
  });

  it("agrees with the cron's sweep predicate at the boundary", () => {
    const budget = 1000;
    const spent = Math.ceil(budget * BUDGET_ALERT_THRESHOLD);
    expect(isAtRisk({ budget, spent, cpc: 100, pricing_model: "cpc" })).toBe(true);
    expect(isAtRisk({ budget, spent: spent - 200, cpc: 100, pricing_model: "cpc" })).toBe(false);
  });

  it("does not warn about a campaign that can no longer afford one unit", () => {
    // That campaign is finished, not nearly finished — the click route
    // completes and refunds it, and it gets the report instead.
    expect(isAtRisk({ budget: 1000, spent: 950, cpc: 100, pricing_model: "cpc" })).toBe(false);
    expect(isAtRisk({ budget: 1000, spent: 900, cpc: 100, pricing_model: "cpc" })).toBe(true);
  });

  it("uses the CPA amount as the unit for CPA campaigns", () => {
    expect(isAtRisk({ budget: 10000, spent: 9000, cpc: 0, cpa_amount: 500, pricing_model: "cpa" })).toBe(true);
    expect(isAtRisk({ budget: 10000, spent: 9800, cpc: 0, cpa_amount: 500, pricing_model: "cpa" })).toBe(false);
  });
});
