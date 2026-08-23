"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatFCFA } from "@/lib/utils";

interface Verdict {
  status: "ok" | "warning" | "critical";
  moneyOwedFcfa: number;
  actionableCount: number;
}

/**
 * Platform-wide alert for money owed to users.
 *
 * Reads the same /api/superadmin/reconciliation/verdict endpoint as the
 * reconciliation page's hero, so the banner and the page can never show
 * different numbers — and it never shows the old total_discrepancy, which was a
 * sum of absolute values of unrelated things and not money.
 */
export default function ReconciliationBanner() {
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/superadmin/reconciliation/verdict")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setVerdict(d);
        })
        .catch((err) => console.error("[reconciliation-banner]", err));

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (verdict?.status !== "critical") return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
      <div className="flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-red-400 font-semibold">
            {verdict.actionableCount} problème{verdict.actionableCount > 1 ? "s" : ""} critique
            {verdict.actionableCount > 1 ? "s" : ""} de réconciliation
          </span>
          {verdict.moneyOwedFcfa > 0 && (
            <span className="text-red-300/70 text-xs">
              (dû aux utilisateurs : {formatFCFA(verdict.moneyOwedFcfa)})
            </span>
          )}
        </div>
        <Link
          href="/superadmin/wave-reconciliation"
          className="text-xs font-bold text-red-400 hover:text-red-300 transition shrink-0"
        >
          Voir &rarr;
        </Link>
      </div>
    </div>
  );
}
