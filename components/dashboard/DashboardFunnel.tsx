"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface FunnelRow {
  label: string;
  value: number;
  pct: number;
  note: string;
}

interface DashboardFunnelProps {
  rows: FunnelRow[];
  campaignName: string;
  costPerSignup?: number;
  costPerActivation?: number;
}

export default function DashboardFunnel({ rows, campaignName, costPerSignup, costPerActivation }: DashboardFunnelProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("admin.dashboard.conversionFunnel")}
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {campaignName}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {row.label}
              </span>
              <span className="text-[13px] font-bold font-syne text-white">
                {row.value.toLocaleString()}
              </span>
            </div>
            <div className="h-[5px] rounded w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${row.pct}%`,
                  background: idx === 0 ? "rgba(255,255,255,0.25)" : "#D35400",
                  opacity: idx === 0 ? 1 : 1 - (idx * 0.15),
                }}
              />
            </div>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {row.note}
            </p>
          </div>
        ))}
      </div>

      {(costPerSignup || costPerActivation) && (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
          {costPerSignup !== undefined && (
            <div>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {t("admin.dashboard.costPerSignup")}
              </p>
              <p className="text-sm font-bold font-syne mt-0.5" style={{ color: "#D35400" }}>
                {formatFCFA(costPerSignup)}
              </p>
            </div>
          )}
          {costPerActivation !== undefined && (
            <div>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {t("admin.dashboard.costPerActivation")}
              </p>
              <p className="text-sm font-bold font-syne mt-0.5" style={{ color: "#D35400" }}>
                {formatFCFA(costPerActivation)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
