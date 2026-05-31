"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Send, Ban, Clock, RefreshCw, TrendingUp, Users, ArrowRight } from "lucide-react";

interface Stats {
  pending: number;
  sentToday: number;
  suppressedToday: number;
  sent7d: number;
  suppressed7d: number;
  failed7d: number;
  pushSubscribers: number;
  deliveryRate: number;
  byType: Record<string, { sent: number; suppressed: number; failed: number; pending: number }>;
  dailyChart: { date: string; sent: number; suppressed: number; failed: number }[];
  recent: Array<{
    id: string;
    echo_id: string;
    type: string;
    status: string;
    scheduled_for: string;
    sent_at: string | null;
    suppression_reason: string | null;
    created_at: string;
    payload: Record<string, unknown>;
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
  manual: "Manuel",
  reengagement: "Réengagement",
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  failed: "bg-red-500/15 text-red-400",
  suppressed: "bg-white/10 text-white/40",
};

export default function NotificationsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const router = useRouter();

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
    return <div className="p-6 text-white/40 text-sm">Chargement...</div>;
  }
  if (!stats) {
    return <div className="p-6 text-red-400 text-sm">Erreur de chargement</div>;
  }

  const maxChart = Math.max(...stats.dailyChart.map((d) => d.sent + d.suppressed + d.failed), 1);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-syne font-bold text-white">Notifications</h1>
          <p className="text-xs text-white/30 mt-1">Centre de contrôle des notifications push et email</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && stats.pending > 0 && (
            <button
              onClick={async () => {
                setProcessing(true);
                setProcessResult(null);
                try {
                  const res = await fetch("/api/superadmin/notifications/process", { method: "POST" });
                  const data = await res.json();
                  if (data.error) {
                    setProcessResult(`Erreur: ${data.error}`);
                  } else {
                    setProcessResult(`${data.sent || 0} envoyées, ${data.failed || 0} échouées, ${data.suppressed || 0} supprimées`);
                  }
                  setTimeout(() => setProcessResult(null), 8000);
                  load();
                } catch (err) {
                  setProcessResult(`Erreur réseau: ${err instanceof Error ? err.message : "connexion échouée"}`);
                }
                setProcessing(false);
              }}
              disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D35400]/15 hover:bg-[#D35400]/25 border border-[#D35400]/30 transition text-xs text-[#D35400] font-medium"
            >
              <Send size={12} className={processing ? "animate-pulse" : ""} />
              {processing ? "Envoi..." : `Envoyer ${stats.pending} en attente`}
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-xs text-white/50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Rafraîchir
          </button>
        </div>
      </div>

      {processResult && (
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {processResult}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats + Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={<Send size={16} />} label="Envoyées aujourd'hui" value={stats.sentToday} color="text-[#5DCAA5]" />
            <KpiCard icon={<TrendingUp size={16} />} label="Taux de livraison" value={`${stats.deliveryRate}%`} color="text-[#D35400]" />
            <KpiCard icon={<Users size={16} />} label="Abonnés push" value={stats.pushSubscribers} color="text-white/70" />
            <KpiCard icon={<Ban size={16} />} label="Suppressions (caps)" value={stats.suppressedToday} color="text-white/30" />
          </div>

          {/* Delivery chart */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <h2 className="text-sm font-bold text-white mb-4">Livraison (7 jours)</h2>
            <div className="flex items-end gap-1.5 h-32">
              {stats.dailyChart.map((day) => {
                const total = day.sent + day.suppressed + day.failed;
                const sentH = (day.sent / maxChart) * 100;
                const supH = (day.suppressed / maxChart) * 100;
                const failH = (day.failed / maxChart) * 100;
                const dayLabel = new Date(day.date).toLocaleDateString("fr-FR", { weekday: "short" });
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col-reverse gap-px" style={{ height: "100px" }}>
                      <div className="bg-[#D35400]/70 rounded-t-sm transition-all" style={{ height: `${sentH}%`, minHeight: total > 0 ? "2px" : 0 }} title={`${day.sent} envoyées`} />
                      <div className="bg-white/10 rounded-sm transition-all" style={{ height: `${supH}%` }} title={`${day.suppressed} supprimées`} />
                      <div className="bg-red-500/50 rounded-sm transition-all" style={{ height: `${failH}%` }} title={`${day.failed} échouées`} />
                    </div>
                    <span className="text-[9px] text-white/30">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/[0.04]">
              <span className="flex items-center gap-1.5 text-[10px] text-white/40"><span className="w-2 h-2 rounded-sm bg-[#D35400]/70" /> Envoyées</span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/40"><span className="w-2 h-2 rounded-sm bg-white/10" /> Supprimées</span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/40"><span className="w-2 h-2 rounded-sm bg-red-500/50" /> Échouées</span>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Activité récente</h2>
              <Link href="/superadmin/notifications/history" className="text-[10px] text-[#D35400] hover:text-[#F0997B] flex items-center gap-1">
                Tout voir <ArrowRight size={10} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/30 border-b border-white/[0.06]">
                    <th className="text-left py-2 pr-3">Heure</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Statut</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.slice(0, 20).map((n) => (
                    <tr key={n.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-2 pr-3 text-white/40">
                        {new Date(n.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 px-3 text-white/70">{TYPE_LABELS[n.type] || n.type}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[n.status] || "text-white/30"}`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white/25 hidden md:table-cell">{n.suppression_reason || "—"}</td>
                    </tr>
                  ))}
                  {stats.recent.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-white/20">Aucune notification</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Quick send + Nav */}
        <div className="space-y-4">
          {/* Quick send */}
          <div className="rounded-2xl bg-[#111128] border border-[rgba(211,84,0,0.2)] p-4">
            <p className="text-xs font-bold text-white mb-3">Envoi rapide</p>
            <div className="flex flex-col gap-2">
              {[
                { type: "new_campaign", label: "Nouvelle campagne", icon: "🥁" },
                { type: "share_reminder", label: "Rappel de partage", icon: "📲" },
                { type: "reengagement", label: "Réengagement inactifs", icon: "🔄" },
                { type: "custom", label: "Message personnalisé", icon: "✏️" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => router.push(`/superadmin/notifications/send?type=${item.type}`)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition text-left"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs text-white/70">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Sections</p>
            {[
              { href: "/superadmin/notifications/send", label: "Composer", icon: Send },
              { href: "/superadmin/notifications/history", label: "Historique", icon: Clock },
              { href: "/superadmin/notifications/sequences", label: "Séquences", icon: ArrowRight },
              { href: "/superadmin/notifications/settings", label: "Paramètres", icon: Bell },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition text-xs text-white/50 hover:text-white/70"
              >
                <item.icon size={13} />
                {item.label}
              </Link>
            ))}
          </div>

          {/* By type stats */}
          {Object.keys(stats.byType).length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-xs font-bold text-white mb-3">Par type (30j)</p>
              {Object.entries(stats.byType).map(([type, counts]) => (
                <div key={type} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-[11px] text-white/50">{TYPE_LABELS[type] || type}</span>
                  <span className="text-[11px] text-emerald-400 font-medium">{counts.sent}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
        {icon}
        <span className="text-[10px] text-white/30">{label}</span>
      </div>
      <div className={`text-xl font-bold font-syne ${color}`}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </div>
    </div>
  );
}
