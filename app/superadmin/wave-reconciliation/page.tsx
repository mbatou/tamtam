"use client";

import { useEffect, useState, useCallback } from "react";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

type Tab = "overview" | "recharges" | "withdrawals" | "events";

export default function WaveReconciliationPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [checkouts, setCheckouts] = useState<Row[]>([]);
  const [wavePayouts, setWavePayouts] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [legacyPayouts, setLegacyPayouts] = useState<Row[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadData = useCallback(async () => {
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

  useEffect(() => { loadData(); }, [loadData]);

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

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtDate = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const userName = (row: Row, fk: string = "users") => {
    const u = row[fk];
    if (!u) return row.user_id?.slice(0, 8) || "—";
    if (typeof u === "object" && u.name) return u.name;
    return row.user_id?.slice(0, 8) || "—";
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "recharges", label: "Recharges" },
    { key: "withdrawals", label: "Withdrawals" },
    { key: "events", label: "Webhook Events" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Wave Reconciliation</h1>
        <button
          onClick={() => { setLoading(true); loadData(); }}
          className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && stats && (
        <div className="space-y-6">
          {/* Wave API Stats */}
          <div>
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Wave API</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Checkouts" value={stats.totalCheckouts} sub={`${stats.completedCheckouts} completed`} color="text-white" />
              <StatCard label="Wave Payouts" value={stats.totalWavePayouts} sub={`${stats.completedWavePayouts} completed`} color="text-white" />
              <StatCard label="Processing" value={stats.processingPayouts} color={stats.processingPayouts > 0 ? "text-yellow-400" : "text-white"} />
              <StatCard label="Failed" value={stats.failedPayouts} color={stats.failedPayouts > 0 ? "text-red-400" : "text-white"} />
              <StatCard label="Payments" value={stats.totalPayments} sub={`${stats.completedPayments} done / ${stats.pendingPayments} pending`} color="text-white" />
              <StatCard label="Legacy Payouts" value={stats.totalLegacyPayouts} sub={`${stats.sentPayouts} sent / ${stats.pendingLegacyPayouts} pending`} color="text-white" />
            </div>
          </div>

          {/* Alerts */}
          {stats.processingPayouts > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 font-semibold text-sm">
                {stats.processingPayouts} payout(s) in processing state
              </p>
              <p className="text-gray-400 text-xs mt-1">
                These may have had network timeouts. Do NOT auto-refund — verify with Wave dashboard first.
              </p>
            </div>
          )}

          {stats.pendingLegacyPayouts > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-orange-400 font-semibold text-sm">
                {stats.pendingLegacyPayouts} legacy payout(s) awaiting manual approval
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Go to Finance to approve/reject these.
              </p>
            </div>
          )}

          {pendingEvents.filter(e => !e.processed).length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 font-semibold text-sm">
                {pendingEvents.filter(e => !e.processed).length} unprocessed webhook event(s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recharges — Wave checkouts + legacy payments */}
      {tab === "recharges" && (
        <div className="space-y-6">
          {/* Wave Checkouts */}
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

          {/* Legacy Payments */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">All Payments / Recharges ({payments.length})</h2>
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

      {/* Withdrawals — Wave payouts + legacy payouts */}
      {tab === "withdrawals" && (
        <div className="space-y-6">
          {/* Wave Payouts */}
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

          {/* Legacy Payouts */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">All Payouts / Withdrawals ({legacyPayouts.length})</h2>
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

      {/* Webhook Events */}
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

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}
