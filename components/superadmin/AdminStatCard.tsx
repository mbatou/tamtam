"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "orange" | "teal" | "white" | "red";
  trend?: { value: number; label?: string };
}

const ACCENT_COLORS: Record<string, string> = {
  orange: "#D35400",
  teal: "#1D9E75",
  white: "#FFFFFF",
  red: "#F09595",
};

export default function AdminStatCard({
  label,
  value,
  sub,
  icon,
  accent = "orange",
  trend,
}: AdminStatCardProps) {
  const valueColor = ACCENT_COLORS[accent] || ACCENT_COLORS.orange;
  const trendPositive = trend && trend.value >= 0;

  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-200 group"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "#141420";
        el.style.borderColor = "rgba(211,84,0,0.2)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "#111128";
        el.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      {/* Icon top-right */}
      {icon && (
        <div
          className="absolute top-4 right-4"
          style={{ color: "rgba(255,255,255,0.4)", width: 16, height: 16 }}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <p
        className="font-dm text-xs uppercase tracking-wider mb-2"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        className="font-syne font-extrabold text-2xl leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </p>

      {/* Sub text */}
      {sub && (
        <p
          className="font-dm text-[10px] mt-1"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {sub}
        </p>
      )}

      {/* Trend pill */}
      {trend && (
        <div
          className="inline-flex items-center gap-1 mt-2 rounded-full px-2 py-0.5"
          style={{
            background: trendPositive
              ? "rgba(29,158,117,0.15)"
              : "rgba(226,75,74,0.15)",
            color: trendPositive ? "#5DCAA5" : "#F09595",
          }}
        >
          {trendPositive ? (
            <TrendingUp size={10} />
          ) : (
            <TrendingDown size={10} />
          )}
          <span className="font-dm text-[10px] font-semibold">
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          {trend.label && (
            <span
              className="font-dm text-[10px]"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
