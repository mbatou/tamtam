"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import { Activity, RefreshCw, AlertTriangle, ShieldAlert, Database, Clock, Server, Wifi, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  details?: string;
  uptimePercent?: number;
  responseTimes?: number[];
}

interface TableInfo {
  name: string;
  count: number;
}

interface SecuritySummary {
  events24h: number;
  events7d: number;
  critical24h: number;
  high24h: number;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  ip_address: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
}

interface Anomaly {
  type: string;
  severity: "warning" | "critical";
  message: string;
}

interface AdminActivity {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface HealthData {
  overallStatus: "healthy" | "degraded" | "down";
  checks: HealthCheck[];
  tableCounts: TableInfo[];
  securitySummary: SecuritySummary;
  recentSecurityEvents: SecurityEvent[];
  anomalies: Anomaly[];
  recentActivity: AdminActivity[];
  checkedAt: string;
}

const STATUS_STYLES = {
  healthy: { color: "text-emerald-400", dot: "bg-emerald-400", border: "border-emerald-400/20", label: "Opérationnel" },
  degraded: { color: "text-yellow-400", dot: "bg-yellow-400", border: "border-yellow-400/20", label: "Dégradé" },
  down: { color: "text-red-400", dot: "bg-red-400", border: "border-red-400/20", label: "Hors service" },
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-400/10" },
  high: { color: "text-orange-400", bg: "bg-orange-400/10" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
  low: { color: "text-blue-400", bg: "bg-blue-400/10" },
  warning: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
};

const ACTION_ICONS: Record<string, typeof CheckCircle2> = {
  create: CheckCircle2,
  update: RefreshCw,
  delete: XCircle,
  approve: CheckCircle2,
  reject: XCircle,
};

function Sparkline({ data, color = "#1D9E75" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

type Tab = "overview" | "security" | "activity";

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: Activity },
  { key: "security", label: "Sécurité", icon: ShieldAlert },
  { key: "activity", label: "Activité", icon: Clock },
];

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/superadmin/health");
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Impossible de charger les données de santé");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading || !data) {
    return (
      <div className="p-6 max-w-7xl space-y-4">
        <div className="h-10 w-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl">
        <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-8 text-center">
          <p className="text-red-400 font-dm font-semibold mb-4">{error}</p>
          <button onClick={loadData} className="bg-[#D35400] text-white px-6 py-2 rounded-xl text-sm font-dm font-semibold hover:bg-[#D35400]/90 transition">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const overallStyle = STATUS_STYLES[data.overallStatus];

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-syne font-bold flex items-center gap-3">
            <Server size={24} className="text-[#D35400]" />
            Santé plateforme
          </h1>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5`}>
            <div className={`w-2 h-2 rounded-full ${overallStyle.dot} animate-pulse`} />
            <span className={`text-xs font-dm font-bold ${overallStyle.color}`}>{overallStyle.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-dm text-white/30">Mis à jour {timeAgo(data.checkedAt)}</span>
          <button onClick={loadData} className="text-white/40 hover:text-white/60 transition p-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Anomalies Banner */}
      {data.anomalies.length > 0 && (
        <div className="space-y-2">
          {data.anomalies.map((a, i) => {
            const actionLink = a.type === "fraud" ? "/superadmin/fraud"
              : a.type === "payouts" ? "/superadmin/finance?tab=payout_requests"
              : a.type === "budget" ? "/superadmin/campaigns"
              : null;
            const actionLabel = a.type === "fraud" ? "Anti-Fraude"
              : a.type === "payouts" ? "Finances"
              : a.type === "budget" ? "Campagnes"
              : null;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  a.severity === "critical"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-yellow-500/5 border-yellow-500/20"
                }`}
              >
                <AlertTriangle size={18} className={a.severity === "critical" ? "text-red-400" : "text-yellow-400"} />
                <span className={`text-sm font-dm font-semibold flex-1 ${a.severity === "critical" ? "text-red-400" : "text-yellow-400"}`}>
                  {a.message}
                </span>
                {actionLink && actionLabel && (
                  <Link
                    href={actionLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-dm font-bold whitespace-nowrap transition ${
                      a.severity === "critical"
                        ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                        : "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30"
                    }`}
                  >
                    {actionLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111128] p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-dm font-semibold transition ${
                tab === t.key ? "bg-[#D35400] text-white shadow" : "text-white/40 hover:text-white/60"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Service Health Checks */}
          <div>
            <h3 className="text-xs font-dm font-bold text-white/50 mb-4 uppercase tracking-wider">Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.checks.map((check) => {
                const style = STATUS_STYLES[check.status];
                return (
                  <div key={check.name} className={`bg-[#111128] border ${style.border} rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-syne font-bold flex items-center gap-2">
                        <Wifi size={14} className="text-white/40" />
                        {check.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${style.dot} ${check.status === "healthy" ? "" : "animate-pulse"}`} />
                        <span className={`text-xs font-dm font-semibold ${style.color}`}>{style.label}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-syne font-black">{check.latencyMs}</span>
                        <span className="text-xs font-dm text-white/30 mb-1">ms</span>
                      </div>
                      <span className={`text-[10px] font-dm font-semibold ${
                        check.uptimePercent && check.uptimePercent >= 99 ? "text-emerald-400/60" :
                        check.uptimePercent && check.uptimePercent >= 90 ? "text-yellow-400/60" :
                        "text-red-400/60"
                      }`}>
                        {check.uptimePercent != null ? `${check.uptimePercent}% uptime` : check.status === "healthy" ? "Stable" : "Problèmes"}
                      </span>
                    </div>
                    {check.responseTimes && check.responseTimes.length > 1 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-dm text-white/20">24h</span>
                        <Sparkline
                          data={check.responseTimes}
                          color={check.status === "healthy" ? "#34d399" : check.status === "degraded" ? "#fbbf24" : "#f87171"}
                        />
                        <span className="text-[10px] font-dm text-white/20">{Math.min(...check.responseTimes)}-{Math.max(...check.responseTimes)}ms</span>
                      </div>
                    )}
                    {check.details && (
                      <p className="text-xs font-dm text-red-400/70 mt-2">{check.details}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Counts */}
          <div>
            <h3 className="text-xs font-dm font-bold text-white/50 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Database size={14} />
              Données
            </h3>
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {data.tableCounts.map((tc) => (
                  <div key={tc.name} className="text-center">
                    <p className="text-xs font-dm text-white/40 font-semibold mb-1 truncate">{tc.name}</p>
                    <p className={`text-xl font-syne font-bold ${tc.count === -1 ? "text-red-400" : ""}`}>
                      {tc.count === -1 ? "ERR" : tc.count.toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Quick Summary */}
          <div>
            <h3 className="text-xs font-dm font-bold text-white/50 mb-4 uppercase tracking-wider">Résumé sécurité</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <AdminStatCard label="Événements 24h" value={data.securitySummary.events24h.toString()} icon={<Activity size={18} />} accent="white" />
              <AdminStatCard label="Événements 7j" value={data.securitySummary.events7d.toString()} icon={<Clock size={18} />} accent="white" />
              <AdminStatCard label="Critiques 24h" value={data.securitySummary.critical24h.toString()} icon={<AlertCircle size={18} />} accent={data.securitySummary.critical24h > 0 ? "red" : "white"} />
              <AdminStatCard label="Sévérité haute 24h" value={data.securitySummary.high24h.toString()} icon={<AlertTriangle size={18} />} accent={data.securitySummary.high24h > 0 ? "orange" : "white"} />
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {tab === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard label="Événements 24h" value={data.securitySummary.events24h.toString()} icon={<Activity size={18} />} accent="white" />
            <AdminStatCard label="Événements 7j" value={data.securitySummary.events7d.toString()} icon={<Clock size={18} />} accent="white" />
            <AdminStatCard label="Critiques 24h" value={data.securitySummary.critical24h.toString()} icon={<AlertCircle size={18} />} accent={data.securitySummary.critical24h > 0 ? "red" : "white"} />
            <AdminStatCard label="Sévérité haute 24h" value={data.securitySummary.high24h.toString()} icon={<AlertTriangle size={18} />} accent={data.securitySummary.high24h > 0 ? "orange" : "white"} />
          </div>

          <div>
            <h3 className="text-xs font-dm font-bold text-white/50 mb-4 uppercase tracking-wider">Événements récents</h3>
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl overflow-hidden">
              {data.recentSecurityEvents.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm font-dm">Aucun événement de sécurité</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="text-left p-3 text-[11px] font-dm text-white/30 font-semibold uppercase">Date</th>
                        <th className="text-left p-3 text-[11px] font-dm text-white/30 font-semibold uppercase">Type</th>
                        <th className="text-left p-3 text-[11px] font-dm text-white/30 font-semibold uppercase">Sévérité</th>
                        <th className="text-left p-3 text-[11px] font-dm text-white/30 font-semibold uppercase">IP</th>
                        <th className="text-left p-3 text-[11px] font-dm text-white/30 font-semibold uppercase">Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSecurityEvents.map((event) => {
                        const sev = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.low;
                        return (
                          <tr key={event.id} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                            <td className="p-3 text-xs font-dm text-white/40 whitespace-nowrap">
                              {new Date(event.created_at).toLocaleString("fr-FR", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="p-3 text-xs font-dm font-semibold">{event.event_type}</td>
                            <td className="p-3">
                              <span className={`text-xs font-dm font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                                {event.severity}
                              </span>
                            </td>
                            <td className="p-3 text-xs font-dm text-white/40 font-mono">{event.ip_address || "—"}</td>
                            <td className="p-3 text-xs font-dm text-white/30 max-w-[200px] truncate">
                              {event.details ? JSON.stringify(event.details) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY TAB */}
      {tab === "activity" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-dm font-bold text-white/50 mb-4 uppercase tracking-wider">Activité admin récente</h3>
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl overflow-hidden">
              {data.recentActivity.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm font-dm">Aucune activité récente</div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {data.recentActivity.map((activity) => {
                    const ActionIcon = ACTION_ICONS[activity.action] || AlertCircle;
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-[#141420] transition">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                          <ActionIcon size={14} className="text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-dm font-semibold">{activity.action}</span>
                            {activity.target_type && (
                              <span className="text-xs font-dm text-white/30 bg-white/5 px-2 py-0.5 rounded">
                                {activity.target_type}
                              </span>
                            )}
                            {activity.target_id && (
                              <span className="text-xs font-dm text-white/20 font-mono">#{activity.target_id.slice(0, 8)}</span>
                            )}
                          </div>
                          {activity.details && (
                            <p className="text-xs font-dm text-white/30 mt-1 truncate">
                              {JSON.stringify(activity.details)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-dm text-white/20 whitespace-nowrap shrink-0">
                          {timeAgo(activity.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
