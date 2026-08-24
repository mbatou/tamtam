# Notification channels — the doctrine

The platform has three delivery channels, and until now the choice between them
was hardcoded at ~20 call sites. That is what produced the relevance problem:
some events went out on all three channels with no thought given to why, while
the emails a Brand actually needed — a rejection reason, a performance report, a
payment receipt — did not exist at all.

The rule, stated once:

| Channel | Cost | Property | Use it for |
|---|---|---|---|
| **SMS** | per message | reaches any phone | money and closing windows |
| **Push** | free | instant, phone-only | engagement and nudges |
| **Email** | free | permanent, unlimited length | records, detail, anything to find again later |

And it splits on audience: **Échos are phone-native** (push + SMS), **Brands are
email-native** (email is their receipt drawer and their reporting channel).

The matrix lives in [`lib/notifications/channel-policy.ts`](../lib/notifications/channel-policy.ts).
Every row carries a `why` — read that before changing a channel list. Adding an
event without adding it to the matrix is a type error, so the choice cannot
drift back out to call sites.

## The approved set

**Écho gets email for:**

| Event | Channels | Notes |
|---|---|---|
| New campaign available | push + SMS + **email** | Geo-targeted to the campaign's cities. ~1 500 per approval, so suppressible. |
| Earnings unlocked | push + **email** | No SMS — the money is not going anywhere. |
| Campaign completed | **email** | Closing statement: clicks and earnings. |

**Brand gets email for:**

| Event | Channels | Notes |
|---|---|---|
| Campaign approved | **email** | |
| Campaign rejected | **email** | Carries the reason — nothing else can. |
| Campaign completed | **email** | Full performance report. |
| Recharge confirmed | **email** | Receipt, keyed by payment reference. |
| Budget nearly exhausted | **email + SMS** | The one urgent Brand event. |
| Lead received | **email** (to ops) | |

Everything else on the Écho side — share reminders, inactivity, streaks,
campaign-ending — is push only. A nudge that is stale by the time an inbox is
checked has no business being an email.

## What changed

**Removed where email was a duplicate**

| Event | Before | After |
|---|---|---|
| `echo_weekly_summary` | email + a hand-rolled push blast | email |
| superadmin "notify Échos" tool | email to all Échos + WhatsApp links | push + SMS + email via the router |

The weekly-summary push bypassed `notification_prefs`, the daily cap and the
queue — it initialised `web-push` by hand.

**Added where it was genuinely missing**

| Event | Before | After |
|---|---|---|
| `campaign_rejected` | **nothing, on any channel** | email with the reason and the refund |
| `campaign_completed_report` | **nothing** | full performance report to the brand |
| `recharge_received` | **nothing** | receipt with reference and new balance |
| `budget_exhausted` | **nothing** | email + SMS before the campaign stops |
| `earnings_unlocked` (push half) | a `wa.me` link built and thrown away | real push, cap-bypassed |

A brand whose campaign was refused used to find out by refreshing the dashboard
and noticing a status chip. The reason text existed only in the database. A
brand whose campaign finished got no report at all — the deliverable of the
product was a dashboard they had to remember to visit.

## Sending exactly once

Three of the new emails fan in from multiple code paths, so the ledger is the
guard rather than a flag on the row:

- **Campaign report** — completion is reachable from six paths (expiry cron,
  superadmin stop, brand stop, two exhaustion branches in the click route).
  `oncePerCampaign` checks `sent_emails` for an existing successful send.
- **Recharge receipt** — both Wave webhook handlers can credit one checkout.
  Keyed on the payment reference, with a partial-unique index behind it so the
  guard is the database's, not a race-prone read.
- **Budget alert** — the cron runs hourly but a campaign crosses 80% once.
  Same `oncePerCampaign` guard, and the SMS only fires alongside a first-time
  email, so we never pay for a text about a campaign already warned about.

The budget alert runs on a cron rather than in the click route deliberately:
the click route ends in a redirect, and work started after a redirect is
dropped when the serverless function freezes. That is exactly how the
`pending_earnings` drift happened.

## Money and account email is never suppressed

`account` and `money` categories ignore both the global opt-out and per-category
preferences. Withholding *"your payout failed"* because someone unsubscribed
from a weekly digest would be a bug, not a courtesy. The footer on those emails
says so explicitly, so the absence of an unsubscribe link reads as deliberate.

Money events also bypass the push daily cap (`sendSinglePush(..., { bypassDailyCap: true })`)
— being second in the queue behind a share reminder is not a reason to withhold
*"your money is ready"*.

## Unsubscribe

SMS has carried `STOP 36180` since launch. Email carried nothing — a legal
exposure with 1 505 recipients. Every suppressible email now ends with a
one-click unsubscribe (per-category and global), signed with an HMAC so no login
is needed and the link cannot be tampered into unsubscribing a different user.
No token column, no expiry sweep. See `lib/notifications/unsubscribe-token.ts`.

In-app, all three channels are manageable from `/api/echo/notification-prefs`.
Non-suppressible categories are deliberately not exposed there: offering a
toggle that does nothing would be a lie.

## Measuring relevance

`sent_emails` is now the universal ledger — every send, suppression and failure,
with the Resend message id. Before this, ~95% of platform email was
undiagnosable after the fact because the id was discarded on send.

```sql
select * from email_event_stats order by total desc;
```

That view is how you answer *"is this event's email worth sending at all?"* —
which is the question this whole exercise exists to serve. An event with a high
`suppressed` count is one people are actively turning off. An event with a high
`failed` count is one nobody is receiving.

## The pagination bug this also fixed

Five separate places resolved addresses with `listUsers({ perPage: 1000 })`,
silently dropping every user past #1000. The platform has 1 522. Everything now
goes through `lib/user-emails.ts`, which paginates properly.

## Open questions

- **SMS cost per message / monthly budget** — the matrix reserves SMS for money
  and closing windows on principle. With the actual figure, `new_campaign` (the
  one high-volume SMS event) can be argued properly rather than assumed.
- **Do Échos read email?** Now measurable: `email_event_stats` plus Resend's
  open tracking on the tagged sends. If Écho open rates stay low even on money
  email, `earnings_unlocked` should move to SMS.
- **Is `new_campaign` email worth it?** It is by far the highest-volume email
  we send and the only Écho event on all three channels. Watch its
  `suppressed` count: if Échos unsubscribe from the campaign category in
  numbers, that is the answer without needing to argue about it.

## Still enabled but not in the approved set

Three scheduled emails predate this policy and were not on the approved list:
`echo_weekly_summary`, `brand_weekly_summary` and `brand_nudge`. They are
digests and marketing rather than event-driven mail, they are all suppressible,
and they are all now routed and measured. Cutting them is a one-line change per
cron plus a `vercel.json` entry — say the word.
