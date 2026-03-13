"use client";

import { useEffect, useState, useCallback } from "react";
import { timeAgo } from "@/lib/utils";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  details?: string;
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

const STATUS_CONFIG = {
  healthy: { label: "Opérationnel", color: "text-emerald-400", bg: "bg-emerald-400", dot: "bg-emerald-400", border: "border-emerald-400/20" },
  degraded: { label: "Dégradé", color: "text-yellow-400", bg: "bg-yellow-400", dot: "bg-yellow-400", border: "border-yellow-400/20" },
  down: { label: "Hors service", color: "text-red-400", bg: "bg-red-400", dot: "bg-red-400", border: "border-red-400/20" },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-400/10" },
  high: { color: "text-orange-400", bg: "bg-orange-400/10" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
  low: { color: "text-blue-400", bg: "bg-blue-400/10" },
  warning: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
};

type Tab = "overview" | "security" | "activity";

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
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading || !data) {
    return (
      <div className="p-6 max-w-7xl space-y-4">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl">
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 font-semibold mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const overallConfig = STATUS_CONFIG[data.overallStatus];
  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "overview", label: "Vue d'ensemble", emoji: "📊" },
    { key: "security", label: "Sécurité", emoji: "🛡️" },
    { key: "activity", label: "Activité", emoji: "📋" },
  ];

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Santé Plateforme</h1>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${overallConfig.bg}/10`}>
            <div className={`w-2 h-2 rounded-full ${overallConfig.dot} animate-pulse`} />
            <span className={`text-xs font-bold ${overallConfig.color}`}>{overallConfig.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">Mise à jour: {timeAgo(data.checkedAt)}</span>
          <button onClick={loadData} className="text-xs text-white/40 hover:text-white/60 transition px-2 py-1 rounded-lg hover:bg-white/5">
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Anomalies Banner */}
      {data.anomalies.length > 0 && (
        <div className="space-y-2">
          {data.anomalies.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                a.severity === "critical"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-yellow-500/5 border-yellow-500/20"
              }`}
            >
              <span className="text-lg">{a.severity === "critical" ? "🚨" : "⚠️"}</span>
              <span className={`text-sm font-semibold ${a.severity === "critical" ? "text-red-400" : "text-yellow-400"}`}>
                {a.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.key ? "bg-gradient-primary text-white shadow" : "text-white/40 hover:text-white/60"
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Service Health Checks */}
          <div>
            <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.checks.map((check) => {
                const config = STATUS_CONFIG[check.status];
                return (
                  <div key={check.name} className={`glass-card p-5 border ${config.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold">{check.name}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${config.dot} ${check.status === "healthy" ? "" : "animate-pulse"}`} />
                        <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black">{check.latencyMs}</span>
                      <span className="text-xs text-white/30 mb-1">ms</span>
                    </div>
                    {check.details && (
                      <p className="text-xs text-red-400/70 mt-2">{check.details}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Counts */}
          <div>
            <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">Données</h3>
            <div className="glass-card p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {data.tableCounts.map((t) => (
                  <div key={t.name} className="text-center">
                    <p className="text-xs text-white/40 font-semibold mb-1 truncate">{t.name}</p>
                    <p className={`text-xl font-bold ${t.count === -1 ? "text-red-400" : ""}`}>
                      {t.count === -1 ? "ERR" : t.count.toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Quick Summary */}
          <div>
            <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">Sécurité (résumé)</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <p className="text-xs text-white/40 font-semibold mb-1">Événements 24h</p>
                <p className="text-2xl font-bold">{data.securitySummary.events24h}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-white/40 font-semibold mb-1">Événements 7j</p>
                <p className="text-2xl font-bold">{data.securitySummary.events7d}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-white/40 font-semibold mb-1">Critiques 24h</p>
                <p className={`text-2xl font-bold ${data.securitySummary.critical24h > 0 ? "text-red-400" : ""}`}>
                  {data.securitySummary.critical24h}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-white/40 font-semibold mb-1">Haute sévérité 24h</p>
                <p className={`text-2xl font-bold ${data.securitySummary.high24h > 0 ? "text-orange-400" : ""}`}>
                  {data.securitySummary.high24h}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECURITY TAB ===== */}
      {tab === "security" && (
        <div className="space-y-6">
          {/* Security Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 font-semibold mb-1">Événements 24h</p>
              <p className="text-2xl font-bold">{data.securitySummary.events24h}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 font-semibold mb-1">Événements 7j</p>
              <p className="text-2xl font-bold">{data.securitySummary.events7d}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 font-semibold mb-1">Critiques 24h</p>
              <p className={`text-2xl font-bold ${data.securitySummary.critical24h > 0 ? "text-red-400" : ""}`}>
                {data.securitySummary.critical24h}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 font-semibold mb-1">Haute sévérité 24h</p>
              <p className={`text-2xl font-bold ${data.securitySummary.high24h > 0 ? "text-orange-400" : ""}`}>
                {data.securitySummary.high24h}
              </p>
            </div>
          </div>

          {/* Recent Security Events */}
          <div>
            <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">Événements récents</h3>
            <div className="glass-card overflow-hidden">
              {data.recentSecurityEvents.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm">Aucun événement de sécurité</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left p-3 text-xs text-white/30 font-semibold">Date</th>
                        <th className="text-left p-3 text-xs text-white/30 font-semibold">Type</th>
                        <th className="text-left p-3 text-xs text-white/30 font-semibold">Sévérité</th>
                        <th className="text-left p-3 text-xs text-white/30 font-semibold">IP</th>
                        <th className="text-left p-3 text-xs text-white/30 font-semibold">Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSecurityEvents.map((event) => {
                        const sev = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.low;
                        return (
                          <tr key={event.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <td className="p-3 text-xs text-white/40 whitespace-nowrap">
                              {new Date(event.created_at).toLocaleString("fr-FR", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="p-3 text-xs font-semibold">{event.event_type}</td>
                            <td className="p-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                                {event.severity}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-white/40 font-mono">{event.ip_address || "—"}</td>
                            <td className="p-3 text-xs text-white/30 max-w-[200px] truncate">
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

      {/* ===== ACTIVITY TAB ===== */}
      {tab === "activity" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">Activité admin récente</h3>
            <div className="glass-card overflow-hidden">
              {data.recentActivity.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm">Aucune activité récente</div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {data.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm shrink-0">
                        {activity.action === "create" ? "➕" :
                         activity.action === "update" ? "✏️" :
                         activity.action === "delete" ? "🗑️" :
                         activity.action === "approve" ? "✅" :
                         activity.action === "reject" ? "❌" : "📌"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{activity.action}</span>
                          {activity.target_type && (
                            <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded">
                              {activity.target_type}
                            </span>
                          )}
                          {activity.target_id && (
                            <span className="text-xs text-white/20 font-mono">#{activity.target_id.slice(0, 8)}</span>
                          )}
                        </div>
                        {activity.details && (
                          <p className="text-xs text-white/30 mt-1 truncate">
                            {JSON.stringify(activity.details)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-white/20 whitespace-nowrap shrink-0">
                        {timeAgo(activity.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
