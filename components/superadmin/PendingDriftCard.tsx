"use client";

import { useCallback, useEffect, useState } from "react";

interface DriftDetail {
  echo_id: string;
  name: string | null;
  stuck_fcfa: number;
}

interface DriftReport {
  echos: number;
  total_fcfa: number;
  echos_detail?: DriftDetail[];
}

interface SettleResult {
  settled_echos: number;
  settled_fcfa: number;
  failures: { echo_id: string; error: string }[];
}

/**
 * One-click settlement for stuck pending earnings (pending_balance without a
 * backing pending_earnings row — see /api/superadmin/reconcile-pending-drift).
 * Shows the live drift report; the execute button runs the idempotent backfill.
 */
export default function PendingDriftCard() {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<SettleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/superadmin/reconcile-pending-drift", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
        setReport(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const execute = async () => {
    if (!report || report.total_fcfa <= 0) return;
    if (
      !confirm(
        `Débloquer ${report.total_fcfa.toLocaleString("fr-FR")} F pour ${report.echos} échos ?\n\n` +
          `L'argent passe de "en attente" à "disponible" (retirable). Opération idempotente et auditée.`
      )
    ) {
      return;
    }

    setExecuting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/reconcile-pending-drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dry_run: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setResult(data as SettleResult);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setExecuting(false);
    }
  };

  if (loading && !report) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-xs text-gray-500">
        Vérification du drift des gains en attente...
      </div>
    );
  }

  const clean = report !== null && report.total_fcfa <= 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        clean
          ? "bg-green-500/[0.06] border-green-500/20"
          : "bg-yellow-500/[0.06] border-yellow-500/25"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-white">Gains en attente non débloquables</p>
          {clean ? (
            <p className="text-xs text-green-400 mt-1">
              ✓ Aucun drift — tous les gains en attente sont couverts par pending_earnings
            </p>
          ) : (
            <p className="text-xs text-yellow-400 mt-1">
              {report?.echos} échos · {report?.total_fcfa.toLocaleString("fr-FR")} F bloqués sans
              ligne pending_earnings (jamais débloqués par le cron)
            </p>
          )}
          {result && (
            <p className="text-xs text-green-400 mt-1">
              ✓ Régularisé : {result.settled_fcfa.toLocaleString("fr-FR")} F pour{" "}
              {result.settled_echos} échos
              {result.failures.length > 0 && (
                <span className="text-red-400"> · {result.failures.length} échec(s)</span>
              )}
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!clean && (report?.echos_detail?.length || 0) > 0 && (
            <button
              onClick={() => setShowDetail((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg"
            >
              {showDetail ? "Masquer" : "Détail"}
            </button>
          )}
          {!clean && (
            <button
              onClick={execute}
              disabled={executing}
              className="text-xs font-bold text-white bg-[#D35400] hover:bg-[#B34700] disabled:opacity-50 px-4 py-1.5 rounded-lg"
            >
              {executing
                ? "Régularisation..."
                : `Débloquer ${report?.total_fcfa.toLocaleString("fr-FR")} F`}
            </button>
          )}
        </div>
      </div>

      {showDetail && !clean && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] max-h-48 overflow-y-auto">
          {report?.echos_detail?.map((d) => (
            <div
              key={d.echo_id}
              className="flex items-center justify-between py-1 text-xs border-b border-white/[0.03] last:border-0"
            >
              <span className="text-white/60">{d.name || d.echo_id.slice(0, 8)}</span>
              <span className="text-yellow-400 font-medium">
                {d.stuck_fcfa.toLocaleString("fr-FR")} F
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
