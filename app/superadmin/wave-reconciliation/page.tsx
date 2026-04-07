"use client";

import { useEffect, useState, useCallback } from "react";

interface WaveCheckout {
  id: string;
  user_id: string;
  wave_checkout_id: string;
  amount: number;
  checkout_status: string;
  payment_status: string | null;
  client_reference: string;
  created_at: string;
  completed_at: string | null;
  users: { name: string } | null;
}

interface WavePayout {
  id: string;
  user_id: string;
  wave_payout_id: string | null;
  idempotency_key: string;
  amount: number;
  fee: number;
  net_amount: number;
  mobile: string;
  payout_status: string;
  error_message: string | null;
  receipt_url: string | null;
  created_at: string;
  completed_at: string | null;
  users: { name: string } | null;
}

interface WebhookEvent {
  id: string;
  wave_event_id: string;
  event_type: string;
  processed: boolean;
  created_at: string;
}

interface Stats {
  totalCheckouts: number;
  completedCheckouts: number;
  totalPayouts: number;
  completedPayouts: number;
  processingPayouts: number;
  failedPayouts: number;
}

type Tab = "overview" | "checkouts" | "payouts" | "events";

export default function WaveReconciliationPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [checkouts, setCheckouts] = useState<WaveCheckout[]>([]);
  const [payouts, setPayouts] = useState<WavePayout[]>([]);
  const [pendingEvents, setPendingEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/wave-reconciliation");
      if (res.ok) {
        const data = await res.json();
        setCheckouts(data.checkouts);
        setPayouts(data.payouts);
        setPendingEvents(data.pendingEvents);
        setStats(data.stats);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "complete":
      case "completed":
      case "succeeded":
        return "bg-green-500/15 text-green-400";
      case "processing":
      case "open":
      case "pending":
        return "bg-yellow-500/15 text-yellow-400";
      case "failed":
      case "reversed":
      case "expired":
        return "bg-red-500/15 text-red-400";
      default:
        return "bg-white/10 text-gray-400";
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "checkouts", label: "Checkouts" },
    { key: "payouts", label: "Payouts" },
    { key: "events", label: "Webhook Events" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">&#127754; Wave Reconciliation</h1>
        <button
          onClick={() => { setLoading(true); loadData(); }}
          className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg"
        >
          &#8635; Refresh
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Checkouts" value={stats.totalCheckouts} color="text-white" />
            <StatCard label="Completed" value={stats.completedCheckouts} color="text-green-400" />
            <StatCard label="Total Payouts" value={stats.totalPayouts} color="text-white" />
            <StatCard label="Completed" value={stats.completedPayouts} color="text-green-400" />
            <StatCard label="Processing" value={stats.processingPayouts} color="text-yellow-400" />
            <StatCard label="Failed/Reversed" value={stats.failedPayouts} color="text-red-400" />
          </div>

          {stats.processingPayouts > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 font-semibold text-sm">
                &#9888; {stats.processingPayouts} payout(s) in processing state
              </p>
              <p className="text-gray-400 text-xs mt-1">
                These may have had network timeouts. Check the Payouts tab for details.
                Do NOT auto-refund — verify with Wave dashboard first.
              </p>
            </div>
          )}

          {pendingEvents.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-orange-400 font-semibold text-sm">
                {pendingEvents.length} unprocessed webhook event(s)
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Check the Events tab to investigate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Checkouts */}
      {tab === "checkouts" && (
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-white font-bold mb-4">Recent Checkouts (Recharges)</h2>
          {checkouts.length === 0 ? (
            <p className="text-gray-500 text-sm">No Wave checkouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase">
                    <th className="text-left py-2">User</th>
                    <th className="text-center py-2">Amount</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-center py-2">Payment</th>
                    <th className="text-center py-2">Date</th>
                    <th className="text-left py-2">Wave ID</th>
                  </tr>
                </thead>
                <tbody>
                  {checkouts.map((c) => (
                    <tr key={c.id} className="border-t border-gray-800">
                      <td className="py-3 text-white">
                        {(c.users as unknown as { name: string })?.name || c.user_id.slice(0, 8)}
                      </td>
                      <td className="py-3 text-center text-white font-mono">{c.amount.toLocaleString()} F</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(c.checkout_status)}`}>
                          {c.checkout_status}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {c.payment_status && (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusColor(c.payment_status)}`}>
                            {c.payment_status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 text-gray-600 text-xs font-mono">{c.wave_checkout_id?.slice(0, 16)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payouts */}
      {tab === "payouts" && (
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-white font-bold mb-4">Recent Payouts (Withdrawals)</h2>
          {payouts.length === 0 ? (
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
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-t border-gray-800">
                      <td className="py-3 text-white">
                        {(p.users as unknown as { name: string })?.name || p.user_id.slice(0, 8)}
                      </td>
                      <td className="py-3 text-center text-white font-mono">{p.amount.toLocaleString()} F</td>
                      <td className="py-3 text-center text-gray-500 font-mono">{p.fee} F</td>
                      <td className="py-3 text-center text-green-400 font-mono">{p.net_amount.toLocaleString()} F</td>
                      <td className="py-3 text-gray-400 text-xs font-mono">{p.mobile}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.payout_status)}`}>
                          {p.payout_status}
                        </span>
                      </td>
                      <td className="py-3 text-center text-gray-500 text-xs">
                        {new Date(p.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 text-red-400 text-xs max-w-[200px] truncate">
                        {p.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Webhook Events */}
      {tab === "events" && (
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-white font-bold mb-4">Unprocessed Webhook Events</h2>
          {pendingEvents.length === 0 ? (
            <p className="text-green-400 text-sm">All webhook events have been processed.</p>
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
                      <td className="py-3 text-gray-400 text-xs font-mono">{e.wave_event_id.slice(0, 24)}</td>
                      <td className="py-3 text-white">{e.event_type}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${e.processed ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                          {e.processed ? "yes" : "no"}
                        </span>
                      </td>
                      <td className="py-3 text-center text-gray-500 text-xs">
                        {new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}
