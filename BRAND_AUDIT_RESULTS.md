# Brand Dashboard Audit Results — LUP-108
Date: 2026-04-04

## Issues Found

### 1. CRITICAL: Antifraud page leaked all platform clicks to every brand
- **File:** `app/admin/antifraud/page.tsx`
- **Issue:** Page queried `clicks` table directly from the client-side Supabase without any brand filtering. Every brand could see ALL platform clicks (all brands, all campaigns).
- **Fix:** Created a new server-side API route `app/api/admin/antifraud/route.ts` that scopes clicks to the brand's campaigns via `getEffectiveBrandId()` -> campaigns -> tracked_links -> clicks. Updated the page to fetch from this API instead of direct client queries.

### 2. Stats API missing `objective` field in campaign SELECT
- **File:** `app/api/admin/stats/route.ts:41`
- **Issue:** Campaign SELECT was `id, title, budget, spent, status, cpc, created_at` — missing `objective`. The campaigns page needs this for objective badge display.
- **Fix:** Added `objective` to the SELECT statement.

### 3. Echo user queries not excluding soft-deleted users
- **Files:**
  - `app/api/admin/echos/route.ts:54`
  - `app/api/admin/campaigns/performance/route.ts:76`
  - `app/api/admin/stats/route.ts:71`
  - `app/api/campaigns/route.ts:33` (notifyCampaignCompleted)
- **Issue:** User queries for echo lookups did not filter `.is("deleted_at", null)`, potentially showing deleted users in brand dashboards.
- **Fix:** Added `.is("deleted_at", null)` to all echo user queries.

## Metrics Verified
- [x] Total Reach: Correct (sum of all clicks through tracked_links per brand campaign)
- [x] Real Visitors: Correct (valid clicks only, `is_valid = true`)
- [x] Budget Spent: Correct (sum of `campaign.spent` for brand campaigns)
- [x] Cost Per Click: Correct (budgetSpent / validClicks, falls back to avg configured CPC)
- [x] Active Campaigns: Correct (COUNT where status = 'active')
- [x] Echos per campaign: Correct (COUNT DISTINCT echo_id from tracked_links)
- [x] Clicks per campaign: Correct (COUNT via tracked_links, uses Postgres COUNT(*))
- [x] Wallet balance: Correct (from users.balance for brandId)

## Charts Verified
- [x] Clicks over time: Correct (uses getClicksChart with per-day bucketing)
- [x] Date range correct: Correct (14 days for dashboard, 30 for analytics/detail)
- [x] Zero-day handling: Correct (bucket map pre-fills all days with 0)
- [x] Performance (<3s): Correct (single paginated query, in-memory grouping)

## Query Patterns Verified
- [x] All campaign queries use `batteur_id` (never `user_id`)
- [x] All brand APIs use `getEffectiveBrandId()` for team management support
- [x] All click counts go through `tracked_links` join
- [x] Click counting uses `{ count: "exact", head: true }` (Postgres COUNT)
- [x] No N+1 query patterns (batch fetches + Promise.all)
- [x] Wallet transactions use `source_id` and `source_type`
- [x] Campaign creation/deletion handles balance correctly with idempotent refunds

## Tests
- Total tests: 78
- Passing: 78
- Failing: 0

## Fixes Applied
1. `fix: antifraud page scoped to brand campaigns, not global clicks (LUP-108)`
2. `fix: add objective field to stats API campaign SELECT (LUP-108)`
3. `fix: exclude soft-deleted users from echo queries (LUP-108)`
4. `test: brand dashboard unit tests — 78 tests for query patterns, metrics, edge cases (LUP-108)`
