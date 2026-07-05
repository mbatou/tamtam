"use client";

import { useTranslation } from "@/lib/i18n";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PerfData } from "./types";

export default function PerformanceSection({ perf, perfLoading }: { perf: PerfData | null; perfLoading: boolean }) {
  const { t } = useTranslation();

  return (
    <>
      {/* Performance Overview — skeleton while loading */}
      {perfLoading && (
        <div className="space-y-4 mb-8 animate-pulse">
          {/* Metrics skeleton */}
          <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <div className="h-5 w-32 bg-white/10 rounded mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-white/10 rounded mb-2" />
                  <div className="h-7 w-16 bg-white/10 rounded mb-1" />
                  <div className="h-2 w-24 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          </div>
          {/* Chart skeleton */}
          <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <div className="h-5 w-40 bg-white/10 rounded mb-4" />
            <div className="flex items-end gap-1 h-48">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t"
                  style={{ height: `${25 + (i % 3) * 20 + (i % 5) * 8}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {perf && (
        <div className="space-y-4 mb-8">
          {/* Summary metrics */}
          <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold font-syne text-white text-lg mb-4">{t("admin.campaigns.performance")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.totalReach")}</p>
                <p className="text-2xl font-bold font-syne text-white">{perf.totalClicks.toLocaleString()}</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.campaigns.totalReachSub")}</p>
              </div>
              <div>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.realVisitors")}</p>
                <p className="text-2xl font-bold font-syne" style={{ color: "#D35400" }}>{perf.validClicks.toLocaleString()}</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.campaigns.verifiedClicks")}</p>
              </div>
              <div>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.costPerVisitor")}</p>
                <p className="text-2xl font-bold font-syne text-white">{perf.costPerVisitor} FCFA</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.campaigns.perVerifiedClick")}</p>
              </div>
              <div>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.activeEchos")}</p>
                <p className="text-2xl font-bold font-syne text-white">{perf.activeEchos}</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.campaigns.sharingYourLink")}</p>
              </div>
            </div>
          </div>

          {/* Performance chart */}
          <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold font-syne text-white mb-4">{t("admin.campaigns.clicksPerDay")}</h3>
            {perf.chartData && perf.chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={perf.chartData}>
                    <defs>
                      <linearGradient id="validGradientPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1ABC9C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1ABC9C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#666", fontSize: 12 }}
                      tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    />
                    <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#1A1A2E", border: "1px solid #333", borderRadius: 8 }}
                      labelFormatter={(d) => new Date(String(d)).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                      formatter={(value, name) => [value, name === "valid" ? t("admin.campaigns.realVisitorsLabel") : t("admin.campaigns.total")]}
                    />
                    <Area type="monotone" dataKey="valid" stroke="#1ABC9C" fill="url(#validGradientPerf)" strokeWidth={2} />
                    <Area type="monotone" dataKey="fraud" stroke="#444" fill="none" strokeWidth={1} strokeDasharray="4 4" name="total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-white/30">
                {t("admin.campaigns.noDataYet")}
              </div>
            )}
          </div>

          {/* Two-column: Top Échos + Geographic breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Échos leaderboard */}
            <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-bold font-syne text-white mb-4">{t("admin.campaigns.topEchos")}</h3>
              {perf.topEchos.length > 0 ? (
                <div className="space-y-3">
                  {perf.topEchos.map((echo, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `#${i + 1}`}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{echo.name}</p>
                          <p className="text-xs text-white/30">{echo.city}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: "#D35400" }}>{echo.clicks} {t("common.clicks")}</p>
                        <p className="text-xs text-white/30">{echo.earnings.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-white/30 text-sm">
                  {t("admin.campaigns.noEchoClicks")}
                </p>
              )}
            </div>

            {/* Geographic breakdown */}
            <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-bold font-syne text-white mb-4">{t("admin.campaigns.geoBreakdown")}</h3>
              {perf.geoBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {perf.geoBreakdown.map((geo, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{geo.city}</span>
                        <span className="text-sm text-white/40">{geo.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: "#D35400", width: `${geo.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-white/30 text-sm">
                  {t("admin.campaigns.geoComingSoon")}
                </p>
              )}
            </div>
          </div>

          {/* ROI comparison */}
          <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold font-syne text-white mb-3">{t("admin.campaigns.roi")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[10px] font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Facebook Ads</p>
                <p className="font-bold font-syne text-white text-sm">200-500 FCFA/clic</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[10px] font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Instagram Ads</p>
                <p className="font-bold font-syne text-white text-sm">300-800 FCFA/clic</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.2)" }}>
                <p className="text-[10px] font-dm mb-1" style={{ color: "#1D9E75" }}>Tamtam</p>
                <p className="font-bold font-syne text-sm" style={{ color: "#1D9E75" }}>{perf.costPerVisitor} FCFA/clic</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(29,158,117,0.6)" }}>
                  {perf.costPerVisitor < 200
                    ? t("admin.campaigns.percentCheaper", { pct: String(Math.round((1 - perf.costPerVisitor / 350) * 100)) })
                    : t("admin.campaigns.competitive")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
