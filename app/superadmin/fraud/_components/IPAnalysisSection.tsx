"use client";

import Pagination, { paginate } from "@/components/ui/Pagination";
import { Eye, Ban, Wifi } from "lucide-react";
import { BlockedIP, IPAnalysis, IpSortKey, RISK_STYLES, formatTimeSpan } from "./types";

export interface IPAnalysisActions {
  onBulkBlockBots: () => void;
  onViewDetails: (ip: string) => void;
  onBlockIP: (ip: string) => void;
}

export default function IPAnalysisSection({
  sortedIPs,
  totalIPs,
  botCount,
  carrierCount,
  blockedIPs,
  sort,
  onSortChange,
  page,
  onPageChange,
  pageSize,
  actions,
}: {
  sortedIPs: IPAnalysis[];
  totalIPs: number;
  botCount: number;
  carrierCount: number;
  blockedIPs: BlockedIP[];
  sort: IpSortKey;
  onSortChange: (sort: IpSortKey) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  actions: IPAnalysisActions;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-dm text-white/50">{totalIPs} IPs analysées</span>
        <span className="text-sm font-dm text-red-400">{botCount} bots</span>
        <span className="text-sm font-dm text-blue-400">{carrierCount} IPs opérateur</span>
        {botCount > 0 && (
          <button
            onClick={actions.onBulkBlockBots}
            className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-dm font-bold hover:bg-red-500/30 transition flex items-center gap-1.5"
          >
            <Ban size={12} />
            Bloquer tous les bots ({botCount})
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {([
          { key: "total_clicks" as const, label: "Clics" },
          { key: "valid_clicks" as const, label: "Valides" },
          { key: "active_days" as const, label: "Jours actifs" },
        ]).map((s) => (
          <button
            key={s.key}
            onClick={() => onSortChange(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold transition ${
              sort === s.key ? "bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/30" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
              <th className="pb-3 font-semibold">Adresse IP</th>
              <th className="pb-3 font-semibold">Clics</th>
              <th className="pb-3 font-semibold">Valides</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Opérateur</th>
              <th className="pb-3 font-semibold">Risque</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Durée</th>
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginate(sortedIPs, page, pageSize).map((ip) => (
              <tr key={ip.ip_address} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                <td className="py-3 font-mono text-xs">{ip.ip_address}</td>
                <td className="py-3 text-xs font-dm">{ip.total_clicks}</td>
                <td className="py-3 text-xs font-dm">{ip.valid_clicks}</td>
                <td className="py-3 text-xs font-dm hidden md:table-cell">
                  {ip.is_carrier_ip ? (
                    <span className="flex items-center gap-1"><Wifi size={12} className="text-blue-400" /> {ip.carrier}</span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="py-3">
                  <span className={`text-xs font-dm font-bold ${RISK_STYLES[ip.risk_assessment]?.color || "text-white/40"}`}>
                    {RISK_STYLES[ip.risk_assessment]?.label || ip.risk_assessment}
                  </span>
                </td>
                <td className="py-3 text-xs font-dm text-white/40 hidden lg:table-cell">
                  {formatTimeSpan(ip.time_span_seconds)}
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => actions.onViewDetails(ip.ip_address)}
                      className="text-xs font-dm text-[#1D9E75] hover:text-[#1D9E75]/80 font-semibold flex items-center gap-1"
                    >
                      <Eye size={12} />
                      Détails
                    </button>
                    {ip.is_carrier_ip ? (
                      <span className="text-xs font-dm text-[#D35400]/70 font-semibold">Protégé</span>
                    ) : (
                      !blockedIPs.some((b) => b.ip_address === ip.ip_address) && (
                        <button
                          onClick={() => actions.onBlockIP(ip.ip_address)}
                          className="text-xs font-dm text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                        >
                          <Ban size={12} />
                          Bloquer
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalItems={sortedIPs.length} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
