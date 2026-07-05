"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, type Campaign, type SpendingPoint } from "./types";

export default function SpendingTab({
  spendingData,
  campaigns,
}: {
  spendingData: SpendingPoint[];
  campaigns: Campaign[];
}) {
  const { t } = useTranslation();

  function getStatusStyle(status: string) {
    switch (status) {
      case "active": return { dot: "#D35400", color: "#D35400", bg: "rgba(211,84,0,0.1)" };
      case "paused": return { dot: "#EAB308", color: "#EAB308", bg: "rgba(234,179,8,0.1)" };
      case "completed": return { dot: "#1D9E75", color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
      case "rejected": return { dot: "#EF4444", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
      default: return { dot: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
    }
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = { active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected") };
    return map[status] || status;
  }

  return (
    <>
      {spendingData.some(d => d.amount > 0) && (
        <div className="rounded-2xl p-5 mb-5" style={C}>
          <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.wallet.spendingLast30")}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendingData} barCategoryGap="15%">
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D35400" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#D35400" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ background: "#0A0A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11 }} formatter={(value) => [formatFCFA(Number(value))]} labelFormatter={(v) => String(v)} />
              <Bar dataKey="amount" fill="url(#sg)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={C}>
        <div className="px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-bold font-syne text-white">{t("admin.wallet.spendByCampaign")}</h3>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.noCampaign")}</p>
          </div>
        ) : campaigns.map((c) => {
          const ss = getStatusStyle(c.status);
          const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
          return (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ss.bg }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ss.dot }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white font-dm truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                    {getStatusLabel(c.status)}
                  </span>
                  <span className="text-[9px] font-dm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {new Date(c.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-syne" style={{ color: pct >= 100 ? "#1D9E75" : "rgba(255,255,255,0.8)" }}>
                  {formatFCFA(Math.min(c.spent, c.budget))}
                </p>
                <div className="flex items-center gap-1.5 justify-end mt-1">
                  <div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#1D9E75" : "#D35400" }} />
                  </div>
                  <span className="text-[9px] font-dm" style={{ color: "rgba(255,255,255,0.3)" }}>{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
