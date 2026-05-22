"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTranslation } from "@/lib/i18n";

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

export default function ClicksChart({ data }: ClicksChartProps) {
  const { t, locale } = useTranslation();
  const total = data.reduce((s, d) => s + d.valid, 0);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold font-syne text-white">{t("admin.dashboard.clicksOverview")}</h3>
        <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
          {t("admin.dashboard.last14days")}
        </p>
      </div>
      <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
        {total.toLocaleString()} {t("admin.dashboard.totalInPeriod")}
      </p>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={16} barGap={4}>
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
            {data[0]?.fraud !== undefined && (
              <Bar
                dataKey="fraud"
                fill="rgba(255,255,255,0.08)"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
