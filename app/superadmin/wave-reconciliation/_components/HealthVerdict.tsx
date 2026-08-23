"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { fetchJson, type Verdict } from "./types";

const STYLES = {
  ok: { ring: "bg-green-500/[0.06] border-green-500/25", text: "text-green-400", dot: "🟢" },
  warning: { ring: "bg-yellow-500/[0.06] border-yellow-500/25", text: "text-yellow-400", dot: "🟠" },
  critical: { ring: "bg-red-500/[0.07] border-red-500/30", text: "text-red-400", dot: "🔴" },
} as const;

/**
 * The answer to the only question this page exists to answer.
 *
 * Reads /api/superadmin/reconciliation/verdict — the same endpoint as the
 * platform-wide banner, so the two can never disagree. The figure shown is
 * money owed to real users, never a sum of unrelated discrepancies.
 */
export default function HealthVerdict() {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJson<Verdict>("/api/superadmin/reconciliation/verdict")
      .then(setVerdict)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  if (loading && !verdict) {
    return <div className="skeleton h-28 rounded-2xl" />;
  }

  if (error || !verdict) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.07] p-6">
        <p className="text-lg font-bold text-white">Vérification impossible</p>
        <p className="text-sm text-red-400 mt-1">
          {error || "Aucune réponse"} — l&apos;état de l&apos;argent est inconnu, pas sain.
        </p>
        <button
          onClick={load}
          className="mt-3 text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const style = STYLES[verdict.status];
  const { actionableCount: n, moneyOwedFcfa } = verdict;

  const headline =
    verdict.status === "ok"
      ? "L'argent est OK"
      : verdict.status === "warning"
        ? `${n} anomalie${n > 1 ? "s" : ""} à traiter`
        : `${n} problème${n > 1 ? "s" : ""} critique${n > 1 ? "s" : ""}`;

  const detail =
    verdict.status === "ok"
      ? `Dernière vérification ${timeAgo(verdict.checkedAt)} · 0 anomalie nécessitant une action`
      : verdict.status === "warning"
        ? moneyOwedFcfa > 0
          ? `${formatFCFA(moneyOwedFcfa)} concernés · vérifié ${timeAgo(verdict.checkedAt)}`
          : `Aucun montant dû, mais à régulariser · vérifié ${timeAgo(verdict.checkedAt)}`
        : `Argent dû à des utilisateurs : ${formatFCFA(moneyOwedFcfa)} · vérifié ${timeAgo(verdict.checkedAt)}`;

  return (
    <div className={`rounded-2xl border p-6 ${style.ring}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-syne text-2xl font-extrabold text-white leading-tight">
            <span className="mr-2">{style.dot}</span>
            {headline}
          </p>
          <p className={`text-sm mt-2 ${style.text}`}>{detail}</p>
          {verdict.status !== "ok" && (
            <p className="text-xs text-white/40 mt-1">
              Chaque anomalie a sa carte ci-dessous, avec le bouton qui la corrige.
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {loading ? "Vérification..." : "Revérifier"}
        </button>
      </div>
    </div>
  );
}
