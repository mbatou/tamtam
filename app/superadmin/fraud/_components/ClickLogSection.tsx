"use client";

import Pagination, { paginate } from "@/components/ui/Pagination";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { ClickRow, REJECTION_LABELS } from "./types";

export default function ClickLogSection({
  recentClicks,
  filteredClicks,
  filter,
  onFilterChange,
  page,
  onPageChange,
  pageSize,
  onToggleValidity,
}: {
  recentClicks: ClickRow[];
  filteredClicks: ClickRow[];
  filter: string;
  onFilterChange: (filter: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onToggleValidity: (clickId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {([
          { key: "all", label: "Tous", count: recentClicks.length },
          { key: "suspects", label: "Suspects", count: recentClicks.filter((c) => !c.is_valid).length },
          { key: "valid", label: "Valides", count: recentClicks.filter((c) => c.is_valid).length },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold transition flex items-center gap-1.5 ${
              filter === f.key
                ? "bg-[#D35400] text-white"
                : "bg-[#111128] border border-white/[0.07] text-white/40 hover:bg-[#141420]"
            }`}
          >
            {f.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              filter === f.key ? "bg-white/20" : "bg-white/10"
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold">IP</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Raison</th>
              <th className="pb-3 font-semibold">Écho</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Campagne</th>
              <th className="pb-3 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {paginate(filteredClicks, page, pageSize).map((click) => (
              <tr key={click.id} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                <td className="py-3 text-xs font-dm text-white/50">
                  {new Date(click.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="py-3 font-mono text-xs">{click.ip_address || "—"}</td>
                <td className="py-3 text-xs font-dm text-white/40 hidden lg:table-cell">
                  {click.rejection_reason ? (REJECTION_LABELS[click.rejection_reason]?.label || click.rejection_reason) : "—"}
                </td>
                <td className="py-3 text-xs font-dm">{click.tracked_links?.users?.name || "—"}</td>
                <td className="py-3 text-xs font-dm hidden md:table-cell">{click.tracked_links?.campaigns?.title || "—"}</td>
                <td className="py-3">
                  <button onClick={() => onToggleValidity(click.id)}>
                    <AdminBadge
                      status={click.is_valid ? "active" : "fraud"}
                      label={click.is_valid ? "Valide" : "Rejeté"}
                      size="sm"
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalItems={filteredClicks.length} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
