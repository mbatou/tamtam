/**
 * Channel policy — the single place that decides which channels carry which
 * notification.
 *
 * Why this exists
 * ---------------
 * The platform has three delivery channels and, until now, the choice between
 * them was hardcoded at ~20 call sites. That produced the relevance problem:
 * approving a campaign fired push AND SMS AND an email to every Écho — three
 * copies of the same sentence. Email was the third copy, so it was the one
 * nobody read, which then made every *other* email less likely to be opened.
 *
 * The doctrine, stated once:
 *
 *   SMS costs money per message  → reserve it for money and urgency.
 *   Push is free and instant     → use it for engagement and nudges.
 *   Email is free and permanent  → use it for records, detail, and anything
 *                                  a recipient may need to find again later.
 *
 * And it splits on audience: Échos are phone-native (push + SMS), Brands are
 * email-native (email is their receipt drawer and their reporting channel).
 *
 * Adding an event without adding it here is a type error, so the matrix can't
 * silently drift back into per-call-site choices.
 */

export type Channel = "push" | "sms" | "email";
export type Audience = "echo" | "brand" | "admin";

/**
 * Email categories drive opt-out. `account` and `money` are transactional —
 * they are a record of something that happened to the recipient's identity or
 * their funds, and are never suppressed by a preference toggle. Everything
 * else is suppressible.
 */
export type EmailCategory = "account" | "money" | "campaign" | "digest" | "marketing";

export const SUPPRESSIBLE_CATEGORIES: EmailCategory[] = ["campaign", "digest", "marketing"];

export type NotificationEvent =
  // ── Écho · engagement ────────────────────────────────────────────────────
  | "new_campaign"
  | "share_reminder"
  | "campaign_ending"
  | "inactivity"
  | "streak_danger"
  | "streak_milestone"
  // ── Écho · money ─────────────────────────────────────────────────────────
  | "earnings_unlocked"
  | "payout_sent"
  | "payout_failed"
  // ── Écho · records ───────────────────────────────────────────────────────
  | "echo_weekly_summary"
  | "campaign_completed_echo"
  // ── Brand ────────────────────────────────────────────────────────────────
  | "campaign_live"
  | "campaign_rejected"
  | "campaign_completed_report"
  | "recharge_received"
  | "budget_exhausted"
  | "brand_weekly_summary"
  | "brand_nudge"
  | "brand_welcome"
  | "lead_received"
  // ── Account (email is the credential channel — always email) ──────────────
  | "otp"
  | "role_upgrade"
  | "team_invite"
  // ── Admin / ops ──────────────────────────────────────────────────────────
  | "campaign_pending_approval"
  | "recharge_request"
  | "payout_request"
  | "payout_failed_admin"
  | "batteur_lead_received"
  | "reconciliation_critical";

export interface ChannelRoute {
  audience: Audience;
  /** Channels that actually fire for this event, in delivery order. */
  channels: Channel[];
  /** Null when the event does not route to email at all. */
  emailCategory: EmailCategory | null;
  /** Product rationale. Read this before changing a row. */
  why: string;
}

/**
 * The matrix.
 *
 * Read the `why` column as the argument for the row — it is the part that has
 * to survive review, not the channel list.
 */
export const CHANNEL_ROUTES: Record<NotificationEvent, ChannelRoute> = {
  // ── Écho · engagement — free channels only ───────────────────────────────
  new_campaign: {
    audience: "echo",
    channels: ["push", "sms", "email"],
    emailCategory: "campaign",
    why:
      "The one Écho event on all three channels, by product decision: a new " +
      "campaign is the whole reason an Écho is on the platform, and push only " +
      "reaches PWA installs. It is also the highest-volume email we send " +
      "(1 500+ per approval), so it is suppressible, carries an unsubscribe " +
      "link, and is the first thing to check in email_event_stats — if Échos " +
      "turn it off in numbers, that is the answer.",
  },
  share_reminder: {
    audience: "echo",
    channels: ["push"],
    emailCategory: null,
    why: "A nudge with a 30-minute shelf life. Email arrives too late to act on and SMS is too expensive for a nudge.",
  },
  campaign_ending: {
    audience: "echo",
    channels: ["push", "sms"],
    emailCategory: null,
    why: "Deadline pressure — must land on the phone. SMS is justified because the window closes.",
  },
  inactivity: {
    audience: "echo",
    channels: ["push"],
    emailCategory: null,
    why: "Re-engagement. Free channel only; a dormant Écho is not worth SMS spend and will not open email.",
  },
  streak_danger: {
    audience: "echo",
    channels: ["push"],
    emailCategory: null,
    why: "Same-day gamification signal. Worthless outside the phone.",
  },
  streak_milestone: {
    audience: "echo",
    channels: ["push"],
    emailCategory: null,
    why: "Celebratory, low stakes. Free channel only.",
  },

  // ── Écho · money — email earns its place as the record ───────────────────
  earnings_unlocked: {
    audience: "echo",
    channels: ["push", "email"],
    emailCategory: "money",
    why:
      "Money became withdrawable. Push gets them to act now; the email is the " +
      "durable record with the amount, the campaign, the new balance and the " +
      "withdraw link — the thing they search for when reconciling their own " +
      "earnings. No SMS: the funds are not going anywhere, so it does not " +
      "warrant per-message spend.",
  },
  payout_sent: {
    audience: "echo",
    channels: ["sms", "email"],
    emailCategory: "money",
    why:
      "Cash left the platform for their Wave account. SMS because it is the " +
      "one moment worth paying for, email because it is the receipt.",
  },
  payout_failed: {
    audience: "echo",
    channels: ["sms", "email"],
    emailCategory: "money",
    why: "Their money did not arrive and they must act. Urgency plus a record of what to do next.",
  },

  // ── Écho · records ───────────────────────────────────────────────────────
  echo_weekly_summary: {
    audience: "echo",
    channels: ["email"],
    emailCategory: "digest",
    why: "Detail that does not fit a push body: per-campaign breakdown, totals, trend. Suppressible.",
  },
  campaign_completed_echo: {
    audience: "echo",
    channels: ["email"],
    emailCategory: "campaign",
    why: "Closing statement for a campaign they worked: clicks, earnings, what got paid. A record, not a nudge.",
  },

  // ── Brand — email-native across the board ────────────────────────────────
  campaign_live: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "campaign",
    why: "Brands live in their inbox. Confirms budget is now committed and spending.",
  },
  campaign_rejected: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "campaign",
    why:
      "Was sent on NO channel before this policy — brands discovered rejection " +
      "by refreshing the dashboard. The reason text only works in email; there " +
      "is nowhere else to put a paragraph.",
  },
  campaign_completed_report: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "campaign",
    why: "The performance report is the product deliverable. Tables, per-Écho numbers, refunded balance.",
  },
  recharge_received: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "money",
    why: "A receipt for money the brand paid us. Legally and practically has to be retrievable.",
  },
  budget_exhausted: {
    audience: "brand",
    channels: ["sms", "email"],
    emailCategory: "money",
    why:
      "The only Brand event that is genuinely urgent: the campaign has stopped " +
      "delivering and every hour of silence is lost reach. Worth the SMS.",
  },
  brand_weekly_summary: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "digest",
    why:
      "Reporting cadence for the audience that lives in email. Spend, clicks " +
      "and remaining budget per campaign — a table, so it can only be email. " +
      "Suppressible.",
  },
  brand_nudge: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "marketing",
    why: "Activation prompt for brands who never launched. Suppressible — this is marketing.",
  },
  brand_welcome: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "account",
    why: "Carries the temporary password. Email is the only channel that can.",
  },
  lead_received: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "campaign",
    why:
      "A prospect filled in the brand's lead-gen form. The brand paid per " +
      "lead, so this is the delivery of a purchased good — it carries the " +
      "name, phone and a WhatsApp deep link to call them back.",
  },

  // ── Account ──────────────────────────────────────────────────────────────
  otp: {
    audience: "echo",
    channels: ["email"],
    emailCategory: "account",
    why: "Email IS the credential channel here. Never suppressible for any reason.",
  },
  role_upgrade: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "account",
    why: "Changes what the account can do. Account-level record.",
  },
  team_invite: {
    audience: "brand",
    channels: ["email"],
    emailCategory: "account",
    why: "The invite link is the payload. Nothing else can carry it.",
  },

  // ── Admin / ops — internal, never suppressible ───────────────────────────
  campaign_pending_approval: {
    audience: "admin",
    channels: ["email"],
    emailCategory: "account",
    why: "Operational alert to the platform team. Missing these is what stalls campaign approvals.",
  },
  recharge_request: {
    audience: "admin",
    channels: ["email"],
    emailCategory: "account",
    why: "Requires a human to verify a Wave payment and release funds.",
  },
  payout_request: {
    audience: "admin",
    channels: ["email"],
    emailCategory: "account",
    why: "Requires a human to release an Écho's money.",
  },
  payout_failed_admin: {
    audience: "admin",
    channels: ["email"],
    emailCategory: "account",
    why:
      "An Écho's withdrawal bounced and the funds were returned to their " +
      "balance. Nobody was told before this — not the Écho, not ops — so a " +
      "failed payout looked identical to a slow one.",
  },
  reconciliation_critical: {
    audience: "admin",
    channels: ["email"],
    emailCategory: "account",
    why:
      "The money-integrity alarm. Deduped to once an hour, and the dedup key " +
      "is now written only after a successful send — it used to be written " +
      "first, so a single bounce silenced the alarm for the rest of the hour.",
  },
  batteur_lead_received: {
    audience: "admin",
    channels: ["email"],
    emailCategory: "account",
    why:
      "A prospect wants to become a Batteur. Distinct from `lead_received`, " +
      "which is a lead-gen capture delivered TO a brand — the two used to " +
      "share a name and that is how they got conflated.",
  },
};

export function routeFor(event: NotificationEvent): ChannelRoute {
  return CHANNEL_ROUTES[event];
}

export function channelsFor(event: NotificationEvent): Channel[] {
  return CHANNEL_ROUTES[event].channels;
}

export function usesChannel(event: NotificationEvent, channel: Channel): boolean {
  return CHANNEL_ROUTES[event].channels.includes(channel);
}

/** Preference blob stored on `users.email_prefs`. Absent keys mean "opted in". */
export type EmailPrefs = Partial<Record<EmailCategory, boolean>>;

export interface EmailSuppression {
  optedOut: boolean;
  reason: "global_optout" | "category_optout" | "not_an_email_event" | null;
}

/**
 * Decide whether a given email event may be delivered to a given recipient.
 *
 * Transactional categories (`account`, `money`) ignore both the global opt-out
 * and per-category preferences: suppressing "your payout failed" because
 * someone unsubscribed from a weekly digest would be a bug, not a courtesy.
 */
export function evaluateEmailSuppression(
  event: NotificationEvent,
  recipient: { email_optout?: boolean | null; email_prefs?: EmailPrefs | null },
): EmailSuppression {
  const route = CHANNEL_ROUTES[event];

  if (!route.channels.includes("email") || !route.emailCategory) {
    return { optedOut: true, reason: "not_an_email_event" };
  }

  const category = route.emailCategory;
  if (!SUPPRESSIBLE_CATEGORIES.includes(category)) {
    return { optedOut: false, reason: null };
  }

  if (recipient.email_optout) {
    return { optedOut: true, reason: "global_optout" };
  }

  if (recipient.email_prefs?.[category] === false) {
    return { optedOut: true, reason: "category_optout" };
  }

  return { optedOut: false, reason: null };
}

export function isSuppressible(event: NotificationEvent): boolean {
  const category = CHANNEL_ROUTES[event].emailCategory;
  return category !== null && SUPPRESSIBLE_CATEGORIES.includes(category);
}

/** Human-readable French labels for the preference centre. */
export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  account: "Compte et sécurité",
  money: "Paiements et gains",
  campaign: "Campagnes",
  digest: "Résumés hebdomadaires",
  marketing: "Conseils et nouveautés",
};
