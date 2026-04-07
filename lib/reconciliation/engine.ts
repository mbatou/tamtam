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

/** CHECK 1: Platform balance totals vs Wave math */
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

  const totalMoneyIn = checkoutsTotal + legacyIn + bonusCredits;
  const totalMoneyOut = payoutsTotal + feesTotal + legacyOut;
  const expectedPlatformBalance = totalMoneyIn - totalMoneyOut;
  const discrepancy = platformLiabilities - expectedPlatformBalance;

  if (Math.abs(discrepancy) > 0) {
    let severity: IssueSeverity;
    if (Math.abs(discrepancy) > 5000) severity = "critical";
    else if (Math.abs(discrepancy) > 500) severity = "warning";
    else severity = "info";

    issues.push({
      severity,
      category: "balance_mismatch",
      subjectType: "platform",
      subjectId: "global",
      description: `Platform liabilities (${platformLiabilities} F) ≠ expected (${expectedPlatformBalance} F). Discrepancy: ${discrepancy > 0 ? "+" : ""}${discrepancy} F`,
      expectedValue: expectedPlatformBalance,
      actualValue: platformLiabilities,
      discrepancy,
      suggestedAction: "investigate",
      autoHealable: false,
      metadata: {
        brandBalance,
        echoBalance,
        checkoutsTotal,
        payoutsTotal,
        feesTotal,
        legacyIn,
        legacyOut,
        bonusCredits,
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
// CACHED CHECKS — run by cron every 5 min
// ---------------------------------------------------------------------------

/** CHECK 5: User balance integrity */
export async function checkUserBalanceIntegrity(): Promise<Issue[]> {
  const issues: Issue[] = [];

  const { data: mismatches } = await supabaseAdmin.rpc("find_user_balance_mismatches");
  for (const row of mismatches || []) {
    const diff = row.actual_balance - row.expected_balance;
    if (diff === 0) continue;

    issues.push({
      severity: Math.abs(diff) > 1000 ? "critical" : "warning",
      category: "balance_mismatch",
      subjectType: "user",
      subjectId: row.user_id,
      description: `${row.role} ${row.user_name || row.user_id.slice(0, 8)}: balance ${row.actual_balance}F ≠ expected ${row.expected_balance}F (${diff > 0 ? "+" : ""}${diff}F)`,
      expectedValue: row.expected_balance,
      actualValue: row.actual_balance,
      discrepancy: diff,
      suggestedAction: "investigate",
      autoHealable: false,
      metadata: { role: row.role, user_id: row.user_id, txn_count: row.transaction_count },
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

  const totalDiscrepancy = allIssues.reduce(
    (sum, i) => sum + Math.abs(i.discrepancy || 0),
    0
  );

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
