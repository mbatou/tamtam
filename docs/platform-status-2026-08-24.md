# Tamtam — Platform status for strategy

**Prepared 24 August 2026 · for the business & marketing team**

## How to read this

This is a **capability and constraint map**, not a performance report. It says
what the platform can do today, what the levers are, where the money goes, and
where growth will jam.

**It deliberately contains no live metrics.** Every number below is a
*configured value* read from the code — a price, a limit, a threshold. The
performance numbers (users, GMV, clicks, campaigns) come from the database, and
[§8](#8-run-these-before-monday) gives you the queries to pull them. Please run
those first: a strategy built on numbers someone half-remembered is worse than
no strategy.

The one count we do have from this week's work is decisive on its own, so start
there.

---

## 1. The headline: supply and demand are wildly out of balance

As of this week's user audit:

| Role | Count |
|---|---|
| Échos | **1 505** |
| Brands (batteurs) | **15** |
| Admin / superadmin | 2 |
| **Total** | **1 522** |

That is roughly **100 échos per brand.**

This is the single most important fact for planning. Tamtam is a two-sided
marketplace, and the two sides are not close to balanced. Every additional écho
increases the number of people waiting for something to share; only an
additional *campaign* creates something to share.

**The practical consequence:** a campaign approval fires a notification to
~1 500 échos. If the campaign has a 50 000 FCFA budget at 100 FCFA CPC, it can
pay for 500 clicks total. Most échos who open that notification will find a
campaign that is already spent, or will earn a few hundred francs before it
closes.

**So: an écho-acquisition push run *before* a brand-acquisition push will
mostly manufacture churn.** New échos arrive, find thin inventory, and leave.
Worse, they leave with an opinion.

**Recommended sequencing for this week:** brand acquisition first, écho
activation (waking the 1 505 you already have) second, écho acquisition third.
Section 5 covers what "activation" can actually mean given the tools that
exist.

---

## 2. Unit economics — every configured number

These are read directly from `lib/constants.ts` and the platform settings
table. They are the levers you can actually pull.

### The split

| | Share |
|---|---|
| Écho | **75%** |
| Platform | **25%** |

The same 75/25 split applies to clicks (CPC), conversions (CPA) and leads
(CPL). There is no tier at which the platform takes more or less.

### Thresholds and fees

| Setting | Value | What it gates |
|---|---|---|
| Minimum payout | **1 000 FCFA** | An écho cannot withdraw below this |
| Referral bonus | **150 FCFA** | Paid to the referrer, per signup |
| CPA minimum | **150 FCFA** | Per conversion |
| CPA attribution window | **7 days** | Click-to-conversion |
| Lead-gen setup fee | **5 000 FCFA** | One-off, per lead-gen campaign |
| Lead-gen minimum budget | **15 000 FCFA** | Floor for that campaign type |

**The 1 000 FCFA payout floor deserves attention.** An écho who has earned
600 FCFA has real money they cannot touch. That is either a retention feature
(a reason to keep going) or a churn trigger (a reason to conclude the platform
does not pay), depending entirely on how far from the threshold they are and
whether anyone tells them. Query 4 in §8 tells you how many people are sitting
in that band right now. **If that number is large, it is probably the
cheapest engagement win available** — those people already worked for the
money.

### Gamification rewards (all currently live)

**Tiers** — a permanent bonus percentage on top of the 75% share:

| Tier | Valid clicks to reach | Bonus | Perks |
|---|---|---|---|
| Écho | 0 | — | Base |
| Argent | 100 | +1% | Badge |
| Or | 500 | +3% | Badge, priority distribution, 24h early access |
| Diamant | 1 000 | +5% | The above, plus featured profile and direct support |

**Streaks** — one-off cash rewards, cycling:

| Milestone | Reward |
|---|---|
| 7 days | 100 FCFA |
| 30 days | 500 FCFA |
| 90 days | 2 000 FCFA |

Both are capped by a per-écho daily ceiling (default 500 FCFA) configurable in
the `gamification_caps` table, so a campaign built around streak-chasing cannot
run away with the budget.

---

## 3. What the platform can sell to a brand today

Three campaign objectives × two pricing models, all live:

| Objective | What the brand gets |
|---|---|
| **Awareness** | Reach and shares. Échos can copy the link directly (added this week). |
| **Traffic** | Clicks to a destination URL |
| **Lead generation** | A hosted landing page with a form; verified leads delivered by email |

| Pricing | How it bills |
|---|---|
| **CPC** | Per valid click, fraud-filtered |
| **CPA** | Per conversion, via the tracking pixel, 7-day window |

Supporting capability worth selling:

- **Conversion pixel + event mapper** — a brand installs a snippet and maps
  their own events (purchase, signup, add-to-cart) without a developer. This is
  a genuine differentiator against boosting a post on Meta, where a small
  Senegalese merchant gets no conversion attribution at all.
- **Geo targeting** — campaigns can target specific Senegalese cities, and
  écho notifications are filtered to match. A Thiès merchant is not paying to
  reach Ziguinchor.
- **Interest targeting** — échos declare interests at onboarding
  (`echo_interests`). The data is being collected.
- **Anti-fraud filtering** — brands pay only for clicks that survive IP,
  velocity and cooldown checks. Worth saying out loud in a pitch; it is the
  main objection to influencer-style spend.
- **Performance report by email** — new this week. Every completed campaign now
  sends the brand a full report: valid vs rejected clicks, conversions, échos
  mobilised, cost per unit, spend vs refund. Previously they had to remember to
  visit a dashboard, which meant most brands never saw their own results.

---

## 4. What was fixed this week that changes the pitch

These are live or landing this week and each removes a specific objection.

**Brands now get told things.** Before this week, a brand whose campaign was
**rejected** was told nothing on any channel — they discovered it by noticing a
status chip, and the reason existed only in the database. A brand whose
campaign **completed** got no report. A brand who **recharged** got no receipt.
All three now send. That materially changes what "using Tamtam" feels like for
a paying customer, and it is worth a re-engagement email to lapsed brands on
that basis alone.

**Unspent budget comes back automatically, and now says so.** The completion
report states the refunded amount explicitly. "You only pay for what you use,
and we tell you what came back" is now a true and demonstrable claim.

**A budget-exhaustion warning fires at 80%,** by email and SMS, within seconds
of the click that crosses it. A brand can top up before delivery stops instead
of discovering a dead campaign the next day. This directly protects revenue —
a campaign that runs dry silently is a campaign that does not get renewed.

**Échos get told when their money unlocks.** That notification had never fired
in production due to a bug — the 41 échos whose stuck earnings we released
earlier this month were never actually told. It fires now, by email, and by
push if push is live (§5).

**Payout failures are now visible.** A bounced Wave transfer used to be
indistinguishable from a slow one — the écho was told nothing and assumed the
platform had kept the money. They now get an SMS and an email leading with
"your money is not lost", plus ops gets an alert with the Wave error.

**Everyone can unsubscribe from email.** SMS has carried `STOP 36180` since
launch; email had nothing. Now every non-transactional email carries a
one-click unsubscribe. Marketing should treat this as a constraint *and* a
signal — see §7.

---

## 5. Levers available for écho engagement

Everything here already exists in the product. No engineering required to use
it, though some of it needs a decision.

### Channels

| Channel | Cost | Best used for | Live? |
|---|---|---|---|
| **SMS** | Per message | Money and closing windows | Yes |
| **Email** | Free | Records, detail, anything to find again | Yes |
| **Push** | Free | Engagement, nudges, time-sensitive prompts | **Verify — see below** |

Échos are notified of a new campaign on **all three**. Everything else is
split: share reminders, inactivity nudges, streak warnings and campaign-ending
alerts are **push only**; money events use SMS and email.

> ### ⚠️ Push may not be live in production — check this first
>
> The `push_subscriptions` table does **not** appear in the type definitions
> generated from the production database, while every other notification table
> does. That is strong evidence the table was never created in production.
>
> If so, **every push notification the platform believes it is sending is
> silently going nowhere.** The code reads the subscriptions table, gets
> nothing back, and records the notification as "suppressed — no push
> subscription". No error, no alert. It would look exactly like low PWA
> adoption.
>
> **This is not confirmed — run query 5 in §8 to settle it.** It takes ten
> seconds and it changes the plan, because the entire écho-engagement story
> above assumes a free channel that may not exist.
>
> **If push is not live, écho engagement this week has to run on SMS (costs
> money per message, so it needs the MTarget rate before anything is costed)
> or email (free and now measurable, but with no open-rate history yet).**
> Separately, mobile-app push (Expo/FCM) is definitely not live — that work is
> on an unmerged branch and still needs Firebase credentials and an app
> rebuild.

### Segments the platform can already target

The SMS batch tool ships with these segments built in:

| Segment | Definition |
|---|---|
| `active` | Has at least one valid click |
| `dormant` | More than 10 valid clicks, but has gone quiet |
| `joined_no_clicks` | Joined a campaign, never generated a click |

`joined_no_clicks` is the most interesting group for this week: these people
signed up, took the step of joining a campaign, and then something stopped
them. That is a fixable problem, and it is the difference between an activation
campaign and an acquisition campaign.

Plus city filtering across all Senegalese cities (`lib/cities.ts`).

### Referral (currently a toggle, worth a decision)

Échos have a personal referral code and a WhatsApp share button in their
profile. A successful referral pays the referrer **150 FCFA**, credited to
their withdrawable balance.

**The whole programme is behind a platform setting** —
`referral_program_enabled` in `platform_settings`. Check whether it is
currently on. At 150 FCFA per acquired écho this is dramatically cheaper than
any paid channel, but per §1, écho acquisition is not this week's bottleneck.
Consider holding it until brand supply improves, then turning it on
deliberately as a campaign rather than leaving it quietly running.

### Ambassador programme

A separate mechanism from écho referral: ambassadors have their own codes and
earn a **configurable percentage of the campaign budget** they bring in (set
per ambassador in the `ambassadors` table). This is a *brand*-acquisition
tool, and given §1 it may be the most directly useful growth lever you have
right now. Query 6 tells you how many ambassadors exist and what they have
produced.

### Leaderboard

Live at `/leaderboard`. Public ranking of échos. Underused as a marketing
asset — the top échos are proof the model pays, and their numbers are already
computed.

---

## 6. Constraints marketing needs to know about

**Anti-fraud limits cap what any one écho can earn.** These are not
negotiable without a fraud review, and they bound the "how much can I make?"
claim:

| Limit | Value |
|---|---|
| Valid clicks per IP per day | **8** |
| Clicks per link per hour | 30 |
| IP cooldown | 24 hours |
| Minimum time on page | 3 seconds |

The 8-per-IP-per-day limit matters most in a market with shared connections and
carrier NAT. The platform does maintain a `carrier_ip_ranges` table, which
suggests mobile-carrier IPs are handled separately — **confirm with engineering
before quoting any earnings figure in a campaign**, because if carrier NAT is
not fully excluded, échos sharing to friends on the same network will see
clicks rejected and conclude the platform is cheating them.

**Campaign approval is currently switched OFF.** `require_campaign_approval`
is set to `false` in `platform_settings`. Campaigns go live without a human
check. That is a speed advantage for onboarding new brands and a brand-safety
risk if volume grows. Worth an explicit decision rather than leaving it as a
setting someone flipped.

**Three scheduled emails are still running and were not part of the approved
notification set:** écho weekly summary, brand weekly summary, and a brand
nudge for brands who never launched. They are all suppressible and now
measured. Decide whether you want them, rather than discovering them in a
deliverability report.

---

## 7. Two measurement wins you now have

**Email is fully tracked for the first time.** Every send, suppression and
failure now lands in a single ledger with the provider message ID. Roughly 95%
of platform email was previously undiagnosable after the fact. From next week
you can answer "is this email worth sending?" with data:

```sql
select * from email_event_stats order by total desc;
```

A high `suppressed` count means people are actively turning that email off. A
high `failed` count means nobody is receiving it.

**Unsubscribes are now a product signal.** The highest-volume email on the
platform is the new-campaign announcement — roughly 1 500 per approval. If
échos start unsubscribing from the campaign category in numbers, that is the
market telling you the notification-to-opportunity ratio is wrong, which loops
straight back to §1. Watch it.

---

## 8. Run these before Monday

Everything above is structural. These fill in the actual state. Run them in the
Supabase SQL editor.

**1. The whole dashboard in one row** — there is a pre-built view:

```sql
select * from superadmin_metrics;
```

Returns: total échos, total brands, new échos this week, new brands this month,
active campaigns, total campaigns, clicks today/this week, total valid clicks,
GMV total and this month, platform revenue total and this month, pending
payouts, and total écho balances (available and pending).

**2. Campaign inventory — is there anything to share right now?**

```sql
select status, count(*), sum(budget) as budget, sum(spent) as spent,
       sum(budget - spent) as remaining
from campaigns where deleted_at is null group by status;
```

If `active` remaining budget is small, écho acquisition should wait.

**3. Brand concentration — how much of GMV is one customer?**

```sql
select u.name, count(c.id) as campaigns, sum(c.budget) as total_budget,
       sum(c.spent) as total_spent, max(c.created_at) as last_campaign
from campaigns c join users u on u.id = c.batteur_id
where c.deleted_at is null
group by u.name order by total_budget desc;
```

With 15 brands, concentration risk is real. This also surfaces lapsed brands —
anyone whose `last_campaign` is old is a warm re-engagement target, and they
now have a reason to come back (§4).

**4. Échos stuck below the payout floor** — the cheapest engagement win:

```sql
select
  count(*) filter (where available_balance between 1 and 499)    as under_500,
  count(*) filter (where available_balance between 500 and 999)  as close_to_payout,
  count(*) filter (where available_balance >= 1000)              as can_withdraw,
  sum(available_balance) filter (where available_balance < 1000) as trapped_fcfa
from users where role = 'echo' and deleted_at is null;
```

The `close_to_payout` group has earned real money and is one campaign away from
being paid. Telling them exactly that is a strong, honest message.

**5. Reachability by channel — run this one first.** It settles the push
question from §5:

```sql
-- Does the push table even exist? Returns 1 row if yes, 0 rows if no.
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'push_subscriptions';
```

If that returns **no rows, push is not live** and every push notification is
going nowhere. Tell engineering before building any plan on it.

If it returns a row, then:

```sql
select
  (select count(*) from users where role='echo' and deleted_at is null) as echos,
  (select count(distinct user_id) from push_subscriptions)              as push_reachable,
  (select count(*) from users
     where role='echo' and deleted_at is null
       and phone is not null and coalesce(sms_optout,false) = false)    as sms_reachable;
```

`push_reachable` at or near zero means the same thing in practice: no free
engagement channel.

**6. Activation funnel** — where échos actually stop:

```sql
select
  count(*)                                                   as total_echos,
  count(*) filter (where total_campaigns_joined > 0)          as joined_a_campaign,
  count(*) filter (where total_valid_clicks > 0)              as earned_something,
  count(*) filter (where total_valid_clicks >= 100)           as tier_argent_plus
from users where role = 'echo' and deleted_at is null;
```

The gap between `joined_a_campaign` and `earned_something` is the
`joined_no_clicks` segment from §5 — the people worth talking to first.

**7. Ambassador programme state:**

```sql
select a.name, a.referral_code, a.status, a.commission_rate,
       a.total_referrals, a.total_earned, a.total_paid,
       count(ar.id) filter (where ar.first_campaign_at is not null) as referrals_who_launched
from ambassadors a
left join ambassador_referrals ar on ar.ambassador_id = a.id
group by a.name, a.referral_code, a.status, a.commission_rate,
         a.total_referrals, a.total_earned, a.total_paid
order by a.total_earned desc nulls last;
```

`referrals_who_launched` vs `total_referrals` is the real measure: an
ambassador who signs brands up but never gets them to launch a campaign has
produced nothing billable.

**8. Is the referral programme even on?**

```sql
select key, value, updated_at from platform_settings
where key in ('referral_program_enabled', 'require_campaign_approval', 'min_payout_fcfa');
```

---

## 9. Recommended shape for the week

Offered as a starting position to argue with, not a plan.

**Priority 1 — Brand acquisition.** It is the binding constraint. Everything
else compounds off it. The new completion reports, receipts and budget alerts
make the product materially more credible to a paying customer than it was
last week, and the pixel/conversion mapper is a real differentiator against
boosting a post. The ambassador programme is a ready-made channel for this and
appears underused.

**Priority 2 — Reactivate lapsed brands.** Query 3 gives you the list. They
have used the product, they have a wallet, and the specific thing that made it
feel unresponsive — no reports, no receipts, no warnings — was fixed this week.
That is a genuine reason to make contact rather than a manufactured one.

**Priority 3 — Écho activation, not acquisition.** Two named segments,
both reachable by SMS and email today (and by push only if query 5 says so):
- `joined_no_clicks` — took the first step, then stopped
- `close_to_payout` (query 4) — has earned money they cannot yet withdraw

Both have an honest, specific message. Neither requires new inventory in the
way that recruiting new échos does.

**Hold — Écho acquisition at volume.** Until query 2 shows meaningful active
campaign budget, recruiting more échos adds people to a queue rather than
customers to a marketplace. Referral is cheap (150 FCFA) and can be switched on
the moment inventory justifies it.

---

## What this document does not tell you

- **Any performance number.** Users, GMV, clicks, retention, campaign counts:
  all in §8, none in the prose. Run the queries.
- **SMS cost per message.** Not visible from the code. Needed before any
  SMS-led campaign can be costed — get it from the MTarget invoice. This became
  more urgent given the push question: if push is not live, SMS is the only
  channel that reliably reaches an écho's phone.
- **Whether échos read email.** Newly measurable as of this week, but there is
  no history yet. Give it a week of sends, then check
  `email_event_stats`.
- **Conversion rates through the funnel.** Query 6 gives you the counts to
  compute activation, but there is no cohort or time dimension in it. If
  cohort retention matters to the plan, that needs building — worth asking for
  explicitly rather than approximating.
