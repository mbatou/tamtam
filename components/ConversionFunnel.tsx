"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";

interface FunnelData {
  clicks: number;
  installs: number;
  signups: number;
  activations: number;
  subscriptions: number;
  purchases: number;
  leads: number;
  custom: number;
}

interface ConversionFunnelProps {
  funnel: FunnelData;
  rates: Record<string, number>;
  animated?: boolean;
}

const STAGE_CONFIG = [
  { key: "clicks", label: "Clics vérifiés", color: "#FFFFFF" },
  { key: "installs", label: "Installations", color: "#D35400" },
  { key: "signups", label: "Inscriptions", color: "#E67E22" },
  { key: "activations", label: "Activations", color: "#F39C12" },
  { key: "subscriptions", label: "Souscriptions", color: "#1ABC9C" },
  { key: "purchases", label: "Achats", color: "#1ABC9C" },
  { key: "leads", label: "Leads", color: "#1ABC9C" },
  { key: "custom", label: "Custom", color: "#8E44AD" },
] as const;

const RATE_MAP: Record<string, string> = {
  "clicks→installs": "click_to_install",
  "installs→signups": "install_to_signup",
  "signups→activations": "signup_to_activation",
  "activations→subscriptions": "activation_to_subscription",
  "signups→subscriptions": "signup_to_subscription",
  "subscriptions→purchases": "subscription_to_purchase",
};

export default function ConversionFunnel({ funnel, rates, animated = true }: ConversionFunnelProps) {
  const [mounted, setMounted] = useState(!animated);

  useEffect(() => {
    if (animated) {
      const t = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(t);
    }
  }, [animated]);

  const stages = STAGE_CONFIG
    .map((s) => ({
      ...s,
      count: funnel[s.key as keyof FunnelData] || 0,
    }))
    .filter((s) => s.count > 0);

  if (stages.length === 0) {
    return null;
  }

  const maxCount = stages[0].count || 1;

  return (
    <div className="space-y-1">
      {stages.map((stage, i) => {
        const pct = (stage.count / maxCount) * 100;
        const globalPct = stages[0].count > 0 ? (stage.count / stages[0].count) * 100 : 0;
        const prevKey = i > 0 ? stages[i - 1].key : null;
        const rateKey = prevKey ? `${prevKey}→${stage.key}` : null;
        const rate = rateKey ? rates[RATE_MAP[rateKey]] : null;

        return (
          <div key={stage.key}>
            {/* Conversion rate arrow between stages */}
            {i > 0 && (
              <div className="flex items-center gap-2 py-1.5 pl-4">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
                <span className="text-[11px] text-white/30">
                  {rate ? `${rate}% convertis` : `${globalPct.toFixed(1)}% du total`}
                </span>
              </div>
            )}

            {/* Bar row */}
            <div className="flex items-center gap-3">
              <div className="w-28 md:w-36 shrink-0 text-right">
                <span className="text-xs font-semibold text-white/60">{stage.label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-700 ease-out"
                    style={{
                      width: mounted ? `${Math.max(pct, 2)}%` : "0%",
                      backgroundColor: stage.color,
                      opacity: stage.key === "clicks" ? 0.2 : 0.8,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-3 justify-between">
                    <span className="text-xs font-black text-white">
                      {stage.count.toLocaleString("fr-FR")}
                    </span>
                    {i > 0 && (
                      <span className="text-[10px] font-semibold text-white/50">
                        {globalPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CostCardsProps {
  costs: Record<string, number>;
  revenue: { total_value: number; currency: string; roas: number };
}

export function CostCards({ costs, revenue }: CostCardsProps) {
  const cards: { label: string; value: string; sub: string; color: string }[] = [];

  if (costs.cpc) cards.push({ label: "CPC", value: formatFCFA(costs.cpc), sub: "Coût par clic", color: "text-primary" });
  if (costs.cpi) cards.push({ label: "CPI", value: formatFCFA(costs.cpi), sub: "Coût par installation", color: "text-accent" });
  if (costs.cpa_signup) cards.push({ label: "CPA Inscription", value: formatFCFA(costs.cpa_signup), sub: "Coût par inscription", color: "text-accent" });
  if (costs.cpa_activation) cards.push({ label: "CPA Activation", value: formatFCFA(costs.cpa_activation), sub: "Coût par activation", color: "text-accent" });
  if (costs.cpa_subscription) cards.push({ label: "CPA Souscription", value: formatFCFA(costs.cpa_subscription), sub: "Coût par souscription", color: "text-accent" });
  if (costs.cpa_purchase) cards.push({ label: "CPA Achat", value: formatFCFA(costs.cpa_purchase), sub: "Coût par achat", color: "text-accent" });
  if (costs.cpl) cards.push({ label: "CPL", value: formatFCFA(costs.cpl), sub: "Coût par lead", color: "text-accent" });

  cards.push({
    label: "ROAS",
    value: `${revenue.roas}x`,
    sub: revenue.total_value > 0 ? `${formatFCFA(revenue.total_value)} revenus` : "Aucun revenu encore",
    color: revenue.roas >= 1 ? "text-emerald-400" : revenue.roas > 0 ? "text-yellow-400" : "text-white/50",
  });

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{card.label}</p>
          <p className={`text-lg font-black mt-1 ${card.color}`}>{card.value}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

interface AttributionBreakdownProps {
  attribution: { direct: number; unattributed: number; total: number };
}

export function AttributionBreakdown({ attribution }: AttributionBreakdownProps) {
  if (attribution.total === 0) return null;

  const directPct = attribution.total > 0 ? Math.round((attribution.direct / attribution.total) * 1000) / 10 : 0;
  const unattributedPct = attribution.total > 0 ? Math.round((attribution.unattributed / attribution.total) * 1000) / 10 : 0;

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
      <h4 className="text-xs font-bold text-white/40 mb-3">ATTRIBUTION</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-white/70 flex-1">Direct</span>
          <span className="text-sm font-bold">{attribution.direct}</span>
          <span className="text-xs text-white/30 w-14 text-right">{directPct}%</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span className="text-sm text-white/70 flex-1">Non attribué</span>
          <span className="text-sm font-bold">{attribution.unattributed}</span>
          <span className="text-xs text-white/30 w-14 text-right">{unattributedPct}%</span>
        </div>
      </div>
      {/* Mini bar */}
      <div className="h-2 rounded-full overflow-hidden mt-3 bg-white/5 flex">
        {directPct > 0 && (
          <div className="h-full bg-emerald-400" style={{ width: `${directPct}%` }} />
        )}
      </div>
    </div>
  );
}
