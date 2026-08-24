"use client";

import { useState } from "react";
import AdminBadge, { type AdminBadgeProps } from "@/components/superadmin/AdminBadge";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import { formatFCFA } from "@/lib/utils";
import {
  fetchJson,
  type IssueSeverity,
  type LiveIssue,
  type LiveResult,
  type SnapshotStatus,
} from "./types";

const SEVERITY_BADGE: Record<IssueSeverity, AdminBadgeProps["status"]> = {
  critical: "error",
  warning: "pending",
  info: "draft",
};

function IssueLine({ issue }: { issue: LiveIssue }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <AdminBadge status={SEVERITY_BADGE[issue.severity]} label={issue.severity} />
      <div className="min-w-0">
        <p className="text-xs text-white/80">{issue.description}</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          {issue.category} · {issue.subjectType}/{issue.subjectId.slice(0, 8)}
          {issue.discrepancy ? ` · ${formatFCFA(issue.discrepancy)}` : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * Everything that is diagnosis rather than verdict, kept shut by default and
 * only fetched once someone opens it.
 */
export default function TechnicalDetails() {
  const [live, setLive] = useState<LiveResult | null>(null);
  const [status, setStatus] = useState<SnapshotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOnce = () => {
    if (live || loading) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchJson<LiveResult>("/api/superadmin/reconciliation/live"),
      fetchJson<SnapshotStatus>("/api/superadmin/reconciliation/status"),
    ])
      .then(([liveData, statusData]) => {
        setLive(liveData);
        setStatus(statusData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  };

  const issues = live?.issues || [];
  const unreliable = issues.filter((i) => i.metadata?.unreliable === true);
  const reliable = issues.filter((i) => i.metadata?.unreliable !== true);
  const snapshot = status?.snapshot;

  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open) loadOnce();
      }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02]"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-white/70 hover:text-white">
        Détails techniques
      </summary>

      <div className="px-4 pb-4 space-y-6">
        {loading && <p className="text-xs text-gray-500">Analyse en cours...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}

        {live && (
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
              Anomalies détectées en direct
            </h3>
            {reliable.length === 0 ? (
              <p className="text-xs text-green-400">Aucune anomalie exploitable.</p>
            ) : (
              reliable.map((issue, i) => <IssueLine key={`${issue.subjectId}-${i}`} issue={issue} />)
            )}
          </div>
        )}

        {live && unreliable.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Indicateurs non fiables — modèle incomplet
            </h3>
            <p className="text-[11px] text-white/30 mb-2">
              Ces écarts viennent du modèle comptable, pas d&apos;argent manquant : la marge
              plateforme et les budgets de campagne en cours ne sont pas modélisés, et le contrôle
              des soldes lit encore la colonne héritée users.balance. Ils ne déclenchent ni verdict
              ni alerte.
            </p>
            {unreliable.map((issue, i) => (
              <IssueLine key={`${issue.subjectId}-unreliable-${i}`} issue={issue} />
            ))}
          </div>
        )}

        {snapshot && (
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
              Dernier instantané du cron (quotidien, 02:00 UTC)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <AdminStatCard
                label="Soldes marques"
                value={formatFCFA(snapshot.brand_balance_total || 0)}
                accent="white"
              />
              <AdminStatCard
                label="Soldes échos"
                value={formatFCFA(snapshot.echo_balance_total || 0)}
                accent="white"
              />
              <AdminStatCard
                label="Engagements plateforme"
                value={formatFCFA(snapshot.platform_liabilities_total || 0)}
                accent="white"
              />
              <AdminStatCard
                label="Recharges Wave"
                value={formatFCFA(snapshot.wave_checkouts_total || 0)}
                accent="teal"
              />
              <AdminStatCard
                label="Retraits Wave"
                value={formatFCFA(snapshot.wave_payouts_total || 0)}
                accent="orange"
              />
              <AdminStatCard
                label="Solde Wave attendu"
                value={formatFCFA(snapshot.wave_wallet_expected || 0)}
                sub={`frais ${formatFCFA(snapshot.wave_fees_total || 0)}`}
                accent="white"
              />
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
