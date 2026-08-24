import { describe, it, expect } from "vitest";
import {
  CHANNEL_ROUTES,
  SUPPRESSIBLE_CATEGORIES,
  channelsFor,
  evaluateEmailSuppression,
  isSuppressible,
  routeFor,
  usesChannel,
  type NotificationEvent,
} from "@/lib/notifications/channel-policy";

const EVENTS = Object.keys(CHANNEL_ROUTES) as NotificationEvent[];

describe("channel policy — structural invariants", () => {
  it("gives every event at least one channel", () => {
    for (const event of EVENTS) {
      expect(channelsFor(event).length, `${event} has no channel`).toBeGreaterThan(0);
    }
  });

  it("declares an email category exactly when the event routes to email", () => {
    for (const event of EVENTS) {
      const route = CHANNEL_ROUTES[event];
      expect(
        route.channels.includes("email"),
        `${event}: channels and emailCategory disagree`,
      ).toBe(route.emailCategory !== null);
    }
  });

  it("documents a rationale for every row", () => {
    for (const event of EVENTS) {
      expect(CHANNEL_ROUTES[event].why.length, `${event} has no rationale`).toBeGreaterThan(40);
    }
  });

  it("never lists a channel twice", () => {
    for (const event of EVENTS) {
      const channels = channelsFor(event);
      expect(new Set(channels).size, `${event} repeats a channel`).toBe(channels.length);
    }
  });
});

describe("channel policy — the relevance doctrine", () => {
  // SMS costs money per message. Every event that spends it has to be a money
  // event or a closing window — never engagement.
  const SMS_ALLOWED: NotificationEvent[] = [
    "new_campaign",
    "campaign_ending",
    "payout_sent",
    "payout_failed",
    "budget_exhausted",
  ];

  it("spends SMS only on money or a closing window", () => {
    for (const event of EVENTS) {
      if (usesChannel(event, "sms")) {
        expect(SMS_ALLOWED, `${event} spends SMS without justification`).toContain(event);
      }
    }
  });

  it("keeps email off the short-shelf-life Écho nudges", () => {
    // A nudge that is stale by the time an inbox is checked has no business
    // being an email. `new_campaign` is the deliberate exception — it is why
    // an Écho is on the platform, so it goes on all three.
    for (const event of ["share_reminder", "campaign_ending", "inactivity", "streak_danger"] as const) {
      expect(usesChannel(event, "email"), `${event} must not email Échos`).toBe(false);
    }
  });

  it("makes the highest-volume email suppressible and unsubscribable", () => {
    // new_campaign is ~1 500 emails per approval. It is allowed, but it must
    // never be the kind of mail someone cannot turn off.
    expect(usesChannel("new_campaign", "email")).toBe(true);
    expect(isSuppressible("new_campaign")).toBe(true);
  });

  it("routes every Brand-facing event to email", () => {
    const brandEvents = EVENTS.filter((e) => routeFor(e).audience === "brand");
    expect(brandEvents.length).toBeGreaterThan(0);
    for (const event of brandEvents) {
      expect(usesChannel(event, "email"), `${event} is brand-facing but never emails`).toBe(true);
    }
  });

  it("never pushes to a Brand — brands have no PWA install", () => {
    for (const event of EVENTS) {
      if (routeFor(event).audience === "brand") {
        expect(usesChannel(event, "push"), `${event} pushes to a brand`).toBe(false);
      }
    }
  });

  it("reaches admins by email only", () => {
    for (const event of EVENTS) {
      if (routeFor(event).audience === "admin") {
        expect(channelsFor(event)).toEqual(["email"]);
      }
    }
  });
});

describe("evaluateEmailSuppression", () => {
  it("delivers to a recipient with no preferences set", () => {
    expect(evaluateEmailSuppression("echo_weekly_summary", {})).toEqual({
      optedOut: false,
      reason: null,
    });
  });

  it("honours the global opt-out for suppressible categories", () => {
    const result = evaluateEmailSuppression("brand_nudge", { email_optout: true });
    expect(result).toEqual({ optedOut: true, reason: "global_optout" });
  });

  it("honours a per-category opt-out", () => {
    const result = evaluateEmailSuppression("echo_weekly_summary", {
      email_prefs: { digest: false },
    });
    expect(result).toEqual({ optedOut: true, reason: "category_optout" });
  });

  it("ignores an unrelated category opt-out", () => {
    expect(
      evaluateEmailSuppression("echo_weekly_summary", { email_prefs: { marketing: false } }).optedOut,
    ).toBe(false);
  });

  it("NEVER suppresses money email, even for a globally opted-out user", () => {
    // Withholding "your payout failed" because someone unsubscribed from a
    // weekly digest would be a bug, not a courtesy.
    for (const event of ["payout_failed", "payout_sent", "earnings_unlocked", "recharge_received"] as const) {
      const result = evaluateEmailSuppression(event, {
        email_optout: true,
        email_prefs: { money: false, campaign: false, digest: false, marketing: false },
      });
      expect(result.optedOut, `${event} was suppressed`).toBe(false);
    }
  });

  it("NEVER suppresses account email", () => {
    for (const event of ["otp", "team_invite", "brand_welcome", "role_upgrade"] as const) {
      expect(
        evaluateEmailSuppression(event, { email_optout: true }).optedOut,
        `${event} was suppressed`,
      ).toBe(false);
    }
  });

  it("refuses events that do not route to email at all", () => {
    expect(evaluateEmailSuppression("share_reminder", {})).toEqual({
      optedOut: true,
      reason: "not_an_email_event",
    });
  });
});

describe("isSuppressible", () => {
  it("marks exactly the campaign/digest/marketing events as suppressible", () => {
    for (const event of EVENTS) {
      const category = routeFor(event).emailCategory;
      const expected = category !== null && SUPPRESSIBLE_CATEGORIES.includes(category);
      expect(isSuppressible(event), `${event}`).toBe(expected);
    }
  });

  it("keeps admin alerts non-suppressible — nobody can unsubscribe ops", () => {
    for (const event of EVENTS) {
      if (routeFor(event).audience === "admin") {
        expect(isSuppressible(event), `${event}`).toBe(false);
      }
    }
  });
});
