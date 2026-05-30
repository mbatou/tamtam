"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Notification {
  id: string;
  echo_id: string;
  echo_name: string;
  echo_city: string | null;
  type: string;
  status: string;
  campaign_id: string | null;
  scheduled_for: string;
  sent_at: string | null;
  suppression_reason: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface BulkStats {
  totalSent: number;
  deliveryRate: number;
  totalSuppressed: number;
  totalFailed: number;
}

const TYPE_LABELS: Record<string, string> = {
  new_campaign: "Nouvelle campagne",
  share_reminder: "Rappel de partage",
  inactivity: "Inactivité",
  campaign_ending: "Fin campagne",
  streak_danger: "Streak danger",
  streak_milestone: "Jalon streak",
  payout_ready: "Paiement",
  manual: "Manuel",
  reengagement: "Réengagement",
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  failed: "bg-red-500/15 text-red-400",
  suppressed: "bg-white/10 text-white/40",
};

const FILTER_STATUSES = ["", "sent", "pending", "suppressed", "failed"];
const FILTER_TYPES = ["", "new_campaign", "share_reminder", "inactivity", "campaign_ending", "streak_danger", "manual", "reengagement"];

export default function HistoryPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bulkStats, setBulkStats] = useState<BulkStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);

    try {
      const res = await fetch(`/api/superadmin/notifications/history?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setBulkStats(data.bulkStats || null);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/superadmin/notifications")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
          <ArrowLeft size={16} className="text-white/40" />
        </button>
        <div>
          <h1 className="text-lg font-syne font-bold text-white">Historique des notifications</h1>
          <p className="text-[11px] text-white/30">{total.toLocaleString("fr-FR")} notifications au total</p>
        </div>
      </div>

      {/* Bulk stats */}
      {bulkStats && (
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-white/40">Total envoyées: <strong className="text-emerald-400">{bulkStats.totalSent.toLocaleString("fr-FR")}</strong></span>
          <span className="text-white/40">Taux livraison: <strong className="text-[#D35400]">{bulkStats.deliveryRate}%</strong></span>
          <span className="text-white/40">Suppressions: <strong className="text-white/50">{bulkStats.totalSuppressed.toLocaleString("fr-FR")}</strong></span>
          <span className="text-white/40">Échecs: <strong className="text-red-400">{bulkStats.totalFailed.toLocaleString("fr-FR")}</strong></span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
        >
          <option value="">Tous statuts</option>
          {FILTER_STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
        >
          <option value="">Tous types</option>
          {FILTER_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 border-b border-white/[0.06]">
                <th className="text-left py-2.5 px-3">Date/heure</th>
                <th className="text-left py-2.5 px-3">Type</th>
                <th className="text-left py-2.5 px-3 hidden md:table-cell">Destinataire</th>
                <th className="text-left py-2.5 px-3">Statut</th>
                <th className="text-left py-2.5 px-3 hidden lg:table-cell">Raison</th>
              </tr>
            </thead>
            <tbody>
              {loading && notifications.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-white/20">Chargement...</td></tr>
              ) : notifications.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-white/20">Aucune notification</td></tr>
              ) : notifications.map((n) => (
                <tr
                  key={n.id}
                  onClick={() => setSelected(n)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition"
                >
                  <td className="py-2.5 px-3 text-white/40">
                    {new Date(n.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2.5 px-3 text-white/70">{TYPE_LABELS[n.type] || n.type}</td>
                  <td className="py-2.5 px-3 text-white/50 hidden md:table-cell">
                    {n.echo_name}{n.echo_city ? ` · ${n.echo_city}` : ""}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[n.status] || "text-white/30"}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-white/25 hidden lg:table-cell">{n.suppression_reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/[0.06]">
            <span className="text-[10px] text-white/30">Page {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1 rounded hover:bg-white/[0.06] disabled:opacity-20">
                <ChevronLeft size={14} className="text-white/50" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-white/[0.06] disabled:opacity-20">
                <ChevronRight size={14} className="text-white/50" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md bg-[#111128] border-l border-white/[0.08] p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Détails</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-white/[0.06]">
                <X size={14} className="text-white/40" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <DetailRow label="ID" value={selected.id} />
              <DetailRow label="Type" value={TYPE_LABELS[selected.type] || selected.type} />
              <DetailRow label="Statut" value={selected.status} />
              <DetailRow label="Destinataire" value={`${selected.echo_name} (${selected.echo_city || "—"})`} />
              <DetailRow label="Programmé" value={new Date(selected.scheduled_for).toLocaleString("fr-FR")} />
              <DetailRow label="Envoyé" value={selected.sent_at ? new Date(selected.sent_at).toLocaleString("fr-FR") : "—"} />
              <DetailRow label="Raison suppression" value={selected.suppression_reason || "—"} />
              <DetailRow label="Créé" value={new Date(selected.created_at).toLocaleString("fr-FR")} />
              <div>
                <p className="text-white/30 mb-1">Payload</p>
                <pre className="bg-white/[0.04] rounded-lg p-3 text-[10px] text-white/50 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/30 mb-0.5">{label}</p>
      <p className="text-white/70">{value}</p>
    </div>
  );
}
