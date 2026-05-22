"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useTranslation } from "@/lib/i18n";

interface ChartDataPoint {
  date: string;
  valid: number;
  fraud?: number;
}

interface ClicksChartProps {
  data: ChartDataPoint[];
}

function formatShortDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" });
}

export default function ClicksChart({ data }: ClicksChartProps) {
  const { t, locale } = useTranslation();
  const maxVal = Math.max(...data.map(d => d.valid));

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("admin.dashboard.dailyClicks")}
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {t("admin.dashboard.last14days")}
        </p>
      </div>

      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={12}>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatShortDate(v, locale)}
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.85)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 11,
                padding: "6px 10px",
              }}
              labelFormatter={(v) => formatShortDate(String(v), locale)}
              formatter={(value) => [String(value), t("admin.dashboard.realClicks")]}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="valid" radius={[3, 3, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill="#D35400"
                  fillOpacity={entry.valid === maxVal ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
