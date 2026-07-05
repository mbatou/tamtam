"use client";

import { Zap, CheckCircle, Activity, Clock } from "lucide-react";
import type { Stats } from "./types";

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    teal: "#5DCAA5",
    orange: "#D35400",
    white: "rgba(255,255,255,0.7)",
    red: "#F09595",
  };
  const c = colorMap[color] || color;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: c }}>{icon}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold font-syne" style={{ color: c }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-white/25 mt-1">{sub}</p>}
    </div>
  );
}

export default function PixelStatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Pixels actifs"
        value={`${stats.activePixels}/${stats.totalPixels}`}
        color="teal"
        icon={<Zap size={16} />}
      />
      <StatCard
        label="Pixels testés"
        value={stats.testedPixels}
        sub={
          stats.totalPixels - stats.testedPixels > 0
            ? `${stats.totalPixels - stats.testedPixels} non testés`
            : undefined
        }
        color={stats.testedPixels === stats.totalPixels ? "teal" : "orange"}
        icon={<CheckCircle size={16} />}
      />
      <StatCard
        label="Événements aujourd'hui"
        value={stats.eventsToday.toLocaleString("fr-FR")}
        color="white"
        icon={<Activity size={16} />}
      />
      <StatCard
        label="Latence moyenne"
        value={stats.avgLatency > 0 ? `${stats.avgLatency}ms` : "—"}
        color={
          stats.avgLatency === 0
            ? "white"
            : stats.avgLatency < 300
              ? "teal"
              : stats.avgLatency < 500
                ? "orange"
                : "red"
        }
        icon={<Clock size={16} />}
      />
    </div>
  );
}
