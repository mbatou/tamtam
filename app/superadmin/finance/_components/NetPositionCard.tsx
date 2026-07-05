"use client";

import { formatFCFA } from "@/lib/utils";

export default function NetPositionCard({ platformCut }: { platformCut: number }) {
  const MONTHLY_FIXED_COSTS = 18450;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const proRatedCosts = Math.round((MONTHLY_FIXED_COSTS / daysInMonth) * dayOfMonth);
  const netPosition = platformCut - proRatedCosts;

  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
      <h3 className="font-dm text-sm font-semibold text-white/60 mb-4">Position nette</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="font-dm text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Commission gagnée</div>
          <div className="font-syne font-bold text-xl" style={{ color: "#5DCAA5" }}>{formatFCFA(platformCut)}</div>
        </div>
        <div>
          <div className="font-dm text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Coûts fixes estimés</div>
          <div className="font-syne font-bold text-xl" style={{ color: "#F09595" }}>{formatFCFA(proRatedCosts)}</div>
          <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>~{formatFCFA(MONTHLY_FIXED_COSTS)}/mois</div>
        </div>
        <div>
          <div className="font-dm text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Position nette</div>
          <div className="font-syne font-bold text-xl" style={{ color: netPosition >= 0 ? "#5DCAA5" : "#F09595" }}>
            {netPosition >= 0 ? "+" : ""}{formatFCFA(netPosition)}
          </div>
        </div>
      </div>
    </div>
  );
}
