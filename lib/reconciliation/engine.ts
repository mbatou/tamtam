import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueCategory =
  | "balance_mismatch"
  | "wave_sync"
  | "flow_orphan"
  | "campaign_integrity"
  | "payout_integrity"
  | "webhook_unprocessed";

export type SuggestedAction =
  | "refund"
  | "retry"
  | "manual_credit"
  | "refetch_wave"
  | "investigate"
  | "ignore";

export interface Issue {
  severity: IssueSeverity;
  category: IssueCategory;
  subjectType: string;
  subjectId: string;
  description: string;
  expectedValue?: number;
  actualValue?: number;
  discrepancy?: number;
  suggestedAction: SuggestedAction;
  autoHealable: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface ReconciliationSnapshot {
  brandBalanceTotal: number;
  echoBalanceTotal: number;
  platformLiabilitiesTotal: number;
  waveCheckoutsTotal: number;
  waveCheckoutsCount: number;
  wavePayoutsTotal: number;
  wavePayoutsCount: number;
  waveFeesTotal: number;
  waveWalletExpected: number;
  totalDiscrepancy: number;
  issues: Issue[];
  computeDurationMs: number;
}

// ---------------------------------------------------------------------------
// LIVE CHECKS — fast, run on page load
// ---------------------------------------------------------------------------

/** Minimum absolute gap (F) below which the platform identity is considered noise. */
const PLATFORM_BALANCE_TOLERANCE_FCFA = 1000;

/** CHECK 1: Platform balance totals vs Wave math.
 *
 *  INDICATEUR NON FIABLE — informational only, never critical.
 *
 *  The identity `brand balances + echo balances == money in − money out` does
 *  not hold on this data model, for reasons that are modelling gaps and not
 *  missing money:
 *
 *  1. The platform margin. A click debits `campaigns.spent` by the full `cpc`
 *     but credits the echo only `cpc * ECHO_SHARE_PERCENT/100`. The remaining
 *     share is platform revenue: it leaves the brand's balance (as the campaign
 *     budget debit) and never lands in any user balance, so the two sides drift
 *     apart monotonically with GMV.
 *  2. In-flight campaign budgets. A brand is debited the whole budget at
 *     campaign creation; the unspent remainder only returns on completion. Until
 *     then it is held by the platform and is invisible to both sides.
 *  3. `sum_brand_balances()` still sums the legacy `users.balance` column while
 *     `sum_echo_balances()` sums `available_balance + pending_balance`, so the
 *     two halves of "platform liabilities" are different quantities and
 *     historical snapshots are not comparable with each other.
 *  4. `wallet_transactions` cannot close the gap either: echo earnings are
 *     written twice (once at click time, once again when the earning unlocks)
 *     from four different code paths, and `logWalletTransaction` is explicitly
 *     non-blocking — it swallows its own failures. The ledger is an audit trail,
 *     not a double-entry book.
 *
 *  `platformHeldEstimate` below is a best-effort derivation of (1) + (2) from
 *  the ledger, reported so the residual is smaller and the model gap is
 *  visible — it is NOT accurate enough to raise an alert on. Fixing this check
 *  properly means making the ledger authoritative first.
 */
export async function checkPlatformVsWaveBalance(): Promise<Issue[]> {
  const issues: Issue[] = [];

  const { data: brandTotal } = await supabaseAdmin.rpc("sum_brand_balances");
  const { data: echoTotal } = await supabaseAdmin.rpc("sum_echo_balances");

  const brandBalance = brandTotal || 0;
  const echoBalance = echoTotal || 0;
  const platformLiabilities = brandBalance + echoBalance;

  // Wave inflows
  const { data: checkoutsData } = await supabaseAdmin
    .from("wave_checkouts")
    .select("amount")
    .eq("checkout_status", "complete");

  const checkoutsTotal = (checkoutsData || []).reduce(
    (s: number, r: { amount: number }) => s + r.amount,
    0
  );

  // Wave outflows
  const { data: payoutsData } = await supabaseAdmin
    .from("wave_payouts")
    .select("net_amount, fee")
    .eq("payout_status", "completed");

  const payoutsTotal = (payoutsData || []).reduce(
    (s: number, r: { net_amount: number }) => s + r.net_amount,
    0
  );
  const feesTotal = (payoutsData || []).reduce(
    (s: number, r: { fee: number }) => s + (r.fee || 0),
    0
  );

  // Legacy payments completed (pre-Wave manual recharges)
  const { data: legacyPayments } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("status", "completed");
  const legacyIn = (legacyPayments || []).reduce(
    (s: number, r: { amount: number }) => s + r.amount,
    0
  );

  // Legacy payouts sent (pre-Wave manual withdrawals)
  const { data: legacyPayouts } = await supabaseAdmin
    .from("payouts")
    .select("amount")
    .eq("status", "sent");
  const legacyOut = (legacyPayouts || []).reduce(
    (s: number, r: { amount: number }) => s + r.amount,
    0
  );

  // Welcome bonuses and other platform-issued credits
  const { data: bonusTxns } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount")
    .in("type", [
      "welcome_bonus",
      "badge_reward",
      "streak_bonus",
      "referral_bonus",
      "interest_reward",
      "manual_credit",
    ]);
  const bonusCredits = (bonusTxns || []).reduce(
    (s: number, r: { amount: number }) => s + r.amount,
    0
  );

  // Money the platform holds that sits in no user balance: the margin taken on
  // every click, plus campaign budgets debited but not yet spent or refunded.
  const { data: campaignTxns } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount, type")
    .in("type", ["campaign_budget_debit", "campaign_budget_refund"]);

  const campaignsFunded = (campaignTxns || [])
    .filter((r: { type: string }) => r.type === "campaign_budget_debit")
    .reduce((s: number, r: { amount: number }) => s + Math.abs(r.amount), 0);
  const campaignsRefunded = (campaignTxns || [])
    .filter((r: { type: string }) => r.type === "campaign_budget_refund")
    .reduce((s: number, r: { amount: number }) => s + r.amount, 0);

  // Earnings actually credited to an echo balance. The second row written when
  // an earning unlocks (source_type "campaign_unlock") only moves money from
  // pending_balance to available_balance — counting it would double it.
  const { data: earningTxns } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount, source_type")
    .in("type", ["click_earning", "cpa_earning", "lead_earning"]);

  const echoEarningsCredited = (earningTxns || [])
    .filter((r: { source_type: string | null }) => r.source_type !== "campaign_unlock")
    .reduce((s: number, r: { amount: number }) => s + r.amount, 0);

  const platformHeldEstimate = campaignsFunded - campaignsRefunded - echoEarningsCredited;

  const totalMoneyIn = checkoutsTotal + legacyIn + bonusCredits;
  const totalMoneyOut = payoutsTotal + feesTotal + legacyOut;
  const expectedPlatformBalance = totalMoneyIn - totalMoneyOut - platformHeldEstimate;
  const discrepancy = platformLiabilities - expectedPlatformBalance;

  if (Math.abs(discrepancy) >= PLATFORM_BALANCE_TOLERANCE_FCFA) {
    issues.push({
      // Never critical, never a warning: the model is incomplete (see the
      // function doc), so this number cannot mean "money is missing".
      severity: "info",
      category: "balance_mismatch",
      subjectType: "platform",
      subjectId: "global",
      description:
        `Indicateur non fiable — modèle comptable incomplet. Soldes plateforme ` +
        `(${platformLiabilities} F) ≠ attendu (${expectedPlatformBalance} F), écart ` +
        `${discrepancy > 0 ? "+" : ""}${discrepancy} F. La marge plateforme et les budgets ` +
        `de campagne en cours ne sont estimés qu'approximativement, et sum_brand_balances() ` +
        `lit encore la colonne héritée users.balance. Ne pas traiter comme de l'argent manquant.`,
      expectedValue: expectedPlatformBalance,
      actualValue: platformLiabilities,
      discrepancy,
      suggestedAction: "investigate",
      autoHealable: false,
      metadata: {
        unreliable: true,
        brandBalance,
        echoBalance,
        checkoutsTotal,
        payoutsTotal,
        feesTotal,
        legacyIn,
        legacyOut,
        bonusCredits,
        campaignsFunded,
        campaignsRefunded,
        echoEarningsCredited,
        platformHeldEstimate,
      },
    });
  }

  return issues;
}

/** CHECK 2: Checkout flow integrity — completed checkouts with no credit */
export async function checkCheckoutFlowIntegrity(): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Stale checkouts (open > 10 min)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stale } = await supabaseAdmin
    .from("wave_checkouts")
    .select("id, user_id, amount, checkout_status, wave_checkout_id, created_at")
    .in("checkout_status", ["open"])
    .lt("created_at", tenMinAgo);

  for (const row of stale || []) {
    issues.push({
      severity: "warning",
      category: "wave_sync",
      subjectType: "wave_checkout",
      subjectId: row.id,
      description: `Checkout ${row.wave_checkout_id?.slice(0, 16)} is still open after 10+ min`,
      suggestedAction: "refetch_wave",
      autoHealable: true,
      metadata: { wave_checkout_id: row.wave_checkout_id, amount: row.amount },
    });
  }

  // Credited but no wallet_transaction
  const { data: orphans } = await supabaseAdmin.rpc("find_orphan_checkout_credits");
  for (const row of orphans || []) {
    issues.push({
      severity: "critical",
      category: "flow_orphan",
      subjectType: "wave_checkout",
      subjectId: row.checkout_id,
      description: `Checkout completed & credited but no wallet_transaction for user ${row.user_id?.slice(0, 8)}`,
      expectedValue: row.amount,
      actualValue: 0,
      discrepancy: -row.amount,
      suggestedAction: "manual_credit",
      autoHealable: false,
      metadata: row,
    });
  }

  return issues;
}

/** CHECK 3: Payout flow integrity */
export async function checkPayoutFlowIntegrity(): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Stuck payouts (processing > 5 min)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: stuck } = await supabaseAdmin
    .from("wave_payouts")
    .select("id, user_id, wave_payout_id, net_amount, created_at")
    .eq("payout_status", "processing")
    .lt("created_at", fiveMinAgo);

  for (const row of stuck || []) {
    issues.push({
      severity: "warning",
      category: "payout_integrity",
      subjectType: "wave_payout",
      subjectId: row.id,
      description: `Payout ${row.wave_payout_id || row.id} stuck in processing > 5 min`,
      suggestedAction: "refetch_wave",
      autoHealable: true,
      metadata: { wave_payout_id: row.wave_payout_id, amount: row.net_amount },
    });
  }

  // Failed payouts without refund
  const { data: unrefunded } = await supabaseAdmin.rpc("find_failed_payouts_without_refund");
  for (const row of unrefunded || []) {
    issues.push({
      severity: "critical",
      category: "payout_integrity",
      subjectType: "wave_payout",
      subjectId: row.payout_id,
      description: `Payout failed but user ${row.user_id?.slice(0, 8)} not refunded (${row.amount} F)`,
      expectedValue: row.amount,
      actualValue: 0,
      discrepancy: row.amount,
      suggestedAction: "refund",
      autoHealable: false,
      metadata: row,
    });
  }

  return issues;
}

/** CHECK 4: Webhook backlog */
export async function checkWebhookBacklog(): Promise<Issue[]> {
  const issues: Issue[] = [];
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: unprocessed } = await supabaseAdmin
    .from("wave_webhook_events")
    .select("id, event_type, wave_event_id, created_at")
    .eq("processed", false)
    .lt("created_at", fifteenMinAgo);

  for (const row of unprocessed || []) {
    issues.push({
      severity: "warning",
      category: "webhook_unprocessed",
      subjectType: "webhook_event",
      subjectId: row.id,
      description: `Webhook ${row.event_type} (${row.wave_event_id?.slice(0, 16)}) unprocessed > 15 min`,
      suggestedAction: "retry",
      autoHealable: false,
      metadata: row,
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// CACHED CHECKS — run by the daily reconciliation cron (02:00 UTC, vercel.json)
// ---------------------------------------------------------------------------

/** CHECK 5: Legacy-column balance integrity.
 *
 *  INDICATEUR NON FIABLE — informational only.
 *
 *  `find_user_balance_mismatches()` compares `users.balance` against the sum of
 *  that user's `wallet_transactions`. Two limits:
 *
 *  - For échos the comparison is meaningless: their money moved to
 *    `available_balance` / `pending_balance` and `users.balance` is dead, so
 *    every écho with any history mismatches. Those rows are dropped here — the
 *    real écho check is checkEchoPendingDrift (CHECK 7).
 *  - For brands `users.balance` is still the live column, so the comparison is
 *    meaningful, but `logWalletTransaction` is non-blocking and swallows its own
 *    failures, so a gap can be a missing ledger row rather than missing money.
 *    That is worth reading, not worth paging anyone: severity stays "info".
 */
export async function checkUserBalanceIntegrity(): Promise<Issue[]> {
  const issues: Issue[] = [];

  const { data: mismatches } = await supabaseAdmin.rpc("find_user_balance_mismatches");
  for (const row of mismatches || []) {
    if (row.role !== "batteur") continue;

    const diff = row.actual_balance - row.expected_balance;
    if (diff === 0) continue;

    issues.push({
      severity: "info",
      category: "balance_mismatch",
      subjectType: "user",
      subjectId: row.user_id,
      description:
        `Indicateur non fiable (colonne héritée users.balance) — marque ` +
        `${row.user_name || row.user_id.slice(0, 8)} : solde ${row.actual_balance} F ≠ ` +
        `somme du journal ${row.expected_balance} F (${diff > 0 ? "+" : ""}${diff} F). ` +
        `Peut venir d'une écriture de journal manquante, pas forcément d'argent manquant.`,
      expectedValue: row.expected_balance,
      actualValue: row.actual_balance,
      discrepancy: diff,
      suggestedAction: "investigate",
      autoHealable: false,
      metadata: {
        unreliable: true,
        legacyColumn: "users.balance",
        role: row.role,
        user_id: row.user_id,
        txn_count: row.transaction_count,
      },
    });
  }

  return issues;
}

/** CHECK 6: Campaign accounting integrity */
export async function checkCampaignIntegrity(): Promise<Issue[]> {
  const issues: Issue[] = [];

  const { data: mismatches } = await supabaseAdmin.rpc("find_campaign_accounting_mismatches");
  for (const row of mismatches || []) {
    const diff = row.campaign_spent - row.computed_spent;
    if (diff === 0) continue;

    issues.push({
      severity: Math.abs(diff) > 500 ? "warning" : "info",
      category: "campaign_integrity",
      subjectType: "campaign",
      subjectId: row.campaign_id,
      description: `"${row.campaign_name}": spent ${row.campaign_spent}F ≠ computed ${row.computed_spent}F from ${row.clicks_count} clicks`,
      expectedValue: row.computed_spent,
      actualValue: row.campaign_spent,
      discrepancy: diff,
      suggestedAction: "investigate",
      autoHealable: false,
    });
  }

  // Completed campaigns without refund
  const { data: unrefunded } = await supabaseAdmin.rpc("find_completed_campaigns_without_refund");
  for (const row of unrefunded || []) {
    issues.push({
      severity: "warning",
      category: "campaign_integrity",
      subjectType: "campaign",
      subjectId: row.campaign_id,
      description: `"${row.campaign_name}" completed with ${row.remaining}F remaining — no refund`,
      expectedValue: row.remaining,
      actualValue: 0,
      discrepancy: row.remaining,
      suggestedAction: "refund",
      autoHealable: false,
      metadata: row,
    });
  }

  return issues;
}

/** CHECK 7: Echo pending earnings that can never unlock (stuck-earnings drift).
 *  pending_balance not backed by a pending_earnings row — the unlock cron
 *  settles only from pending_earnings, so this money never reaches
 *  available_balance and can never be withdrawn. Remediate with
 *  POST /api/superadmin/reconcile-pending-drift { dry_run: false }. */
export async function checkEchoPendingDrift(): Promise<Issue[]> {
  const issues: Issue[] = [];

  const { data: rows } = await supabaseAdmin.rpc("echo_pending_drift");
  const drifted = ((rows as { echo_id: string; echo_name: string | null; drift: number }[]) || [])
    .filter((r) => r.drift > 0);

  if (drifted.length === 0) return issues;

  const totalStuck = drifted.reduce((s, r) => s + r.drift, 0);

  issues.push({
    severity: totalStuck > 5000 ? "critical" : totalStuck > 500 ? "warning" : "info",
    category: "balance_mismatch",
    subjectType: "echo_pending",
    subjectId: "global",
    description: `${drifted.length} Échos ont ${totalStuck} F de gains bloqués (pending_balance sans pending_earnings — ne se débloqueront jamais). Régulariser via /api/superadmin/reconcile-pending-drift`,
    expectedValue: 0,
    actualValue: totalStuck,
    discrepancy: totalStuck,
    suggestedAction: "manual_credit",
    autoHealable: false,
    metadata: {
      echos: drifted.length,
      top: drifted.slice(0, 20).map((r) => ({ echo_id: r.echo_id, name: r.echo_name, stuck_fcfa: r.drift })),
    },
  });

  return issues;
}

// ---------------------------------------------------------------------------
// ORCHESTRATORS
// ---------------------------------------------------------------------------

/** Fast live checks for page load */
export async function runLiveReconciliation(): Promise<Issue[]> {
  const results = await Promise.all([
    checkPlatformVsWaveBalance(),
    checkCheckoutFlowIntegrity(),
    checkPayoutFlowIntegrity(),
    checkWebhookBacklog(),
    checkEchoPendingDrift(),
  ]);
  return results.flat();
}

/** Full reconciliation — all checks. Used by cron. */
export async function runFullReconciliation(): Promise<ReconciliationSnapshot> {
  const startTime = Date.now();

  const results = await Promise.all([
    checkPlatformVsWaveBalance(),
    checkUserBalanceIntegrity(),
    checkCheckoutFlowIntegrity(),
    checkPayoutFlowIntegrity(),
    checkCampaignIntegrity(),
    checkWebhookBacklog(),
    checkEchoPendingDrift(),
  ]);

  const allIssues = results.flat();

  // Compute snapshot totals
  const { data: brandTotal } = await supabaseAdmin.rpc("sum_brand_balances");
  const { data: echoTotal } = await supabaseAdmin.rpc("sum_echo_balances");

  const { data: checkouts } = await supabaseAdmin
    .from("wave_checkouts")
    .select("amount")
    .eq("checkout_status", "complete");

  const { data: payouts } = await supabaseAdmin
    .from("wave_payouts")
    .select("net_amount, fee")
    .eq("payout_status", "completed");

  const checkoutsTotal = (checkouts || []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);
  const payoutsTotal = (payouts || []).reduce((s: number, r: { net_amount: number }) => s + r.net_amount, 0);
  const feesTotal = (payouts || []).reduce((s: number, r: { fee: number }) => s + (r.fee || 0), 0);

  // Issues flagged `unreliable` are model gaps, not money (see CHECK 1 / CHECK
  // 5) and their "discrepancy" runs into the millions — including them would
  // make this column meaningless. It stays a sum of absolute values of
  // different things, so it is history, never a health signal: the verdict
  // endpoint is what answers "is the money OK?".
  const totalDiscrepancy = allIssues
    .filter((i) => i.metadata?.unreliable !== true)
    .reduce((sum, i) => sum + Math.abs(i.discrepancy || 0), 0);

  const snapshot: ReconciliationSnapshot = {
    brandBalanceTotal: brandTotal || 0,
    echoBalanceTotal: echoTotal || 0,
    platformLiabilitiesTotal: (brandTotal || 0) + (echoTotal || 0),
    waveCheckoutsTotal: checkoutsTotal,
    waveCheckoutsCount: (checkouts || []).length,
    wavePayoutsTotal: payoutsTotal,
    wavePayoutsCount: (payouts || []).length,
    waveFeesTotal: feesTotal,
    waveWalletExpected: checkoutsTotal - payoutsTotal - feesTotal,
    totalDiscrepancy,
    issues: allIssues,
    computeDurationMs: Date.now() - startTime,
  };

  await persistSnapshot(snapshot);
  return snapshot;
}

async function persistSnapshot(snapshot: ReconciliationSnapshot) {
  const critical = snapshot.issues.filter((i) => i.severity === "critical").length;
  const warning = snapshot.issues.filter((i) => i.severity === "warning").length;
  const info = snapshot.issues.filter((i) => i.severity === "info").length;

  const { data: snapshotRow } = await supabaseAdmin
    .from("reconciliation_snapshots")
    .insert({
      brand_balance_total: snapshot.brandBalanceTotal,
      echo_balance_total: snapshot.echoBalanceTotal,
      platform_liabilities_total: snapshot.platformLiabilitiesTotal,
      wave_checkouts_total: snapshot.waveCheckoutsTotal,
      wave_checkouts_count: snapshot.waveCheckoutsCount,
      wave_payouts_total: snapshot.wavePayoutsTotal,
      wave_payouts_count: snapshot.wavePayoutsCount,
      wave_fees_total: snapshot.waveFeesTotal,
      wave_wallet_expected: snapshot.waveWalletExpected,
      total_discrepancy: snapshot.totalDiscrepancy,
      critical_issues_count: critical,
      warning_issues_count: warning,
      info_issues_count: info,
      compute_duration_ms: snapshot.computeDurationMs,
      scan_type: "full",
    })
    .select()
    .single();

  if (snapshotRow && snapshot.issues.length > 0) {
    const issueRows = snapshot.issues.map((i) => ({
      snapshot_id: snapshotRow.id,
      severity: i.severity,
      category: i.category,
      subject_type: i.subjectType,
      subject_id: i.subjectId,
      description: i.description,
      expected_value: i.expectedValue,
      actual_value: i.actualValue,
      discrepancy: i.discrepancy,
      suggested_action: i.suggestedAction,
      auto_healable: i.autoHealable,
      metadata: i.metadata,
    }));

    await supabaseAdmin.from("reconciliation_issues").insert(issueRows);
  }
}
