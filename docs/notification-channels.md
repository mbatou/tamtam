# Notification channels — the doctrine

The platform has three delivery channels. Until now the choice between them was
hardcoded at ~20 call sites, which produced the relevance problem: approving one
campaign fired **push AND SMS AND an email to every Écho** — three copies of the
same sentence. Email was the third copy, so it was the one nobody read, which
then made every *other* email less likely to be opened.

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

## What changed

**Email removed where it was the third copy**

| Event | Before | After |
|---|---|---|
| `new_campaign` | push + SMS + email to all 1 505 Échos | push + SMS |
| `echo_weekly_summary` | email + a hand-rolled push blast | email |
| superadmin "notify Échos" tool | email to all Échos + WhatsApp links | push + SMS + WhatsApp links |

The `new_campaign` change alone removes roughly **1 500 emails per campaign
approval**. The weekly-summary push additionally bypassed `notification_prefs`,
the daily cap and the queue — it initialised `web-push` by hand.

**Email added where it was genuinely missing**

| Event | Before | After |
|---|---|---|
| `campaign_rejected` | **nothing, on any channel** | email with the reason and the refund |
| `earnings_unlocked` (push half) | a `wa.me` link built and thrown away | real push, cap-bypassed |

A brand whose campaign was refused used to find out by refreshing the dashboard
and noticing a status chip. The reason text existed only in the database.

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
