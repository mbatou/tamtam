"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Send, Ban, AlertTriangle, Clock, RefreshCw } from "lucide-react";

interface Stats {
  pending: number;
  sentToday: number;
  sent7d: number;
  suppressed7d: number;
  failed7d: number;
  byType: Record<string, { sent: number; suppressed: number; failed: number; pending: number }>;
  recent: Array<{
    id: string;
    echo_id: string;
    type: string;
    status: string;
    scheduled_for: string;
    sent_at: string | null;
    suppression_reason: string | null;
    created_at: string;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  new_campaign: "Nouvelle campagne",
  share_reminder: "Rappel de partage",
  inactivity: "Inactivité",
  campaign_ending: "Campagne qui expire",
  streak_danger: "Série en danger",
  streak_milestone: "Jalon de série",
  payout_ready: "Paiement prêt",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  failed: "bg-red-500/15 text-red-400",
  suppressed: "bg-white/10 text-white/40",
};

export default function NotificationsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/superadmin/notification-stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (!stats && loading) {
    return (
      <div className="p-6 text-white/40 text-sm">Chargement...</div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-red-400 text-sm">Erreur de chargement</div>
    );
  }

  const typeEntries = Object.entries(stats.byType);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-syne font-bold text-white">
            Notifications Push
          </h1>
          <p className="text-xs text-white/30 mt-1">
            Système de notifications automatisées
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-xs text-white/50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Rafraîchir
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          icon={<Clock size={16} />}
          label="En attente"
          value={stats.pending}
          color="text-amber-400"
        />
        <KpiCard
          icon={<Send size={16} />}
          label="Envoyées aujourd'hui"
          value={stats.sentToday}
          color="text-emerald-400"
        />
        <KpiCard
          icon={<Bell size={16} />}
          label="Envoyées (7j)"
          value={stats.sent7d}
          color="text-blue-400"
        />
        <KpiCard
          icon={<Ban size={16} />}
          label="Supprimées (7j)"
          value={stats.suppressed7d}
          color="text-white/40"
        />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          label="Échouées (7j)"
          value={stats.failed7d}
          color="text-red-400"
        />
      </div>

      {/* By Type breakdown */}
      {typeEntries.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <h2 className="text-sm font-bold text-white mb-3">Par type (30 jours)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-right py-2 px-3">Envoyées</th>
                  <th className="text-right py-2 px-3">Supprimées</th>
                  <th className="text-right py-2 px-3">Échouées</th>
                  <th className="text-right py-2 px-3">En attente</th>
                </tr>
              </thead>
              <tbody>
                {typeEntries.map(([type, counts]) => (
                  <tr key={type} className="border-b border-white/[0.03]">
                    <td className="py-2 pr-4 text-white/70">{TYPE_LABELS[type] || type}</td>
                    <td className="text-right py-2 px-3 text-emerald-400">{counts.sent}</td>
                    <td className="text-right py-2 px-3 text-white/30">{counts.suppressed}</td>
                    <td className="text-right py-2 px-3 text-red-400">{counts.failed}</td>
                    <td className="text-right py-2 px-3 text-amber-400">{counts.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent notifications */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <h2 className="text-sm font-bold text-white mb-3">
          Notifications récentes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 border-b border-white/[0.06]">
                <th className="text-left py-2 pr-3">Type</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-left py-2 px-3">Programmé</th>
                <th className="text-left py-2 px-3">Envoyé</th>
                <th className="text-left py-2 px-3">Raison</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((n) => (
                <tr key={n.id} className="border-b border-white/[0.03]">
                  <td className="py-2 pr-3 text-white/70">
                    {TYPE_LABELS[n.type] || n.type}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[n.status] || "text-white/30"}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-white/40">
                    {new Date(n.scheduled_for).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 px-3 text-white/40">
                    {n.sent_at
                      ? new Date(n.sent_at).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="py-2 px-3 text-white/30">
                    {n.suppression_reason || "—"}
                  </td>
                </tr>
              ))}
              {stats.recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/20">
                    Aucune notification
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
        {icon}
        <span className="text-[10px] text-white/30">{label}</span>
      </div>
      <div className={`text-xl font-bold font-syne ${color}`}>
        {value.toLocaleString("fr-FR")}
      </div>
    </div>
  );
}
