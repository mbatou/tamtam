"use client";

import { FinanceTab } from "./types";

export default function FinanceTabs({
  tab,
  onTabChange,
  pendingPayoutsCount,
  completedPayoutsCount,
  pendingRechargesCount,
  processedRechargesCount,
}: {
  tab: FinanceTab;
  onTabChange: (tab: FinanceTab) => void;
  pendingPayoutsCount: number;
  completedPayoutsCount: number;
  pendingRechargesCount: number;
  processedRechargesCount: number;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
      {([
        { key: "payout_requests" as FinanceTab, label: "Demandes de retrait", count: pendingPayoutsCount, alert: pendingPayoutsCount > 0 },
        { key: "payout_history" as FinanceTab, label: "Historique retraits", count: completedPayoutsCount },
        { key: "pending_recharges" as FinanceTab, label: "Recharges en attente", count: pendingRechargesCount, alert: pendingRechargesCount > 0 },
        { key: "payments" as FinanceTab, label: "Recharges traitées", count: processedRechargesCount },
      ]).map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg font-dm text-xs font-medium transition-all whitespace-nowrap"
          style={{
            background: tab === t.key ? "rgba(211,84,0,0.12)" : "transparent",
            color: tab === t.key ? "#D35400" : "rgba(255,255,255,0.4)",
          }}
        >
          {t.label}
          {t.alert && t.count > 0 && (
            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(226,75,74,0.15)", color: "#F09595" }}>
              {t.count}
            </span>
          )}
          {!t.alert && t.count > 0 && (
            <span style={{ color: "rgba(255,255,255,0.25)" }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
