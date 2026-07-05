"use client";

import { CheckCircle } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { cn, formatRelativeTime } from "./helpers";
import type { ConversionEvent } from "./types";

export default function PixelConversionsView({
  events,
  errors,
  latencyData,
  loading,
}: {
  events: ConversionEvent[];
  errors: ConversionEvent[];
  latencyData: { time: string; latency: number }[];
  loading: boolean;
}) {
  return (
    <>
      {/* Latency chart */}
      <div className="bg-[#111128] rounded-[12px] p-4">
        <p className="text-[12px] font-medium text-white/50 mb-3">
          Latence (24h)
        </p>
        {latencyData.length === 0 ? (
          <p className="text-[11px] text-white/25 text-center py-4">
            Aucune donnée de latence disponible
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={latencyData}>
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#D35400"
                  strokeWidth={1.5}
                  dot={false}
                />
                <ReferenceLine
                  y={300}
                  stroke="rgba(255,255,255,0.1)"
                  strokeDasharray="4 4"
                />
                <Tooltip
                  contentStyle={{
                    background: "#111128",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v) => [`${v}ms`, "Latence"]}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[10px] text-white/20 mt-1">
              <span>0ms</span>
              <span className="text-white/30">--- 300ms (seuil)</span>
              <span>max</span>
            </div>
          </>
        )}
      </div>

      {/* Recent events */}
      <div className="bg-[#111128] rounded-[12px] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-medium text-white/50">
            Événements récents
          </p>
          <span className="text-[10px] text-white/25">20 derniers</span>
        </div>
        {loading ? (
          <p className="text-[11px] text-white/25 text-center py-3">
            Chargement...
          </p>
        ) : events.length === 0 ? (
          <p className="text-[11px] text-white/25 text-center py-3">
            Aucun événement enregistré
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    ev.event === "test"
                      ? "bg-[#D35400]"
                      : ev.event === "error"
                        ? "bg-[#E24B4A]"
                        : "bg-[#1D9E75]"
                  )}
                />
                <span className="font-mono text-[11px] text-white/60 flex-shrink-0">
                  {ev.event}
                </span>
                {ev.tm_ref && (
                  <span className="font-mono text-[10px] text-white/25 truncate flex-1">
                    {ev.tm_ref}
                  </span>
                )}
                {ev.value_amount != null && (
                  <span className="font-mono text-[10px] text-[#5DCAA5] flex-shrink-0">
                    {ev.value_amount} XOF
                  </span>
                )}
                <span className="text-[10px] text-white/20 flex-shrink-0">
                  {formatRelativeTime(ev.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error log */}
      {!loading &&
        (errors.length === 0 ? (
          <div className="bg-[rgba(29,158,117,0.05)] border border-[rgba(29,158,117,0.15)] rounded-[12px] p-4 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-[#1D9E75] flex-shrink-0" />
            <p className="text-[12px] text-[#5DCAA5]">
              Aucune erreur récente — Pixel en bonne santé
            </p>
          </div>
        ) : (
          <div className="bg-[rgba(226,75,74,0.05)] border border-[rgba(226,75,74,0.15)] rounded-[12px] p-4">
            <p className="text-[12px] font-medium text-[#F09595] mb-3">
              Erreurs récentes ({errors.length})
            </p>
            <div className="flex flex-col gap-2">
              {errors.map((err) => (
                <div
                  key={err.id}
                  className="bg-[rgba(226,75,74,0.08)] rounded-[8px] p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-[#F09595]">
                      {err.event_name || err.event}
                    </span>
                    <span className="text-[10px] text-white/25">
                      {formatRelativeTime(err.created_at)}
                    </span>
                  </div>
                  {err.metadata &&
                    typeof err.metadata === "object" &&
                    "error" in err.metadata && (
                      <p className="text-[11px] text-white/40 font-mono leading-relaxed">
                        {String(
                          (err.metadata as Record<string, unknown>).error
                        )}
                      </p>
                    )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </>
  );
}
