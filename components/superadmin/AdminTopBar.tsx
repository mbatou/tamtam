"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  lastRefresh?: Date;
  refreshing?: boolean;
}

export default function AdminTopBar({
  title,
  subtitle,
  actions,
  onRefresh,
  lastRefresh,
  refreshing,
}: AdminTopBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-syne font-bold text-xl text-white">
          {title}
        </h1>
        {subtitle && (
          <p
            className="font-dm text-xs mt-0.5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {lastRefresh && (
              <span className="text-[11px] font-dm">
                {lastRefresh.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}
