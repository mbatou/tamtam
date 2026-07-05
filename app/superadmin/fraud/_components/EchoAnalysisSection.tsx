"use client";

import Pagination, { paginate } from "@/components/ui/Pagination";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { AlertTriangle } from "lucide-react";
import { EchoAnalysis } from "./types";

export default function EchoAnalysisSection({
  echoAnalysis,
  page,
  onPageChange,
  pageSize,
  onFlagEcho,
}: {
  echoAnalysis: EchoAnalysis[];
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onFlagEcho: (echoId: string, riskLevel: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
              <th className="pb-3 font-semibold">Écho</th>
              <th className="pb-3 font-semibold">Clics</th>
              <th className="pb-3 font-semibold">Valides</th>
              <th className="pb-3 font-semibold">Taux valide</th>
              <th className="pb-3 font-semibold hidden md:table-cell">IPs suspectes</th>
              <th className="pb-3 font-semibold">Risque</th>
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginate(echoAnalysis, page, pageSize).map((echo) => (
              <tr key={echo.echo_id} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                <td className="py-3">
                  <div>
                    <span className="text-sm font-dm font-semibold">{echo.name}</span>
                    {echo.phone && <span className="text-xs font-dm text-white/30 ml-2">{echo.phone}</span>}
                  </div>
                  <span className="text-xs font-dm text-white/30">{echo.links_created} liens</span>
                </td>
                <td className="py-3 text-xs font-dm">{echo.total_clicks}</td>
                <td className="py-3 text-xs font-dm">{echo.valid_clicks}</td>
                <td className="py-3">
                  <span className={`text-sm font-syne font-bold ${
                    echo.valid_rate_pct < 30 ? "text-red-400" :
                    echo.valid_rate_pct < 50 ? "text-yellow-400" :
                    "text-emerald-400"
                  }`}>
                    {echo.valid_rate_pct}%
                  </span>
                </td>
                <td className="py-3 text-xs font-dm hidden md:table-cell">
                  {echo.suspicious_repeat_ips > 0 ? (
                    <span className="text-yellow-400">{echo.suspicious_repeat_ips}</span>
                  ) : (
                    <span className="text-white/20">0</span>
                  )}
                </td>
                <td className="py-3">
                  <AdminBadge
                    status={
                      echo.risk_level === "high_fraud_risk" ? "fraud" :
                      echo.risk_level === "moderate_risk" ? "suspended" :
                      "active"
                    }
                    label={
                      echo.risk_level === "high_fraud_risk" ? "Risque élevé" :
                      echo.risk_level === "moderate_risk" ? "Modéré" :
                      "OK"
                    }
                    size="sm"
                  />
                </td>
                <td className="py-3">
                  {echo.risk_level !== "clean" && (
                    <button
                      onClick={() => onFlagEcho(echo.echo_id, "high")}
                      className="text-xs font-dm text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                    >
                      <AlertTriangle size={12} />
                      Signaler
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalItems={echoAnalysis.length} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
