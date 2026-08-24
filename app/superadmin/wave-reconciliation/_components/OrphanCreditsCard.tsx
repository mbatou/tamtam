"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";
import FixButton from "./FixButton";
import { fetchJson, type LiveIssue, type LiveResult } from "./types";

function userIdOf(issue: LiveIssue): string | null {
  const userId = issue.metadata?.user_id;
  return typeof userId === "string" ? userId : null;
}

function beneficiaryOf(issue: LiveIssue): string {
  const userId = userIdOf(issue);
  return userId ? `l'utilisateur ${userId.slice(0, 8)}` : "l'utilisateur concerné";
}

function amountOf(issue: LiveIssue): number {
  return Math.abs(issue.discrepancy || issue.expectedValue || 0);
}

/**
 * Recharges Wave took the money for and that never landed in a wallet: the
 * checkout is complete but no wallet transaction was ever written. The client
 * paid and got nothing, so this is money owed.
 */
export default function OrphanCreditsCard() {
  const [issues, setIssues] = useState<LiveIssue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJson<LiveResult>("/api/superadmin/reconciliation/live?check=orphan_credits")
      .then((d) => setIssues(d.issues))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const credit = (issue: LiveIssue) => async () => {
    const data = await fetchJson<{ amount: number; column: string }>(
      "/api/superadmin/reconciliation/actions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_credit",
          userId: userIdOf(issue),
          amount: amountOf(issue),
          sourceType: "wave_checkout",
          sourceId: issue.subjectId,
        }),
      }
    );
    return `Crédité : ${formatFCFA(data.amount)} (${data.column})`;
  };

  if (loading && !issues) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-xs text-gray-500">
        Vérification des recharges non créditées...
      </div>
    );
  }

  const rows = issues || [];
  const clean = rows.length === 0 && !error;
  const total = rows.reduce((s, i) => s + amountOf(i), 0);

  return (
    <div
      className={`rounded-xl border p-4 ${
        clean ? "bg-green-500/[0.06] border-green-500/20" : "bg-red-500/[0.06] border-red-500/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-white">Recharges payées mais non créditées</p>
          {clean ? (
            <p className="text-xs text-green-400 mt-1">
              ✓ Toute recharge encaissée a bien été créditée
            </p>
          ) : (
            <p className="text-xs text-red-400 mt-1">
              {rows.length} recharge{rows.length > 1 ? "s" : ""} encaissée{rows.length > 1 ? "s" : ""}{" "}
              par Wave sans aucune écriture de portefeuille : {formatFCFA(total)} dus.
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        {!clean && rows.length > 0 && (
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg"
          >
            {showDetail ? "Masquer" : "Détail"}
          </button>
        )}
      </div>

      {!clean && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          {rows.map((issue) => (
            <div key={issue.subjectId} className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-white/70">
                  {beneficiaryOf(issue)} · {formatFCFA(amountOf(issue))}
                </p>
                {showDetail && (
                  <p className="text-[10px] text-white/30 mt-0.5">{issue.description}</p>
                )}
              </div>
              {userIdOf(issue) ? (
                <FixButton
                  label="Créditer"
                  amountFcfa={amountOf(issue)}
                  beneficiary={beneficiaryOf(issue)}
                  detail={
                    "Le portefeuille est crédité et l'écriture manquante est enregistrée. " +
                    "À ne faire qu'après avoir vérifié le paiement côté Wave."
                  }
                  onConfirm={credit(issue)}
                  onDone={load}
                />
              ) : (
                <span className="text-[11px] text-white/40">
                  Bénéficiaire inconnu — contacter le dev
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
