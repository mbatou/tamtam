"use client";

import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface PixelStat {
  label: string;
  value: number;
  sub: string;
}

interface PixelSummaryProps {
  stats: PixelStat[];
  isActive?: boolean;
}

export default function PixelSummary({ stats, isActive = true }: PixelSummaryProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#0F1A13",
        border: "0.5px solid rgba(29,158,117,0.25)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {isActive && (
            <span
              className="w-2 h-2 rounded-full animate-pixel-pulse"
              style={{ background: "#1D9E75" }}
            />
          )}
          <span className="text-[13px] font-medium text-white font-dm">
            {t("admin.dashboard.pixelLive")}
          </span>
        </div>

        <span
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(29,158,117,0.12)",
            color: "#5DCAA5",
          }}
        >
          <Check size={11} />
          {t("admin.dashboard.trackingActive")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
              {stat.label}
            </p>
            <p className="text-base font-bold font-syne text-white mt-0.5">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "#5DCAA5" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
