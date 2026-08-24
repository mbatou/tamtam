import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "./helpers/mock-supabase";

const sendEmailSafe = vi.fn();
vi.mock("@/lib/email", () => ({ sendEmailSafe: (o: unknown) => sendEmailSafe(o) }));

const getUserEmails = vi.fn();
vi.mock("@/lib/user-emails", () => ({
  getUserEmails: (...args: unknown[]) => getUserEmails(...args),
}));

import {
  sendRoutedEmail,
  sendOpsEmail,
  sendRoutedEmailBatch,
  buildFooter,
} from "@/lib/notifications/email-router";

const ECHO = "00000000-0000-0000-0000-0000000000e1";
const BRAND = "00000000-0000-0000-0000-0000000000b1";

function ok(id = "re_123") {
  return { success: true as const, id };
}

beforeEach(() => {
  process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret";
  sendEmailSafe.mockReset().mockResolvedValue(ok());
  getUserEmails.mockReset().mockResolvedValue(new Map([[ECHO, "echo@example.com"], [BRAND, "brand@example.com"]]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendRoutedEmail — the policy is enforced here, not at call sites", () => {
  it("refuses to send an event the policy routes away from email", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = createMockSupabase();

    // `share_reminder` is push-only. A call site asking to email it is a bug in
    // the call site — the router must not quietly widen the matrix back out.
    const result = await sendRoutedEmail(mock.client, {
      event: "share_reminder",
      userId: ECHO,
      subject: "x",
      html: "<p>x</p>",
    });

    expect(result).toEqual({ status: "suppressed", reason: "not_an_email_event" });
    expect(sendEmailSafe).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it("sends a routed event and records it in the ledger with the Resend id", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: ECHO, email_optout: false, email_prefs: null }] });

    const result = await sendRoutedEmail(mock.client, {
      event: "earnings_unlocked",
      userId: ECHO,
      subject: "1 000 FCFA débloqués",
      html: "<p>bravo</p>",
      campaignId: "c1",
    });

    expect(result).toEqual({ status: "sent", resendId: "re_123" });

    const [row] = mock.insertsInto("sent_emails") as Array<Record<string, unknown>>;
    expect(row).toMatchObject({
      user_id: ECHO,
      email_type: "earnings_unlocked",
      campaign_id: "c1",
      category: "money",
      status: "sent",
      resend_id: "re_123",
      recipient: "echo@example.com",
    });
  });

  it("tags every send with event, category and audience", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: BRAND, email_optout: false, email_prefs: null }] });

    await sendRoutedEmail(mock.client, {
      event: "campaign_rejected",
      userId: BRAND,
      subject: "s",
      html: "<p>h</p>",
    });

    expect(sendEmailSafe.mock.calls[0][0].tags).toEqual([
      { name: "event", value: "campaign_rejected" },
      { name: "category", value: "campaign" },
      { name: "audience", value: "brand" },
    ]);
  });

  it("suppresses a digest for an opted-out recipient and logs why", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: ECHO, email_optout: true, email_prefs: null }] });

    const result = await sendRoutedEmail(mock.client, {
      event: "echo_weekly_summary",
      userId: ECHO,
      subject: "s",
      html: "<p>h</p>",
    });

    expect(result).toEqual({ status: "suppressed", reason: "global_optout" });
    expect(sendEmailSafe).not.toHaveBeenCalled();
    expect(mock.insertsInto("sent_emails")[0]).toMatchObject({
      status: "suppressed",
      suppression_reason: "global_optout",
    });
  });

  it("still delivers money email to a globally opted-out recipient", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: ECHO, email_optout: true, email_prefs: { money: false } }] });

    const result = await sendRoutedEmail(mock.client, {
      event: "payout_failed",
      userId: ECHO,
      subject: "Retrait échoué",
      html: "<p>h</p>",
    });

    expect(result.status).toBe("sent");
    expect(sendEmailSafe).toHaveBeenCalledTimes(1);
  });

  it("records a failure instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmailSafe.mockResolvedValue({ success: false, error: "Resend 429" });
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: BRAND, email_optout: false, email_prefs: null }] });

    const result = await sendRoutedEmail(mock.client, {
      event: "campaign_live",
      userId: BRAND,
      subject: "s",
      html: "<p>h</p>",
    });

    expect(result).toEqual({ status: "failed", error: "Resend 429" });
    expect(mock.insertsInto("sent_emails")[0]).toMatchObject({
      status: "failed",
      suppression_reason: "Resend 429",
    });
  });

  it("suppresses when the recipient has no address rather than sending to undefined", async () => {
    getUserEmails.mockResolvedValue(new Map());
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: ECHO, email_optout: false, email_prefs: null }] });

    const result = await sendRoutedEmail(mock.client, {
      event: "echo_weekly_summary",
      userId: ECHO,
      subject: "s",
      html: "<p>h</p>",
    });

    expect(result).toEqual({ status: "suppressed", reason: "no_email_address" });
    expect(sendEmailSafe).not.toHaveBeenCalled();
  });
});

describe("buildFooter", () => {
  it("gives suppressible mail a working unsubscribe link", () => {
    const footer = buildFooter("echo_weekly_summary", ECHO);
    expect(footer).toContain("/api/email/unsubscribe");
    expect(footer).toContain(`u=${ECHO}`);
    expect(footer).toContain("c=digest");
    expect(footer).toContain("Me désabonner de tout");
  });

  it("gives transactional mail no link, and says why", () => {
    const footer = buildFooter("payout_failed", ECHO);
    expect(footer).not.toContain("/api/email/unsubscribe");
    expect(footer).toContain("ne peut pas être désactivé");
  });

  it("appends the footer to the sent body", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", { data: [{ id: ECHO, email_optout: false, email_prefs: null }] });

    await sendRoutedEmail(mock.client, {
      event: "echo_weekly_summary",
      userId: ECHO,
      subject: "s",
      html: "<p>body</p>",
    });

    const html = sendEmailSafe.mock.calls[0][0].html as string;
    expect(html).toContain("<p>body</p>");
    expect(html).toContain("/api/email/unsubscribe");
  });
});

describe("sendOpsEmail", () => {
  it("sends without a recipient user row and never checks preferences", async () => {
    const mock = createMockSupabase();

    const result = await sendOpsEmail(mock.client, {
      event: "campaign_pending_approval",
      to: "ops@tamma.me",
      subject: "Nouvelle campagne à valider",
      html: "<p>h</p>",
      campaignId: "c9",
    });

    expect(result.status).toBe("sent");
    expect(mock.fromCalls.some((c) => c.table === "users")).toBe(false);
    expect(mock.insertsInto("sent_emails")[0]).toMatchObject({
      user_id: null,
      email_type: "campaign_pending_approval",
      recipient: "ops@tamma.me",
      campaign_id: "c9",
      status: "sent",
    });
  });

  it("logs loudly when an ops alert fails — this is the failure that stalls approvals", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmailSafe.mockResolvedValue({ success: false, error: "domain not verified" });
    const mock = createMockSupabase();

    const result = await sendOpsEmail(mock.client, {
      event: "campaign_pending_approval",
      to: "ops@tamma.me",
      subject: "s",
      html: "<p>h</p>",
    });

    expect(result.status).toBe("failed");
    expect(errSpy.mock.calls.flat().join(" ")).toContain("FAILED");
  });
});

describe("sendRoutedEmailBatch", () => {
  it("resolves addresses once for the whole fan-out, not once per recipient", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", {
      data: [
        { id: ECHO, email_optout: false, email_prefs: null },
        { id: BRAND, email_optout: false, email_prefs: null },
      ],
    });

    const totals = await sendRoutedEmailBatch(mock.client, "echo_weekly_summary", [
      { userId: ECHO, subject: "a", html: "<p>a</p>" },
      { userId: BRAND, subject: "b", html: "<p>b</p>" },
    ]);

    expect(totals).toEqual({ sent: 2, suppressed: 0, failed: 0 });
    expect(getUserEmails).toHaveBeenCalledTimes(1);
    expect(getUserEmails.mock.calls[0][1]).toEqual([ECHO, BRAND]);
  });

  it("counts suppressed and sent separately so a cron can report honestly", async () => {
    const mock = createMockSupabase();
    mock.queueTableResult("users", {
      data: [
        { id: ECHO, email_optout: true, email_prefs: null },
        { id: BRAND, email_optout: false, email_prefs: null },
      ],
    });

    const totals = await sendRoutedEmailBatch(mock.client, "echo_weekly_summary", [
      { userId: ECHO, subject: "a", html: "<p>a</p>" },
      { userId: BRAND, subject: "b", html: "<p>b</p>" },
    ]);

    expect(totals).toEqual({ sent: 1, suppressed: 1, failed: 0 });
  });

  it("is a no-op for an empty list", async () => {
    const mock = createMockSupabase();
    expect(await sendRoutedEmailBatch(mock.client, "brand_nudge", [])).toEqual({
      sent: 0,
      suppressed: 0,
      failed: 0,
    });
    expect(getUserEmails).not.toHaveBeenCalled();
  });
});
