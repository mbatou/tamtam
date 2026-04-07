"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BannerStatus {
  hasCritical: boolean;
  unresolvedCount: number;
  snapshot: {
    total_discrepancy: number;
    computed_at: string;
    critical_issues_count: number;
  } | null;
}

export default function ReconciliationBanner() {
  const [status, setStatus] = useState<BannerStatus | null>(null);

  useEffect(() => {
    fetch("/api/superadmin/reconciliation/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStatus(d);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/superadmin/reconciliation/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setStatus(d);
        })
        .catch(() => {});
    }, 5 * 60 * 1000); // Refresh every 5 min

    return () => clearInterval(interval);
  }, []);

  if (!status?.hasCritical) return null;

  const discrepancy = status.snapshot?.total_discrepancy || 0;
  const criticalCount = status.snapshot?.critical_issues_count || 0;

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
      <div className="flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-red-400 font-semibold">
            {criticalCount} critical reconciliation issue{criticalCount > 1 ? "s" : ""}
          </span>
          {discrepancy > 0 && (
            <span className="text-red-300/70 text-xs">
              ({discrepancy.toLocaleString()} F discrepancy)
            </span>
          )}
        </div>
        <Link
          href="/superadmin/wave-reconciliation"
          className="text-xs font-bold text-red-400 hover:text-red-300 transition shrink-0"
        >
          View &rarr;
        </Link>
      </div>
    </div>
  );
}
