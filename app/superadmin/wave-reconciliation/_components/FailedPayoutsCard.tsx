"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";
import FixButton from "./FixButton";
import { fetchJson, type LiveIssue, type LiveResult } from "./types";

/** The user behind a failed payout, as carried in the issue metadata. */
function beneficiaryOf(issue: LiveIssue): string {
  const userId = issue.metadata?.user_id;
  return typeof userId === "string" ? `l'utilisateur ${userId.slice(0, 8)}` : "l'utilisateur concerné";
}

function amountOf(issue: LiveIssue): number {
  return Math.abs(issue.discrepancy || issue.expectedValue || 0);
}

/**
 * Payouts Wave refused where the user's wallet was debited and never put back.
 * This is the clearest form of "we owe someone money": one guarded refund each.
 */
export default function FailedPayoutsCard() {
  const [issues, setIssues] = useState<LiveIssue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJson<LiveResult>("/api/superadmin/reconciliation/live?check=failed_payouts")
      .then((d) => setIssues(d.issues))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const refund = (issue: LiveIssue) => async () => {
    await fetchJson<{ amount: number }>("/api/superadmin/reconciliation/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refund", subjectId: issue.subjectId }),
    });
    return `Remboursé : ${formatFCFA(amountOf(issue))}`;
  };

  if (loading && !issues) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-xs text-gray-500">
        Vérification des retraits échoués...
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
          <p className="text-sm font-bold text-white">Retraits échoués non remboursés</p>
          {clean ? (
            <p className="text-xs text-green-400 mt-1">
              ✓ Aucun retrait échoué en attente de remboursement
            </p>
          ) : (
            <p className="text-xs text-red-400 mt-1">
              {rows.length} utilisateur{rows.length > 1 ? "s ont" : " a"} été débité
              {rows.length > 1 ? "s" : ""} pour un retrait qui a échoué : {formatFCFA(total)} à leur
              rendre.
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
              <FixButton
                label="Rembourser"
                amountFcfa={amountOf(issue)}
                beneficiary={beneficiaryOf(issue)}
                detail={
                  "Le montant est recrédité sur son portefeuille immédiatement. " +
                  "Opération irréversible depuis cette page."
                }
                onConfirm={refund(issue)}
                onDone={load}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
