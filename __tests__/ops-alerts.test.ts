import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./helpers/mock-supabase";
import {
  CHANNEL_ROUTES,
  routeFor,
  type NotificationEvent,
} from "@/lib/notifications/channel-policy";

const sendRoutedEmail = vi.fn();
const sendOpsEmail = vi.fn();
vi.mock("@/lib/notifications/email-router", () => ({
  sendRoutedEmail: (...a: unknown[]) => sendRoutedEmail(...a),
  sendOpsEmail: (...a: unknown[]) => sendOpsEmail(...a),
}));

const alertPayoutFailed = vi.fn();
vi.mock("@/lib/notifications/ops-alerts", () => ({
  alertPayoutFailed: (...a: unknown[]) => alertPayoutFailed(...a),
}));

const sendSms = vi.fn();
vi.mock("@/lib/sms/sms-service", () => ({
  sendSms: (...a: unknown[]) => sendSms(...a),
  normalizePhone: (p: string) => (p ? `+221${p.replace(/\D/g, "").slice(-9)}` : null),
  extractFirstName: (n: string) => n.split(" ")[0] || "Echo",
}));

import { notifyPayoutFailed } from "@/lib/notifications/payout-failed";
import { notifyNewLead } from "@/lib/notifications/lead-notification";

const ECHO = "00000000-0000-0000-0000-0000000000e1";
const BRAND = "00000000-0000-0000-0000-0000000000b1";

beforeEach(() => {
  sendRoutedEmail.mockReset().mockResolvedValue({ status: "sent", resendId: "re_1" });
  sendOpsEmail.mockReset().mockResolvedValue({ status: "sent", resendId: "re_1" });
  alertPayoutFailed.mockReset().mockResolvedValue(undefined);
  sendSms.mockReset().mockResolvedValue({ success: true, ticket: "t1", latencyMs: 10, rawResponse: "" });
});

describe("admin alerts are all reachable and never suppressible", () => {
  const adminEvents = (Object.keys(CHANNEL_ROUTES) as NotificationEvent[]).filter(
    (e) => routeFor(e).audience === "admin",
  );

  it("covers every operational alert the platform depends on", () => {
    // Each of these, when missing, stops something: an unapproved campaign, a
    // held recharge, an unpaid Écho, a bounced payout, an uncalled prospect,
    // and the money-integrity alarm.
    expect(adminEvents.sort()).toEqual(
      [
        "batteur_lead_received",
        "campaign_pending_approval",
        "payout_failed_admin",
        "payout_request",
        "recharge_request",
        "reconciliation_critical",
      ].sort(),
    );
  });

  it("keeps every admin alert on the account category — ops cannot unsubscribe", () => {
    for (const event of adminEvents) {
      expect(routeFor(event).emailCategory, `${event}`).toBe("account");
    }
  });

  it("keeps the ops lead alert distinct from the brand lead delivery", () => {
    // These two shared the name `lead_received` and got conflated: one is a
    // prospect who wants to become a Batteur, the other is a lead-gen capture
    // delivered to the brand that paid for it.
    expect(routeFor("batteur_lead_received").audience).toBe("admin");
    expect(routeFor("lead_received").audience).toBe("brand");
  });
});

describe("notifyPayoutFailed", () => {
  function seed(mock: ReturnType<typeof createMockSupabase>, over: Record<string, unknown> = {}) {
    mock.queueTableResult("users", {
      data: { name: "Awa Diop", phone: "771234567", available_balance: 9000, sms_optout: false, ...over },
    });
  }

  it("tells the Écho on SMS and email, and tells ops", async () => {
    const mock = createMockSupabase();
    seed(mock);

    await notifyPayoutFailed(mock.client, {
      echoId: ECHO,
      amount: 5000,
      reason: "Invalid recipient",
      payoutId: "po-1",
    });

    expect(alertPayoutFailed).toHaveBeenCalledOnce();
    expect(sendRoutedEmail.mock.calls[0][1]).toMatchObject({
      event: "payout_failed",
      userId: ECHO,
      reference: "po-1",
    });
    expect(sendSms).toHaveBeenCalledOnce();
  });

  it("keys the ledger on the payout id — Wave can redeliver a webhook", async () => {
    const mock = createMockSupabase();
    seed(mock);
    await notifyPayoutFailed(mock.client, { echoId: ECHO, amount: 1, reason: null, payoutId: "po-9" });
    expect(sendRoutedEmail.mock.calls[0][1].reference).toBe("po-9");
  });

  it("skips the SMS for an opted-out Écho but still emails and alerts ops", async () => {
    const mock = createMockSupabase();
    seed(mock, { sms_optout: true });

    await notifyPayoutFailed(mock.client, { echoId: ECHO, amount: 5000, reason: null, payoutId: "po-2" });

    expect(sendSms).not.toHaveBeenCalled();
    expect(sendRoutedEmail).toHaveBeenCalledOnce();
    expect(alertPayoutFailed).toHaveBeenCalledOnce();
  });

  it("reassures that the money came back — the whole point of the message", async () => {
    const mock = createMockSupabase();
    seed(mock);
    await notifyPayoutFailed(mock.client, { echoId: ECHO, amount: 5000, reason: null, payoutId: "po-3" });

    expect(sendRoutedEmail.mock.calls[0][1].html).toContain("Votre argent n'est pas perdu");
    expect(sendSms.mock.calls[0][0].message).toContain("de retour sur ton solde");
  });

  it("never throws — a notification must not fail the refund before it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = createMockSupabase();
    seed(mock);
    sendRoutedEmail.mockRejectedValue(new Error("boom"));

    await expect(
      notifyPayoutFailed(mock.client, { echoId: ECHO, amount: 1, reason: null, payoutId: "po-4" }),
    ).resolves.toBeUndefined();
  });
});

describe("notifyNewLead", () => {
  it("delivers to the landing page's inbox when one is set", async () => {
    const mock = createMockSupabase();
    await notifyNewLead({
      supabase: mock.client,
      brandId: BRAND,
      leadId: "lead-1",
      leadName: "Fatou Sow",
      leadPhone: "+221771234567",
      campaignId: "c1",
      campaignTitle: "Kaay",
      notificationEmail: "sales@kaay.sn",
    });

    expect(sendRoutedEmail.mock.calls[0][1]).toMatchObject({
      event: "lead_received",
      userId: BRAND,
      campaignId: "c1",
      reference: "lead-1",
      email: "sales@kaay.sn",
    });
  });

  it("falls back to the brand's account email instead of sending nothing", async () => {
    // The old code returned early with no notificationEmail, so a brand that
    // never filled in the optional field received none of its paid-for leads.
    const mock = createMockSupabase();
    await notifyNewLead({
      supabase: mock.client,
      brandId: BRAND,
      leadId: "lead-2",
      leadName: "Fatou Sow",
      leadPhone: "+221771234567",
      campaignId: "c1",
      campaignTitle: "Kaay",
      notificationEmail: null,
    });

    expect(sendRoutedEmail).toHaveBeenCalledOnce();
    // undefined lets the router resolve the account address
    expect(sendRoutedEmail.mock.calls[0][1].email).toBeUndefined();
  });

  it("never throws — the lead is already saved and billed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = createMockSupabase();
    sendRoutedEmail.mockRejectedValue(new Error("boom"));

    await expect(
      notifyNewLead({
        supabase: mock.client,
        brandId: BRAND,
        leadId: "lead-3",
        leadName: "F",
        leadPhone: "+221771234567",
        campaignId: "c1",
        campaignTitle: "K",
      }),
    ).resolves.toBeUndefined();
  });
});
