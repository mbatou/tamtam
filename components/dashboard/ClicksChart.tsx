"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTranslation } from "@/lib/i18n";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ChartDataPoint {
  date: string;
  valid: number;
  fraud?: number;
}

interface ClicksChartProps {
  data: ChartDataPoint[];
}

function formatDay(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { weekday: "short" });
}

function formatFullDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

function computeTrend(data: ChartDataPoint[]): { pct: number; direction: "up" | "down" | "flat" } {
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.valid, 0);
  const secondHalf = data.slice(mid).reduce((s, d) => s + d.valid, 0);
  if (firstHalf === 0 && secondHalf === 0) return { pct: 0, direction: "flat" };
  if (firstHalf === 0) return { pct: 100, direction: "up" };
  const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

export default function ClicksChart({ data }: ClicksChartProps) {
  const { t, locale } = useTranslation();
  const total = data.reduce((s, d) => s + d.valid, 0);
  const trend = computeTrend(data);

  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend.direction === "up" ? "#1D9E75" : trend.direction === "down" ? "#EF4444" : "rgba(255,255,255,0.4)";

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold font-syne text-white">{t("admin.dashboard.clicksOverview")}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold font-syne text-white">{total.toLocaleString()}</span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.dashboard.totalInPeriod")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {trend.pct > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: `${trendColor}15` }}>
              <TrendIcon size={12} style={{ color: trendColor }} />
              <span className="text-[11px] font-semibold" style={{ color: trendColor }}>
                {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}{trend.pct}%
              </span>
            </div>
          )}
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
            {t("admin.dashboard.last14days")}
          </span>
        </div>
      </div>

      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={14} barGap={2}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatDay(v, locale)}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "#1A1A3E",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                fontSize: 12,
                padding: "8px 12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
              labelFormatter={(v) => formatFullDate(String(v), locale)}
              formatter={(value) => [String(value), t("admin.dashboard.realClicks")]}
              cursor={{ fill: "rgba(255,255,255,0.02)", radius: 4 }}
            />
            <Bar
              dataKey="valid"
              fill="#D35400"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
