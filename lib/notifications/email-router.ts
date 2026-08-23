import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailSafe } from "@/lib/email";
import { getUserEmails } from "@/lib/user-emails";
import { unsubscribeUrl } from "./unsubscribe-token";
import {
  CHANNEL_ROUTES,
  CATEGORY_LABELS,
  evaluateEmailSuppression,
  isSuppressible,
  type EmailPrefs,
  type NotificationEvent,
} from "./channel-policy";

/**
 * The only way an email should leave the platform for a real user.
 *
 * Everything that used to be decided at the call site — is email even the
 * right channel, is this person opted out, has this already been sent, does it
 * need an unsubscribe link, did it land — is decided here once, from the
 * channel policy. Call sites pass an event name and content.
 *
 * Admin/ops alerts go through `sendOpsEmail` instead: they have no recipient
 * user row and are never suppressible.
 */

export type EmailOutcome =
  | { status: "sent"; resendId: string | undefined }
  | { status: "suppressed"; reason: string }
  | { status: "failed"; error: string };

interface RoutedEmail {
  event: NotificationEvent;
  userId: string;
  subject: string;
  html: string;
  campaignId?: string | null;
  /** Skip if the same event was already emailed to this user within N hours. */
  dedupeWithinHours?: number;
  /** Pre-resolved address, to avoid a per-recipient auth lookup in fan-outs. */
  email?: string;
  /** Pre-fetched preferences, same reason. */
  prefs?: { email_optout?: boolean | null; email_prefs?: EmailPrefs | null };
}

const FOOTER_STYLE =
  "margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;color:#999;font-size:12px;line-height:1.6;";

/**
 * Suppressible mail gets a real unsubscribe link. Transactional mail gets a
 * line explaining why it cannot be unsubscribed from, so the absence of a link
 * reads as deliberate rather than as an oversight.
 */
export function buildFooter(event: NotificationEvent, userId: string): string {
  const route = CHANNEL_ROUTES[event];
  const category = route.emailCategory;
  if (!category) return "";

  if (!isSuppressible(event)) {
    return `
      <div style="${FOOTER_STYLE}">
        Cet email concerne votre compte ou vos paiements — il ne peut pas être désactivé.<br/>
        Tamtam · <a href="mailto:support@tamma.me" style="color:#999;">support@tamma.me</a>
      </div>`;
  }

  const categoryLink = unsubscribeUrl(userId, category);
  const allLink = unsubscribeUrl(userId);

  return `
    <div style="${FOOTER_STYLE}">
      Vous recevez cet email dans la catégorie « ${CATEGORY_LABELS[category]} ».<br/>
      <a href="${categoryLink}" style="color:#999;">Ne plus recevoir ces emails</a>
      &nbsp;·&nbsp;
      <a href="${allLink}" style="color:#999;">Me désabonner de tout</a><br/>
      Tamtam · <a href="mailto:support@tamma.me" style="color:#999;">support@tamma.me</a>
    </div>`;
}

async function recordSend(
  supabase: SupabaseClient,
  row: {
    user_id: string | null;
    email_type: string;
    campaign_id?: string | null;
    recipient?: string | null;
    category?: string | null;
    status: string;
    resend_id?: string | null;
    suppression_reason?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("sent_emails").insert(row);
  if (error) {
    // Never fail a send because the ledger write failed, but say so loudly —
    // a silent ledger is how "95% of emails untracked" happened.
    console.error(`[email-router] ledger insert failed for ${row.email_type}:`, error.message);
  }
}

async function alreadySent(
  supabase: SupabaseClient,
  userId: string,
  event: string,
  hours: number,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { count } = await supabase
    .from("sent_emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("email_type", event)
    .eq("status", "sent")
    .gte("created_at", cutoff);
  return (count ?? 0) > 0;
}

export async function sendRoutedEmail(
  supabase: SupabaseClient,
  opts: RoutedEmail,
): Promise<EmailOutcome> {
  const route = CHANNEL_ROUTES[opts.event];

  // A call site asking to email an event the policy routes elsewhere is a bug
  // in the call site, not a preference. Refuse it rather than quietly widening
  // the matrix back out.
  if (!route.channels.includes("email")) {
    console.error(
      `[email-router] "${opts.event}" does not route to email (channels: ${route.channels.join(", ")}). Not sent.`,
    );
    return { status: "suppressed", reason: "not_an_email_event" };
  }

  const prefs = opts.prefs ?? (await fetchPrefs(supabase, [opts.userId])).get(opts.userId) ?? {};
  const suppression = evaluateEmailSuppression(opts.event, prefs);

  if (suppression.optedOut) {
    await recordSend(supabase, {
      user_id: opts.userId,
      email_type: opts.event,
      campaign_id: opts.campaignId ?? null,
      category: route.emailCategory,
      status: "suppressed",
      suppression_reason: suppression.reason,
    });
    return { status: "suppressed", reason: suppression.reason || "opted_out" };
  }

  if (opts.dedupeWithinHours && (await alreadySent(supabase, opts.userId, opts.event, opts.dedupeWithinHours))) {
    return { status: "suppressed", reason: "already_sent" };
  }

  const to = opts.email ?? (await getUserEmails(supabase, [opts.userId])).get(opts.userId);
  if (!to) {
    await recordSend(supabase, {
      user_id: opts.userId,
      email_type: opts.event,
      campaign_id: opts.campaignId ?? null,
      category: route.emailCategory,
      status: "suppressed",
      suppression_reason: "no_email_address",
    });
    return { status: "suppressed", reason: "no_email_address" };
  }

  const result = await sendEmailSafe({
    to,
    subject: opts.subject,
    html: opts.html + buildFooter(opts.event, opts.userId),
    tags: [
      { name: "event", value: opts.event },
      { name: "category", value: route.emailCategory || "none" },
      { name: "audience", value: route.audience },
    ],
  });

  await recordSend(supabase, {
    user_id: opts.userId,
    email_type: opts.event,
    campaign_id: opts.campaignId ?? null,
    recipient: to,
    category: route.emailCategory,
    status: result.success ? "sent" : "failed",
    resend_id: result.success ? result.id ?? null : null,
    suppression_reason: result.success ? null : result.error.slice(0, 500),
  });

  if (!result.success) {
    console.error(`[email-router] send failed for ${opts.event} → ${to}: ${result.error}`);
    return { status: "failed", error: result.error };
  }

  return { status: "sent", resendId: result.id };
}

/**
 * Ops alerts to the platform team. No recipient user, no opt-out, still logged
 * so a missing alert can be proven rather than guessed at.
 */
export async function sendOpsEmail(
  supabase: SupabaseClient,
  opts: { event: NotificationEvent; to: string; subject: string; html: string; campaignId?: string | null },
): Promise<EmailOutcome> {
  const route = CHANNEL_ROUTES[opts.event];

  const result = await sendEmailSafe({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    tags: [
      { name: "event", value: opts.event },
      { name: "audience", value: route.audience },
    ],
  });

  await recordSend(supabase, {
    user_id: null,
    email_type: opts.event,
    campaign_id: opts.campaignId ?? null,
    recipient: opts.to,
    category: route.emailCategory,
    status: result.success ? "sent" : "failed",
    resend_id: result.success ? result.id ?? null : null,
    suppression_reason: result.success ? null : result.error.slice(0, 500),
  });

  if (!result.success) {
    console.error(`[email-router] ops alert "${opts.event}" to ${opts.to} FAILED: ${result.error}`);
    return { status: "failed", error: result.error };
  }
  return { status: "sent", resendId: result.id };
}

/** One query for a whole fan-out instead of one per recipient. */
export async function fetchPrefs(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { email_optout: boolean | null; email_prefs: EmailPrefs | null }>> {
  const map = new Map<string, { email_optout: boolean | null; email_prefs: EmailPrefs | null }>();
  if (userIds.length === 0) return map;

  const BATCH = 500;
  for (let i = 0; i < userIds.length; i += BATCH) {
    const { data, error } = await supabase
      .from("users")
      .select("id, email_optout, email_prefs")
      .in("id", userIds.slice(i, i + BATCH));

    if (error) {
      console.error("[email-router] pref fetch failed:", error.message);
      continue;
    }
    for (const row of data || []) {
      map.set(row.id, {
        email_optout: row.email_optout ?? false,
        email_prefs: (row.email_prefs as EmailPrefs | null) ?? null,
      });
    }
  }
  return map;
}

/**
 * Fan-out helper: resolves addresses and preferences once, then sends in
 * bounded concurrency batches (Resend rate limits, and unbounded
 * Promise.allSettled over 1 500 recipients exhausts file descriptors).
 */
export async function sendRoutedEmailBatch(
  supabase: SupabaseClient,
  event: NotificationEvent,
  recipients: Array<{ userId: string; subject: string; html: string; campaignId?: string | null }>,
  options: { dedupeWithinHours?: number; concurrency?: number } = {},
): Promise<{ sent: number; suppressed: number; failed: number }> {
  const totals = { sent: 0, suppressed: 0, failed: 0 };
  if (recipients.length === 0) return totals;

  const ids = recipients.map((r) => r.userId);
  const [emails, prefs] = await Promise.all([getUserEmails(supabase, ids), fetchPrefs(supabase, ids)]);

  const size = options.concurrency ?? 10;
  for (let i = 0; i < recipients.length; i += size) {
    const batch = recipients.slice(i, i + size);
    const results = await Promise.all(
      batch.map((r) =>
        sendRoutedEmail(supabase, {
          event,
          userId: r.userId,
          subject: r.subject,
          html: r.html,
          campaignId: r.campaignId,
          dedupeWithinHours: options.dedupeWithinHours,
          email: emails.get(r.userId),
          prefs: prefs.get(r.userId),
        }).catch((err): EmailOutcome => ({ status: "failed", error: String(err) })),
      ),
    );
    for (const result of results) totals[result.status]++;
  }

  return totals;
}
