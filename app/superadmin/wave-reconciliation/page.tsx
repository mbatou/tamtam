"use client";

import { useEffect, useState, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

interface Stats {
  totalCheckouts: number;
  completedCheckouts: number;
  totalWavePayouts: number;
  completedWavePayouts: number;
  processingPayouts: number;
  failedPayouts: number;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  totalLegacyPayouts: number;
  sentPayouts: number;
  pendingLegacyPayouts: number;
}

interface LiveIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  subjectType: string;
  subjectId: string;
  description: string;
  expectedValue?: number;
  actualValue?: number;
  discrepancy?: number;
  suggestedAction: string;
  autoHealable: boolean;
  metadata?: Row;
}

interface LiveResult {
  issues: LiveIssue[];
  total: number;
  critical: number;
  warnings: number;
  info: number;
  durationMs: number;
}

interface SnapshotStatus {
  snapshot: Row | null;
  unresolvedCount: number;
  criticalIssues: Row[];
  hasCritical: boolean;
}

interface FinancialData {
  snapshots: Row[];
  totals: Row;
  days: number;
}

type Tab = "health" | "issues" | "pnl" | "recharges" | "withdrawals" | "events";

export default function WaveReconciliationPage() {
  const [tab, setTab] = useState<Tab>("health");
  const [loading, setLoading] = useState(true);

  // Wave data
  const [checkouts, setCheckouts] = useState<Row[]>([]);
  const [wavePayouts, setWavePayouts] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [legacyPayouts, setLegacyPayouts] = useState<Row[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Reconciliation data
  const [liveResult, setLiveResult] = useState<LiveResult | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [dbIssues, setDbIssues] = useState<Row[]>([]);
  const [dbIssuesTotal, setDbIssuesTotal] = useState(0);
  const [showResolved, setShowResolved] = useState(false);

  // P&L data
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [pnlDays, setPnlDays] = useState(30);

  // Action feedback
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadWaveData = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/wave-reconciliation");
      if (res.ok) {
        const data = await res.json();
        setCheckouts(data.checkouts);
        setWavePayouts(data.wavePayouts);
        setPayments(data.payments);
        setLegacyPayouts(data.legacyPayouts);
        setPendingEvents(data.pendingEvents);
        setStats(data.stats);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const [liveRes, statusRes] = await Promise.all([
        fetch("/api/superadmin/reconciliation/live"),
        fetch("/api/superadmin/reconciliation/status"),
      ]);
      if (liveRes.ok) setLiveResult(await liveRes.json());
      if (statusRes.ok) setSnapshotStatus(await statusRes.json());
    } catch { /* ignore */ }
    setLiveLoading(false);
  }, []);

  const loadIssues = useCallback(async () => {
    try {
      const res = await fetch(`/api/superadmin/reconciliation/issues?resolved=${showResolved}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setDbIssues(data.issues);
        setDbIssuesTotal(data.total);
      }
    } catch { /* ignore */ }
  }, [showResolved]);

  const loadFinancial = useCallback(async () => {
    try {
      const res = await fetch(`/api/superadmin/reconciliation/financial?days=${pnlDays}`);
      if (res.ok) setFinancial(await res.json());
    } catch { /* ignore */ }
  }, [pnlDays]);

  useEffect(() => { loadWaveData(); loadLive(); }, [loadWaveData, loadLive]);
  useEffect(() => { if (tab === "issues") loadIssues(); }, [tab, loadIssues]);
  useEffect(() => { if (tab === "pnl") loadFinancial(); }, [tab, loadFinancial]);

  async function handleAction(action: string, params: Row) {
    setActionMsg(null);
    try {
      const res = await fetch("/api/superadmin/reconciliation/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg(`${action}: success`);
        loadLive();
        loadIssues();
      } else {
        setActionMsg(`${action} failed: ${data.error}`);
      }
    } catch (err) {
      setActionMsg(`Error: ${err}`);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "complete": case "completed": case "succeeded": case "sent":
        return "bg-green-500/15 text-green-400";
      case "processing": case "open": case "pending":
        return "bg-yellow-500/15 text-yellow-400";
      case "failed": case "reversed": case "expired": case "cancelled":
        return "bg-red-500/15 text-red-400";
      default:
        return "bg-white/10 text-gray-400";
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-500/15 text-red-400";
      case "warning": return "bg-yellow-500/15 text-yellow-400";
      case "info": return "bg-blue-500/15 text-blue-400";
      default: return "bg-white/10 text-gray-400";
    }
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtDate = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const userName = (row: Row) => {
    const u = row.users;
    if (u && typeof u === "object" && u.name) return u.name;
    return row.user_id?.slice(0, 8) || "—";
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "health", label: "Health", badge: liveResult?.critical },
    { key: "issues", label: "Issues", badge: snapshotStatus?.unresolvedCount },
    { key: "pnl", label: "P&L" },
    { key: "recharges", label: "Recharges" },
    { key: "withdrawals", label: "Withdrawals" },
    { key: "events", label: "Events" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Reconciliation</h1>
        <div className="flex items-center gap-2">
          {liveResult && (
            <span className="text-[10px] text-gray-500">
              Live scan: {liveResult.durationMs}ms
            </span>
          )}
          <button
            onClick={() => { setLoading(true); loadWaveData(); loadLive(); }}
            className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${actionMsg.includes("success") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {actionMsg}
          <button onClick={() => setActionMsg(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
              tab === t.key ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
            {t.badge && t.badge > 0 ? (
              <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ===== HEALTH TAB ===== */}
      {tab === "health" && (
        <div className="space-y-6">
          {/* Summary cards */}
          {snapshotStatus?.snapshot && (
            <div>
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Last Cached Snapshot</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard label="Brand Balances" value={fmt(snapshotStatus.snapshot.brand_balance_total || 0)} sub="FCFA" color="text-white" />
                <StatCard label="Echo Balances" value={fmt(snapshotStatus.snapshot.echo_balance_total || 0)} sub="FCFA" color="text-white" />
                <StatCard label="Platform Liabilities" value={fmt(snapshotStatus.snapshot.platform_liabilities_total || 0)} sub="FCFA" color="text-white" />
                <StatCard label="Wave Expected" value={fmt(snapshotStatus.snapshot.wave_wallet_expected || 0)} sub="FCFA" color="text-white" />
                <StatCard
                  label="Discrepancy"
                  value={fmt(snapshotStatus.snapshot.total_discrepancy || 0)}
                  sub="FCFA"
                  color={snapshotStatus.snapshot.total_discrepancy > 0 ? "text-red-400" : "text-green-400"}
                />
                <StatCard
                  label="Issues"
                  value={`${snapshotStatus.snapshot.critical_issues_count || 0}/${snapshotStatus.snapshot.warning_issues_count || 0}/${snapshotStatus.snapshot.info_issues_count || 0}`}
                  sub="crit / warn / info"
                  color={snapshotStatus.snapshot.critical_issues_count > 0 ? "text-red-400" : "text-green-400"}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                Cached at {snapshotStatus.snapshot.computed_at ? fmtDate(snapshotStatus.snapshot.computed_at) : "never"}
                {" "} in {snapshotStatus.snapshot.compute_duration_ms}ms
              </p>
            </div>
          )}

          {/* Live issues */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Live Issues</h3>
              <button
                onClick={loadLive}
                disabled={liveLoading}
                className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50"
              >
                {liveLoading ? "Scanning..." : "Re-scan"}
              </button>
            </div>

            {liveResult && liveResult.issues.length === 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="text-green-400 font-semibold">All clear — no live issues detected</p>
              </div>
            )}

            {liveResult && liveResult.issues.length > 0 && (
              <div className="space-y-2">
                {liveResult.issues.map((issue, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-4 flex items-start gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 mt-0.5 ${severityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{issue.description}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {issue.category} &middot; {issue.subjectType}/{issue.subjectId.slice(0, 8)}
                        {issue.discrepancy ? ` &middot; ${fmt(issue.discrepancy)} F` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {issue.autoHealable && (
                        <button
                          onClick={() => handleAction("refetch_wave", {
                            subjectType: issue.subjectType,
                            subjectId: issue.subjectId,
                            metadata: issue.metadata,
                          })}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                        >
                          Auto-heal
                        </button>
                      )}
                      {issue.suggestedAction === "refund" && (
                        <button
                          onClick={() => handleAction("refund", { subjectId: issue.subjectId })}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wave API stats */}
          {stats && (
            <div>
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Wave API</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Checkouts" value={String(stats.totalCheckouts)} sub={`${stats.completedCheckouts} completed`} color="text-white" />
                <StatCard label="Wave Payouts" value={String(stats.totalWavePayouts)} sub={`${stats.completedWavePayouts} completed`} color="text-white" />
                <StatCard label="Processing" value={String(stats.processingPayouts)} color={stats.processingPayouts > 0 ? "text-yellow-400" : "text-white"} />
                <StatCard label="Failed" value={String(stats.failedPayouts)} color={stats.failedPayouts > 0 ? "text-red-400" : "text-white"} />
                <StatCard label="Payments" value={String(stats.totalPayments)} sub={`${stats.completedPayments} done`} color="text-white" />
                <StatCard label="Legacy Payouts" value={String(stats.totalLegacyPayouts)} sub={`${stats.sentPayouts} sent`} color="text-white" />
              </div>

              {stats.processingPayouts > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-3">
                  <p className="text-yellow-400 font-semibold text-sm">
                    {stats.processingPayouts} payout(s) in processing state — verify with Wave dashboard
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== ISSUES TAB ===== */}
      {tab === "issues" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowResolved(false)}
                className={`text-sm px-3 py-1.5 rounded-lg ${!showResolved ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white bg-white/5"}`}
              >
                Unresolved ({dbIssuesTotal})
              </button>
              <button
                onClick={() => setShowResolved(true)}
                className={`text-sm px-3 py-1.5 rounded-lg ${showResolved ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white bg-white/5"}`}
              >
                Resolved
              </button>
            </div>
          </div>

          {dbIssues.length === 0 ? (
            <div className="bg-white/5 rounded-lg p-8 text-center">
              <p className="text-gray-400">{showResolved ? "No resolved issues" : "No unresolved issues"}</p>
              <p className="text-gray-600 text-xs mt-1">Issues are captured by the reconciliation cron (every 5 min)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dbIssues.map((issue) => (
                <div key={issue.id} className="bg-white/5 rounded-lg p-4 flex items-start gap-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 mt-0.5 ${severityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{issue.description}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {issue.category} &middot; {issue.subject_type}/{issue.subject_id?.slice(0, 8)}
                      {issue.discrepancy ? ` &middot; ${fmt(issue.discrepancy)} F` : ""}
                      {issue.resolved_at ? ` &middot; Resolved ${fmtDate(issue.resolved_at)}` : ""}
                    </p>
                  </div>
                  {!issue.resolved && (
                    <div className="flex items-center gap-2 shrink-0">
                      {issue.auto_healable && (
                        <button
                          onClick={() => handleAction("refetch_wave", {
                            issueId: issue.id,
                            subjectType: issue.subject_type,
                            subjectId: issue.subject_id,
                            metadata: issue.metadata,
                          })}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                        >
                          Heal
                        </button>
                      )}
                      {issue.suggested_action === "refund" && (
                        <button
                          onClick={() => handleAction("refund", { issueId: issue.id, subjectId: issue.subject_id })}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                        >
                          Refund
                        </button>
                      )}
                      <button
                        onClick={() => handleAction("resolve", { issueId: issue.id })}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== P&L TAB ===== */}
      {tab === "pnl" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Financial Snapshots</h3>
            <div className="flex items-center gap-2">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setPnlDays(d)}
                  className={`text-xs px-2 py-1 rounded ${pnlDays === d ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white bg-white/5"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {financial?.totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Gross Revenue" value={fmt(financial.totals.grossRevenue)} sub="FCFA" color="text-white" />
              <StatCard label="Tamtam Commission" value={fmt(financial.totals.tamtamCommission)} sub="FCFA" color="text-green-400" />
              <StatCard label="Echo Payouts" value={fmt(financial.totals.echoPayouts)} sub="FCFA" color="text-orange-400" />
              <StatCard label="Gross Margin" value={fmt(financial.totals.grossMargin)} sub="FCFA" color={financial.totals.grossMargin >= 0 ? "text-green-400" : "text-red-400"} />
            </div>
          )}

          {financial?.totals && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Ambassador Commissions" value={fmt(financial.totals.ambassadorCommissions)} sub="FCFA" color="text-white" />
              <StatCard label="Wave Fees" value={fmt(financial.totals.waveFees)} sub="FCFA" color="text-white" />
              <StatCard label="Clicks Verified" value={fmt(financial.totals.clicksVerified)} color="text-white" />
              <StatCard label="Clicks Invalid" value={fmt(financial.totals.clicksInvalid)} color={financial.totals.clicksInvalid > 0 ? "text-red-400" : "text-white"} />
              <StatCard label="Net Revenue" value={fmt(financial.totals.netRevenue)} sub="FCFA" color="text-green-400" />
            </div>
          )}

          {/* Daily breakdown */}
          {financial?.snapshots && financial.snapshots.length > 0 && (
            <div className="bg-card rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Commission</th>
                      <th className="text-right py-2">Echo Payouts</th>
                      <th className="text-right py-2">Margin</th>
                      <th className="text-center py-2">Clicks</th>
                      <th className="text-center py-2">New Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...financial.snapshots].reverse().map((s) => (
                      <tr key={s.id} className="border-t border-gray-800">
                        <td className="py-3 text-white text-xs">{s.snapshot_date}</td>
                        <td className="py-3 text-right text-white font-mono">{fmt(s.gross_revenue)} F</td>
                        <td className="py-3 text-right text-green-400 font-mono">{fmt(s.tamtam_commission)} F</td>
                        <td className="py-3 text-right text-orange-400 font-mono">{fmt(s.echo_payouts)} F</td>
                        <td className={`py-3 text-right font-mono ${s.gross_margin >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(s.gross_margin)} F</td>
                        <td className="py-3 text-center text-gray-400">{s.clicks_verified}<span className="text-gray-600">/{s.clicks_invalid}</span></td>
                        <td className="py-3 text-center text-gray-400">{s.new_brands}B / {s.new_echos}E</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!financial?.snapshots || financial.snapshots.length === 0) && (
            <div className="bg-white/5 rounded-lg p-8 text-center">
              <p className="text-gray-400">No financial snapshots yet</p>
              <p className="text-gray-600 text-xs mt-1">Snapshots are generated daily by the financial-snapshot cron</p>
            </div>
          )}
        </div>
      )}

      {/* ===== RECHARGES TAB ===== */}
      {tab === "recharges" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">Wave Checkouts ({checkouts.length})</h2>
            {checkouts.length === 0 ? (
              <p className="text-gray-500 text-sm">No Wave checkouts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase">
                      <th className="text-left py-2">User</th>
                      <th className="text-center py-2">Amount</th>
                      <th className="text-center py-2">Checkout</th>
                      <th className="text-center py-2">Payment</th>
                      <th className="text-center py-2">Date</th>
                      <th className="text-left py-2">Wave ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkouts.map((c) => (
                      <tr key={c.id} className="border-t border-gray-800">
                        <td className="py-3 text-white">{userName(c)}</td>
                        <td className="py-3 text-center text-white font-mono">{fmt(c.amount)} F</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(c.checkout_status)}`}>{c.checkout_status}</span>
                        </td>
                        <td className="py-3 text-center">
                          {c.payment_status && <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusColor(c.payment_status)}`}>{c.payment_status}</span>}
                        </td>
                        <td className="py-3 text-center text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                        <td className="py-3 text-gray-600 text-xs font-mono">{c.wave_checkout_id?.slice(0, 16)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">All Payments ({payments.length})</h2>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase">
                      <th className="text-left py-2">User</th>
                      <th className="text-center py-2">Amount</th>
                      <th className="text-center py-2">Method</th>
                      <th className="text-center py-2">Status</th>
                      <th className="text-center py-2">Date</th>
                      <th className="text-left py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-gray-800">
                        <td className="py-3 text-white">{userName(p)}</td>
                        <td className="py-3 text-center text-white font-mono">{fmt(p.amount)} F</td>
                        <td className="py-3 text-center text-gray-400">{p.payment_method || "—"}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                        </td>
                        <td className="py-3 text-center text-gray-500 text-xs">{fmtDate(p.created_at)}</td>
                        <td className="py-3 text-gray-600 text-xs font-mono">{p.ref_command?.slice(0, 20)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== WITHDRAWALS TAB ===== */}
      {tab === "withdrawals" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">Wave Payouts ({wavePayouts.length})</h2>
            {wavePayouts.length === 0 ? (
              <p className="text-gray-500 text-sm">No Wave payouts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase">
                      <th className="text-left py-2">User</th>
                      <th className="text-center py-2">Amount</th>
                      <th className="text-center py-2">Fee</th>
                      <th className="text-center py-2">Net</th>
                      <th className="text-left py-2">Mobile</th>
                      <th className="text-center py-2">Status</th>
                      <th className="text-center py-2">Date</th>
                      <th className="text-left py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wavePayouts.map((p) => (
                      <tr key={p.id} className="border-t border-gray-800">
                        <td className="py-3 text-white">{userName(p)}</td>
                        <td className="py-3 text-center text-white font-mono">{fmt(p.amount)} F</td>
                        <td className="py-3 text-center text-gray-500 font-mono">{p.fee} F</td>
                        <td className="py-3 text-center text-green-400 font-mono">{fmt(p.net_amount)} F</td>
                        <td className="py-3 text-gray-400 text-xs font-mono">{p.mobile}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.payout_status)}`}>{p.payout_status}</span>
                        </td>
                        <td className="py-3 text-center text-gray-500 text-xs">{fmtDate(p.created_at)}</td>
                        <td className="py-3 text-red-400 text-xs max-w-[200px] truncate">{p.error_message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">All Payouts ({legacyPayouts.length})</h2>
            {legacyPayouts.length === 0 ? (
              <p className="text-gray-500 text-sm">No payouts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase">
                      <th className="text-left py-2">User</th>
                      <th className="text-center py-2">Amount</th>
                      <th className="text-center py-2">Provider</th>
                      <th className="text-center py-2">Status</th>
                      <th className="text-center py-2">Date</th>
                      <th className="text-center py-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacyPayouts.map((p) => (
                      <tr key={p.id} className="border-t border-gray-800">
                        <td className="py-3 text-white">{userName(p)}</td>
                        <td className="py-3 text-center text-white font-mono">{fmt(p.amount)} F</td>
                        <td className="py-3 text-center text-gray-400">{p.provider || "—"}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                        </td>
                        <td className="py-3 text-center text-gray-500 text-xs">{fmtDate(p.created_at)}</td>
                        <td className="py-3 text-center text-gray-500 text-xs">{p.completed_at ? fmtDate(p.completed_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EVENTS TAB ===== */}
      {tab === "events" && (
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-white font-bold mb-4">Webhook Events ({pendingEvents.length})</h2>
          {pendingEvents.length === 0 ? (
            <p className="text-green-400 text-sm">No webhook events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase">
                    <th className="text-left py-2">Event ID</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-center py-2">Processed</th>
                    <th className="text-center py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEvents.map((e) => (
                    <tr key={e.id} className="border-t border-gray-800">
                      <td className="py-3 text-gray-400 text-xs font-mono">{e.wave_event_id?.slice(0, 24)}</td>
                      <td className="py-3 text-white">{e.event_type}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${e.processed ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                          {e.processed ? "yes" : "no"}
                        </span>
                      </td>
                      <td className="py-3 text-center text-gray-500 text-xs">{fmtDate(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}
