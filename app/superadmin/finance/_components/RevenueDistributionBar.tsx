"use client";

import { formatFCFA } from "@/lib/utils";

export default function RevenueDistributionBar({
  grossRevenue,
  platformCut,
  sentTotal,
  pendingTotal,
}: {
  grossRevenue: number;
  platformCut: number;
  sentTotal: number;
  pendingTotal: number;
}) {
  const echoShare = grossRevenue - platformCut;
  const total = grossRevenue || 1;
  const platformPct = (platformCut / total) * 100;
  const paidPct = (sentTotal / total) * 100;
  const remainingPct = Math.max(0, 100 - platformPct - paidPct);

  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
      <h3 className="font-dm text-sm font-semibold text-white/60 mb-4">Répartition du revenu</h3>
      <div className="flex h-5 rounded-full overflow-hidden mb-3">
        <div style={{ width: `${platformPct}%`, background: "#D35400" }} />
        <div style={{ width: `${paidPct}%`, background: "#1D9E75" }} />
        <div style={{ width: `${remainingPct}%`, background: "rgba(255,255,255,0.08)" }} />
      </div>
      <div className="flex gap-5 font-dm text-xs">
        {[
          { color: "#D35400", label: `Plateforme (${Math.round(platformPct)}%)` },
          { color: "#1D9E75", label: `Versé (${Math.round(paidPct)}%)` },
          { color: "rgba(255,255,255,0.15)", label: `Restant (${Math.round(remainingPct)}%)` },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
        Part Échos : {formatFCFA(echoShare)} · Versé : {formatFCFA(sentTotal)} · En attente : {formatFCFA(pendingTotal)}
      </div>
    </div>
  );
}
