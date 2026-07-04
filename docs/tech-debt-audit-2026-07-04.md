# Tamtam Platform — Technical Debt & Structural Audit

**Date:** 2026-07-04
**Scope:** Web app (app/, components/, lib/, types/, middleware), database & migrations, tests, build/config/repo hygiene, `tamtam-app` (Expo mobile), `tamtam-pixel-extension` (Chrome MV3).
**Method:** 4 parallel deep code sweeps + compiler/linter/test runs + verification of every finding from the 2026-06-24 `AUDIT_REPORT.md`.

**Baseline measurements (this branch):**

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean (strict mode on) |
| `next lint` | ⚠️ 29 warnings (13 hook-deps, 16 `<img>`) — no errors |
| `vitest run` | ❌ **2 of 285 tests failing** (`brand-api-patterns.test.ts`: `app/api/admin/stats/route.ts` missing `deleted_at` filter) |
| Codebase size | 384 TS/TSX files, ~67k LOC web + 2.6k LOC mobile; 150 API routes |
| CI | **None** — no `.github/workflows`, no pre-commit, no prettier, no `typecheck` script |

---

## 1. Status of the June 2026 audit (what got fixed, what didn't)

| June finding | Status today | Evidence |
|---|---|---|
| C-1 `lead-conversion-flag` cron unauthenticated | ✅ **Fixed** | `app/api/cron/lead-conversion-flag/route.ts:17-31` — timing-safe CRON_SECRET check |
| C-2 `refund_wallet_from_payout` conflicting RPC signatures | ✅ **Fixed (with caveat)** | `supabase/migrations/fix_refund_rpc.sql` drops all 3 legacy overloads, recreates 2 deliberate ones. Caveat: the 3-param overload trusts a caller-supplied amount while the 1-param one reads `wave_payouts.amount` — asymmetric semantics under one name. Also, the file is a "run in SQL editor" script, so prod state is unverifiable from the repo. |
| C-3 Hardcoded test user | ⚠️ **Moved, not removed** | Gone from superadmin/campaigns; now `ALLOWED_TEST_USER = "846d55ca-…"` at `app/api/sms/test/route.ts:7` |
| C-4 Resend webhook unauthenticated | ✅ **Fixed (fail-open caveat)** | svix verification at `app/api/webhooks/resend/route.ts:12-31`, but skipped with a warning if `RESEND_WEBHOOK_SECRET` is unset (`:32-34`) |
| C-5 PayTech IPN weak verification | ⚠️ **Partially fixed — still weak** | `app/api/payments/ipn/route.ts:28-61`: HMAC branch added, but (a) compared with `!==` not `timingSafeEqual`; (b) fallback branch accepts static `sha256(api_key)+sha256(api_secret)` — replayable, not bound to the message; (c) **no idempotency** — a replayed `sale_complete` re-runs `increment_balance` and double-credits the wallet |
| H-1 Team invite `pending` vs UI `invited` | ⚠️ **Band-aided, not resolved** | Write side still `status: "pending"` (`app/api/admin/team/invite/route.ts:76`); read side defensively queries `.in("status", ["invited","pending"])` (`app/api/brand/invitations/route.ts:28`). Two vocabularies coexist. |
| H-6 Wave webhook idempotency | ⚠️ **Present but racy** | `app/api/webhooks/wave/route.ts:37-55` is check-then-insert, not a unique-constraint upsert; concurrent duplicate deliveries can both pass. Handler-level idempotency keys partially mitigate. |
| H-7 7 of 12 crons unscheduled | ✅ **Fixed** | All 13 cron routes have matching `vercel.json` schedules (and vice versa) |
| H-8 Types out of sync with schema | ⚠️ **Still drifted** | `Conversion.payment_status` missing from `lib/types.ts:277-295` though defined in DB (`cpa_payment_rpcs.sql:57-58`) and used in 8 files; `Click.rejection_reason` and `TrackedLink.tm_ref` still missing. (`conversion_type`/`conversion_value` turned out to be renamed to `value_amount`/`value_currency`, which are present — moot.) |
| M-1 In-memory rate limiting | ❌ **Unchanged** | `lib/rate-limit.ts` still a module-level `Map`; guards register, payments, payouts, leads, pixel API — exactly where per-instance limits are weakest |
| M-3 107 console statements | ❌ **Unchanged** (107 today) | 76 in `app/api` alone, heaviest on payment/webhook paths |
| M-10 Hardcoded "Écho Fondateur" | ❌ **Unchanged** | `app/(echo)/dashboard/page.tsx:176`, `app/(echo)/profil/page.tsx:308` (while `:435-436` in the same file uses `t()` correctly) |

**Net:** the critical security holes from June were mostly closed. What remains is almost entirely **debt**: duplication, drift, missing structure, and near-zero real test coverage.

---

## 2. New high-severity findings (not in the June audit)

### P0 — correctness / security-adjacent

1. **116 of 150 API routes authenticate with `supabase.auth.getSession()` instead of `getUser()`.** `getSession()` reads the cookie without revalidating the JWT server-side; Supabase's own guidance is to use `getUser()` in server code. Only middleware (`middleware.ts:55-57`) and 2 routes do it right. One shared `requireAuth()` helper would fix all 116 at once (see §4).

2. **`/api/admin/*` is NOT covered by middleware.** The matcher (`middleware.ts:211-224`) protects `/api/superadmin/:path*` only. All 13 admin routes currently self-check, but this is defense-by-convention — one forgotten check in a future route is an open admin endpoint.

3. **`app/api/stats/route.ts` has zero auth** and uses the service-role client to return platform-wide business metrics (user counts, total FCFA paid out) to any anonymous caller. If intentional (public counters), it should be explicit and minimal.

4. **The Chrome pixel extension's event tracking is entirely dead.** `content/content.js:235` POSTs to `https://tamma.me/api/pixel/event` — **that route does not exist**. The real endpoint is `/api/v1/conversions`, which requires a secret `tmk_…` key (extension sends the public `px_…` id) and a `pixel_id` in the body (extension omits it). Every mapped event 404s. Only the connectivity check (`/api/v1/pixel-check`) matches the API, so the extension *looks* healthy while tracking nothing.

5. **SMS webhooks are unauthenticated.** `app/api/sms/mo/route.ts` processes STOP/unsubscribe by phone number and `sms/dlr` records delivery status with no verification the request came from MTarget.

6. **Failing tests on the branch:** `app/api/admin/stats/route.ts` queries users without a `deleted_at` filter — soft-deleted users leak into admin stats (this is exactly what the 2 failing tests assert).

7. **Wallet mutation logic is scattered and inconsistent.** Direct `increment_balance` RPC + `logWalletTransaction` calls are re-implemented (with *different* idempotency approaches) in `superadmin/campaigns`, `payments/ipn`, `webhooks/wave`, `v1/conversions`, `echo/payouts`. Budget debits in `superadmin/campaigns/route.ts:145-148, 315-318` are read-modify-write (race-prone), while credits in the same file use atomic RPCs.

8. **Core database schema is not version-controlled.** `supabase/migrations/` contains 6 ad-hoc files; the only `CREATE TABLE`s are two SMS tables. `users`, `campaigns`, `conversions`, `clicks`, `wave_payouts`, `wallet_transactions`, etc. exist only in the Supabase dashboard. No reproducible schema, no drift detection, no safe rollback. This is the root cause of the type-drift issues (H-8).

### P1 — reliability / operability

9. **`lib/supabase/admin.ts` falls back to `"https://placeholder.supabase.co"` / `"placeholder-key"`** when env vars are missing — silent misconfiguration instead of a crash (`server.ts` would throw). `payments/ipn/route.ts:8-11` has the same placeholder fallback inline.

10. **Fail-open webhook verification** — both Resend (svix) and Wave skip signature checks with only a console warning if their secret env var is unset. A deploy with a missing env var silently accepts forged webhooks.

11. **84 empty/swallowed catch blocks across 43 API files** (plus 16 `.catch(() => {})` in pages) — including on financial side effects (admin-log, ambassador-commission, notification failures in `superadmin/campaigns/route.ts:191, 265, 580, 619`).

12. **Sentry config inconsistent:** client uses `NEXT_PUBLIC_VERCEL_ENV`, server/edge use `VERCEL_ENV`; only server strips PII in `beforeSend`; all three sample traces at 100% (cost/volume risk); project is still the default `lupandu/javascript-nextjs`.

13. **No CI whatsoever.** Nothing runs lint/typecheck/tests on push. Combined with 2 already-failing tests, the suite is decorative.

---

## 3. Structural debt (the "cleanup the platform" list)

### 3.1 API layer: massive copy-paste, no shared kernel

- The ~15-line auth block (`getSession` → 401 → role lookup → 403) is duplicated across **~116 files**; the literal string `"Non autorisé"` appears 78 times in 48 files; the role-lookup query is verbatim in 64 files.
- `verifyCronSecret` is **copy-pasted 13 times** in 3 signature variants across the cron routes (~100 duplicated lines).
- **Three ways to get a service-role client:** `createServiceClient()` (136 files), `supabaseAdmin` singleton (13 files), inline `createClient(...)` (IPN route + 9 lib files). Plus browser client and SSR client — 5 construction patterns total.
- **Validation:** only ~13 routes use zod; ~53 routes destructure `request.json()` with ad-hoc `if (!field)` checks. Unvalidated:validated ≈ 5:1.
- **Error shapes are inconsistent:** `{error: string}` vs `{error: err.message}` (leaks internals — `superadmin/campaigns/route.ts:149,181,321,499`) vs French/English mix vs plain-text webhook responses.
- **Business logic lives in route handlers:** `superadmin/campaigns/route.ts` (624 lines) contains budget debit/refund, a ~55-line ambassador-commission engine **duplicated twice within the file** (`:211-265` and `:513-581`), email/SMS/push fan-out, and admin logging. 8 route files exceed 300 lines.
- Rate limiting applied to only 9 of 150 routes.

### 3.2 Frontend: two coding cultures

Marketing/auth/landing/datalab pages are componentized and Tailwind-consistent. The admin + superadmin CRUD screens are monoliths:

- **25 pages over 500 lines.** Worst: `app/admin/campaigns/page.tsx` — **2,173 lines, one component, 39 `useState`, 14 `fetch()` calls, zero extracted sub-components**, multiplexing 4 screens through a `view` state machine. Then `developers/page.tsx` (1,366 — 14 inline static sections, plus an inner `function RootLayout` name-colliding with the real root layout), `(landing)/page.tsx` (1,284 — reimplements Navbar/Footer/FAQ that already exist in its own `_components/`), `superadmin/campaigns` (1,260), `superadmin/users` (1,077).
- **Shared UI components exist but have zero importers:** `components/ui/Badge.tsx`, `Card.tsx`, `TabBar.tsx`, `components/superadmin/AdminTable.tsx`, `components/Footer.tsx`, `components/layout/LanguageSwitcher.tsx`. Meanwhile raw `<table>` is hand-rolled in 23 admin/superadmin pages and modals are inline overlay divs everywhere (only 1 file uses `components/ui/Modal.tsx`).
- **Duplicate component pairs:** two AdminSidebars (`components/AdminSidebar.tsx` vs `components/superadmin/AdminSidebar.tsx`), two LanguageSwitchers, two stat-card systems (`StatCard` vs `AdminStatCard`).
- **100% client-side data fetching:** 60 of 67 pages are `"use client"`; zero RSC data fetching; no SWR/react-query; every page hand-rolls `useState` + `useEffect` + `fetch` (51 pages). No shared fetch hook.
- **1,322 inline `style={{…}}` occurrences** (207 in admin/campaigns alone) in a Tailwind project — admin screens hardcode hex colors inline while the design tokens live in `tailwind.config.ts`.
- **Two i18n systems:** hand-rolled `lib/i18n.tsx` (client-only, localStorage locale, silent fallback-to-key on miss) plus a parallel `lib/echo-i18n.ts` for push strings. `fr.json` is 8KB larger than `en.json` — likely missing English keys that silently render as raw key paths.
- **Route organization inconsistent:** echo lives in a route group `(echo)`, but admin/superadmin/ambassador are plain directories; admin components split between `components/admin/` and loose root files. `app/superadmin/datalab/` is the only properly decomposed page area — it's the model the rest should follow.

### 3.3 lib/: god-modules, collisions, duplication

- 44 of 60 lib files sit loose at `lib/` root. Naming collisions: `lib/notifications.ts` (browser permission helpers) vs `lib/notifications/` (server engine); `lib/ai-analyst.ts` vs `lib/ai/`; domain types split across `lib/types.ts`, `lib/brand-types.ts`, `types/awa.ts`.
- **Two parallel lead-notification implementations** (`sendLeadNotification` in `lib/email.ts:62` used by `/api/leads`, vs `notifyNewLead` in `lib/notifications/lead-notification.ts` used by `/api/leads/submit`), two email-sender wrappers, `MAX_DAILY_PUSHES` defined twice.
- 8 full HTML email templates embedded as string functions in `lib/email.ts` (414 lines); more inline HTML in two other files; no shared layout.
- Functional stub in the self-healing path: `lib/reconciliation/auto-heal.ts:213` returns "Auto-heal not implemented for this action".
- Prod campaign/conversion UUIDs left in a commented-out one-time UPDATE in `cpa_payment_rpcs.sql:63-73`.

### 3.4 Tests: 5 files, ~2 real modules covered

- 2 of 5 test files **regex-scan source text** instead of executing code; 2 more **reimplement** the math they claim to test (the real `lib/lead-fraud-scorer.ts` is never imported). Only `ai-safety-and-validation.test.ts` imports real modules (`lib/validations`, `lib/constants`).
- **Zero behavioral coverage** on every money path: payments, payouts, wallet/dual-balance, Wave webhook, PayTech IPN, reconciliation, auth middleware, notification engine, fraud scorer.

### 3.5 Subprojects

- **Mobile (`tamtam-app`, Expo):** clean structure, but everything shared with web is copy-pasted and already drifting — colors (`orangeLight: '#F39C12'` vs web `#FEF0E7`), the hand-copied `users` row shape in `hooks/useAuth.ts:5-16`, a separate 225-line translation store, hardcoded `https://tamma.me` in 2 screens. Aggressive version pins (TS 6.0 + RN 0.85 + React 19.2). No lint/typecheck/test scripts.
- **Pixel extension:** dead event path (P0 #4 above); `<all_urls>` host permissions + content script (wide surface); no build, no types, no tests; French strings with stripped accents.

### 3.6 Repo hygiene

- `README.md` is unmodified create-next-app boilerplate.
- Internal audit artifacts with security findings committed at root (`AUDIT_REPORT.md`, `BRAND_AUDIT_RESULTS.md`).
- `.gitignore` covers `.env*.local` but **not plain `.env`/`.env.production`** — a foot-gun.
- `.env.example` vs `.env.local.example` disagree (Resend keys only in one); neither documents the required `VAPID_*` keys.
- `public/brand/tamtam-favicon.png` is **536KB** (a favicon should be <10KB); mobile `icon.png` 388KB.
- Orphan/dead pages: `app/sentry-example-page`, `app/tech`, redirect stubs (`/cgu`, `/confidentialite`, `superadmin/pipeline`, `superadmin/leads`) kept alive only because `(landing)/page.tsx:1224-1225` still links the old legal URLs.
- Live in prod: `app/api/sentry-test` (no auth, throws on every GET), `app/api/debug-auth` (404-gated but shipped), `app/api/sms/test` (hardcoded single-user gate).

---

## 4. Recommended cleanup plan

### Phase 0 — Stop the bleeding (days, no refactor risk)

1. Fix the 2 failing tests: add `deleted_at` filter to `app/api/admin/stats/route.ts`.
2. Add CI (GitHub Actions): `tsc --noEmit` + `next lint` + `vitest run` on every PR; add a `typecheck` script; add prettier + lint-staged.
3. PayTech IPN: timing-safe compare, remove the static-SHA256 fallback (or bind it per-message), add idempotency on `ref_command` before `increment_balance`.
4. Make webhook verification fail-closed (Resend, Wave) — throw at boot if the secret is missing in production.
5. Remove placeholder-credential fallbacks (`lib/supabase/admin.ts`, IPN inline client) — crash loudly instead.
6. Authenticate SMS webhooks (shared secret in URL or provider signature).
7. Decide `/api/stats`: either make it an explicit minimal public endpoint or add auth.
8. Extend the middleware matcher to `/api/admin/:path*` as a backstop.
9. `.gitignore`: add `.env` and `.env.*`; unify the two env example files and document `VAPID_*`.
10. Delete: `app/sentry-example-page`, `app/api/sentry-test`, `app/tech`, `app/api/debug-auth`, `app/api/sms/test` (or gate behind superadmin role instead of a hardcoded UUID). Update `(landing)/page.tsx:1224-1225` to `/terms` + `/privacy`, then delete the `cgu`/`confidentialite` stubs.
11. Compress the 536KB favicon and 388KB mobile icon.
12. Fix the two hardcoded "Écho Fondateur" strings (keys already exist).

### Phase 1 — API kernel (1–2 weeks, highest leverage)

Create `lib/api/` with four helpers and migrate routes incrementally:

- `requireAuth(roles?)` — uses `getUser()` (fixes the 116-route `getSession` issue in one place), does the role lookup, returns typed user or throws a 401/403 response. Kills ~1,700 duplicated lines.
- `verifyCronSecret(request)` — one implementation replacing 13 copies.
- `apiError(status, code)` / standardized JSON error envelope (one language).
- `withValidation(schema, handler)` — zod-parse bodies; migrate the ~53 unvalidated routes over time, money routes first.

Consolidate on **one** service-role factory (`createServiceClient`), delete `lib/supabase/admin.ts`, and move the 9 inline client constructions in lib/ onto it.

### Phase 2 — Money-path hardening (1–2 weeks)

- Extract a single wallet/ledger service in `lib/wallet/` (credit, debit, refund — all atomic RPCs, one idempotency scheme). Migrate the 5 call sites off scattered `increment_balance` calls; replace the read-modify-write budget debits.
- Make Wave webhook dedup atomic (unique constraint + upsert).
- Extract the ambassador-commission engine from `superadmin/campaigns/route.ts` into `lib/` (dedupe the two in-file copies).
- Write **behavioral** tests for: wallet service, refund RPC paths, Wave webhook idempotency, IPN verification, `lib/lead-fraud-scorer.ts` (import the real module), payout safety. Replace the regex-audit tests as the code they police gets centralized.
- Adopt `supabase db pull` / declarative schema so all tables live in versioned migrations; then generate DB types (`supabase gen types`) and delete the drifted hand-written row types (fixes `payment_status`/`rejection_reason`/`tm_ref` permanently).
- Replace the in-memory rate limiter with Upstash Redis (or Vercel KV) — at minimum on register/payments/payouts/pixel routes.

### Phase 3 — Frontend consolidation (ongoing, screen by screen)

- Establish the shared kit first: make `AdminTable`, `Modal`, `Badge`, `StatCard`, and a `useApi()` fetch hook real (they mostly exist — they need adoption), then chip away at the monoliths starting with `app/admin/campaigns/page.tsx` (split the 4 views + modals, following the `superadmin/datalab/` pattern).
- Delete the dead duplicates: `components/layout/LanguageSwitcher.tsx`, `components/Footer.tsx`, one of the two sidebars/stat-card systems.
- Fix the 13 hook-deps warnings and stop swallowing fetch errors (surface an error state).
- Longer term: pick one i18n system (fold `echo-i18n.ts` into the JSON catalogs; add a key-parity check for en/fr in CI), and consider RSC/SWR for new pages rather than a big-bang migration.

### Phase 4 — Subprojects

- **Pixel extension:** point events at `/api/v1/conversions` with the correct auth model and body (or build the missing `/api/pixel/event` ingestion route if `px_` id + browser-origin events is the intended design — the current auth model can't work from a content script, so this needs a product decision). Add the extension to CI at least for a syntax/lint pass.
- **Mobile:** extract a tiny shared package (or codegen step) for colors + DB row types + the `https://tamma.me` base URL; add typecheck/lint scripts.

### Quick reference — effort vs impact

| Item | Impact | Effort |
|---|---|---|
| CI + typecheck script | High | Hours |
| `requireAuth()` + `getUser()` migration | High | Days |
| IPN idempotency + timing-safe compare | High | Hours |
| Wallet/ledger service extraction | High | Week |
| Schema into migrations + generated types | High | Days |
| Fail-closed webhooks, no placeholder creds | High | Hours |
| `verifyCronSecret` dedupe | Medium | Hours |
| Delete dead pages/components/routes | Medium | Hours |
| Split `admin/campaigns/page.tsx` | Medium | Days |
| Shared UI kit adoption | Medium | Ongoing |
| Distributed rate limiter | Medium | Day |
| Extension event path fix | Medium (product-dependent) | Days |
| Mobile shared tokens/types | Low-Med | Days |
