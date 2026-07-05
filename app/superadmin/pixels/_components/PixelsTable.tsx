"use client";

import PixelStatusBadge from "./PixelStatusBadge";
import { cn, formatRelativeTime } from "./helpers";
import type { PixelRow } from "./types";

export default function PixelsTable({
  filtered,
  totalCount,
  onSelect,
}: {
  filtered: PixelRow[];
  totalCount: number;
  onSelect: (pixel: PixelRow) => void;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/30 border-b border-white/[0.06]">
              <th className="text-left py-3 px-4">Marque</th>
              <th className="text-left py-3 px-3">Pixel</th>
              <th className="text-left py-3 px-3">Statut</th>
              <th className="text-left py-3 px-3 hidden md:table-cell">
                Dernier événement
              </th>
              <th className="text-left py-3 px-3 hidden md:table-cell">
                Conversions
              </th>
              <th className="text-left py-3 px-3 hidden lg:table-cell">
                Tests
              </th>
              <th className="text-right py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition"
                onClick={() => onSelect(p)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(211,84,0,0.12)] flex items-center justify-center text-[12px] font-black text-[#F0997B]">
                      {(
                        p.brand?.company_name?.[0] ||
                        p.brand?.name?.[0] ||
                        "?"
                      ).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">
                        {p.brand?.company_name || p.brand?.name || "—"}
                      </p>
                      <p className="text-[11px] font-mono text-white/30">
                        {p.pixel_id}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="text-[12px] text-white/60">{p.name}</span>
                </td>
                <td className="py-3 px-3">
                  <PixelStatusBadge pixel={p} />
                </td>
                <td className="py-3 px-3 hidden md:table-cell">
                  <div>
                    <p className="text-[12px] text-white/60">
                      {p.last_conversion_at
                        ? formatRelativeTime(p.last_conversion_at)
                        : "Jamais"}
                    </p>
                    {p.last_test_latency_ms && (
                      <p
                        className={cn(
                          "text-[10px] font-mono",
                          p.last_test_latency_ms < 300
                            ? "text-[#5DCAA5]"
                            : p.last_test_latency_ms < 500
                              ? "text-[#F0997B]"
                              : "text-[#F09595]"
                        )}
                      >
                        {p.last_test_latency_ms}ms
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 hidden md:table-cell">
                  <span className="text-[13px] font-bold text-white">
                    {p.total_conversions || 0}
                  </span>
                </td>
                <td className="py-3 px-3 hidden lg:table-cell">
                  <span
                    className={cn(
                      "text-[12px]",
                      p.test_count > 0 ? "text-[#5DCAA5]" : "text-white/30"
                    )}
                  >
                    {p.test_count > 0
                      ? `${p.test_count} test${p.test_count > 1 ? "s" : ""}`
                      : "Non testé"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                    Voir détails →
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-white/20 text-sm"
                >
                  {totalCount === 0
                    ? "Aucun pixel créé"
                    : "Aucun pixel correspondant aux filtres"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
