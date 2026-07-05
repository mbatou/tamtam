"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import PixelStatusBadge from "./PixelStatusBadge";
import PixelConversionsView from "./PixelConversionsView";
import PixelSupportActions from "./PixelSupportActions";
import type { ConversionEvent, PixelRow } from "./types";

export default function PixelDetailPanel({
  pixel,
  onClose,
}: {
  pixel: PixelRow;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [errors, setErrors] = useState<ConversionEvent[]>([]);
  const [latencyData, setLatencyData] = useState<
    { time: string; latency: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/superadmin/pixels?pixelId=${pixel.pixel_id}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.recentEvents || []);
        setErrors(d.errorEvents || []);
        const ld = (d.latencyData || [])
          .filter(
            (e: { metadata?: { latency_ms?: number } }) =>
              e.metadata?.latency_ms
          )
          .map(
            (e: {
              created_at: string;
              metadata: { latency_ms: number };
            }) => ({
              time:
                new Date(e.created_at).getHours() +
                ":" +
                String(new Date(e.created_at).getMinutes()).padStart(2, "0"),
              latency: e.metadata.latency_ms,
            })
          );
        setLatencyData(ld);
      })
      .catch((err) => console.error("[pixels] pixel detail", err))
      .finally(() => setLoading(false));
  }, [pixel.pixel_id]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
        <div>
          <p className="text-[15px] font-bold text-white">
            {pixel.brand?.company_name || pixel.brand?.name || "—"}
          </p>
          <p className="text-[11px] font-mono text-white/30 mt-0.5">
            {pixel.pixel_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelStatusBadge pixel={pixel} />
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Conversions",
              value: pixel.total_conversions || 0,
              color: "#D35400",
            },
            {
              label: "Tests",
              value: pixel.test_count || 0,
              color: "#5DCAA5",
            },
            {
              label: "Latence",
              value: pixel.last_test_latency_ms
                ? `${pixel.last_test_latency_ms}ms`
                : "—",
              color: "#fff",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#111128] rounded-[10px] p-3 text-center"
            >
              <p
                className="text-[18px] font-black"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <PixelConversionsView
          events={events}
          errors={errors}
          latencyData={latencyData}
          loading={loading}
        />

        <PixelSupportActions pixel={pixel} />
      </div>
    </div>
  );
}
