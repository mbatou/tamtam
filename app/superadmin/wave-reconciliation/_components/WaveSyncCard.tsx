"use client";

import { useCallback, useEffect, useState } from "react";
import FixButton from "./FixButton";
import { fetchJson, type LiveIssue, type LiveResult } from "./types";

/**
 * Recharges and retraits whose status we never heard back about from Wave:
 * checkouts left open and payouts left processing. Asking Wave again is the
 * whole fix — and if Wave says a recharge went through, the wallet is credited,
 * which is why the button still confirms first.
 */
export default function WaveSyncCard() {
  const [issues, setIssues] = useState<LiveIssue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJson<LiveResult>("/api/superadmin/reconciliation/live?check=wave_sync")
      .then((d) => setIssues(d.issues))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const resyncAll = async () => {
    const rows = issues || [];
    let ok = 0;
    const failures: string[] = [];

    for (const issue of rows) {
      try {
        await fetchJson("/api/superadmin/reconciliation/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "refetch_wave",
            subjectType: issue.subjectType,
            subjectId: issue.subjectId,
            metadata: issue.metadata,
          }),
        });
        ok += 1;
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "erreur");
      }
    }

    const failed = failures.length > 0 ? ` · ${failures.length} échec(s)` : "";
    return `${ok}/${rows.length} opération(s) resynchronisée(s) auprès de Wave${failed}`;
  };

  if (loading && !issues) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-xs text-gray-500">
        Vérification de la synchronisation Wave...
      </div>
    );
  }

  const rows = issues || [];
  const clean = rows.length === 0 && !error;
  const checkouts = rows.filter((i) => i.subjectType === "wave_checkout").length;
  const payouts = rows.length - checkouts;

  return (
    <div
      className={`rounded-xl border p-4 ${
        clean ? "bg-green-500/[0.06] border-green-500/20" : "bg-yellow-500/[0.06] border-yellow-500/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-white">Opérations Wave non synchronisées</p>
          {clean ? (
            <p className="text-xs text-green-400 mt-1">
              ✓ Toutes les recharges et retraits sont à jour avec Wave
            </p>
          ) : (
            <p className="text-xs text-yellow-400 mt-1">
              {checkouts > 0 && `${checkouts} recharge${checkouts > 1 ? "s" : ""} restée${checkouts > 1 ? "s" : ""} ouverte${checkouts > 1 ? "s" : ""}`}
              {checkouts > 0 && payouts > 0 && " · "}
              {payouts > 0 && `${payouts} retrait${payouts > 1 ? "s" : ""} bloqué${payouts > 1 ? "s" : ""} en traitement`}
              {" — on n'a jamais reçu leur statut final de Wave."}
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex items-start gap-2">
          {!clean && rows.length > 0 && (
            <button
              onClick={() => setShowDetail((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg"
            >
              {showDetail ? "Masquer" : "Détail"}
            </button>
          )}
          {!clean && rows.length > 0 && (
            <FixButton
              label="Resynchroniser tout"
              beneficiary={`${rows.length} opération${rows.length > 1 ? "s" : ""}`}
              detail={
                "On redemande à Wave le statut de chaque opération et on l'applique. " +
                "Si Wave confirme qu'une recharge a bien été payée, le portefeuille du client est crédité."
              }
              onConfirm={resyncAll}
              onDone={load}
            />
          )}
        </div>
      </div>

      {showDetail && !clean && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] max-h-48 overflow-y-auto space-y-1">
          {rows.map((issue) => (
            <p key={issue.subjectId} className="text-[11px] text-white/50">
              {issue.description}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
