"use client";

import { formatFCFA } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DailyRevenue } from "./types";

const tooltipStyle = {
  background: "#111128",
  border: "0.5px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
  color: "#fff",
};

export default function DailyRevenueChart({ dailyRevenue }: { dailyRevenue: DailyRevenue[] }) {
  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
      <h3 className="font-dm text-sm font-semibold text-white/60 mb-4">Revenu quotidien</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dailyRevenue}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(v) => new Date(String(v)).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            formatter={(value) => [formatFCFA(Number(value)), "Commission"]}
          />
          <Bar dataKey="revenue" name="Commission" fill="#D35400" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
