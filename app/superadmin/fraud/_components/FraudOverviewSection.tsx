"use client";

import { formatNumber } from "@/lib/utils";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import {
  CheckCircle2, XCircle, TrendingDown, DollarSign,
  RotateCcw, AlertTriangle, Wifi, Bot,
} from "lucide-react";
import { FraudData, IPAnalysis, REJECTION_LABELS, formatTimeSpan } from "./types";

export default function FraudOverviewSection({
  data,
  actualFraudRate,
  breakdownEntries,
  botIPs,
  carrierIPs,
  onUnblockIP,
}: {
  data: FraudData;
  actualFraudRate: string;
  breakdownEntries: [string, number][];
  botIPs: IPAnalysis[];
  carrierIPs: IPAnalysis[];
  onUnblockIP: (ip: string) => void;
}) {
  const totalRejected = data.flaggedClicks;

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Clics valides" value={formatNumber(data.validClicks)} icon={<CheckCircle2 size={18} />} accent="teal" />
        <AdminStatCard label="Rejetés" value={formatNumber(data.flaggedClicks)} icon={<XCircle size={18} />} accent="red" />
        <AdminStatCard
          label="Taux de rejet"
          value={`${data.rejectionRate}%`}
          sub={`Fraude réelle: ~${actualFraudRate}%`}
          icon={<TrendingDown size={18} />}
          accent={data.rejectionRate > 30 ? "red" : "orange"}
        />
        <AdminStatCard label="Revenus protégés" value={formatNumber(data.revenueSaved) + " F"} icon={<DollarSign size={18} />} accent="teal" />
      </div>

      {/* Rejection Breakdown */}
      {breakdownEntries.length > 0 && (
        <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-lg font-syne font-bold mb-4">Répartition des rejets</h2>
          <div className="space-y-3">
            {breakdownEntries.map(([reason, count]) => {
              const info = REJECTION_LABELS[reason] || { label: reason, isFraud: false };
              const pct = totalRejected > 0 ? ((count / totalRejected) * 100).toFixed(0) : "0";
              return (
                <div key={reason} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-dm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${info.isFraud ? "bg-red-400" : "bg-blue-400"}`} />
                        {info.label}
                        {info.isFraud && <span className="text-[10px] text-red-400 font-dm font-bold uppercase">fraude</span>}
                      </span>
                      <span className="text-xs font-dm text-white/50">{formatNumber(count)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${info.isFraud ? "bg-red-400/60" : "bg-blue-400/40"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.05] flex gap-6 text-xs font-dm text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Dédup / throttling (légitime)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Fraude réelle (bots)
            </span>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
        <h2 className="text-lg font-syne font-bold mb-4">Alertes récentes</h2>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {botIPs.length > 0 && botIPs.slice(0, 5).map((ip) => (
            <div key={ip.ip_address} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <Bot size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-dm">
                <span className="font-mono text-xs">{ip.ip_address}</span>
                {" — "}{ip.total_clicks} clics en {formatTimeSpan(ip.time_span_seconds)}
                <span className="text-red-400 text-xs ml-2">[Bot détecté]</span>
              </div>
            </div>
          ))}
          {data.echoAnalysis
            .filter((e) => e.risk_level === "high_fraud_risk")
            .slice(0, 3)
            .map((echo) => (
              <div key={echo.echo_id} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm font-dm">
                  Écho <span className="font-bold">{echo.name}</span> — taux valide: {echo.valid_rate_pct}%
                  <span className="text-yellow-400 text-xs ml-2">[Vérification recommandée]</span>
                </div>
              </div>
            ))}
          {carrierIPs.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <Wifi size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-dm">
                {carrierIPs.length} IPs opérateur détectées — protégées contre le blocage
                <span className="text-blue-400 text-xs ml-2">[CGNAT Sénégal]</span>
              </div>
            </div>
          )}
          {botIPs.length === 0 && data.echoAnalysis.filter((e) => e.risk_level === "high_fraud_risk").length === 0 && (
            <p className="text-sm font-dm text-white/30">Aucune alerte active</p>
          )}
        </div>
      </div>

      {/* Blocked IPs */}
      {data.blockedIPs.length > 0 && (
        <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-lg font-syne font-bold mb-4">IPs bloquées ({data.blockedIPs.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
                  <th className="pb-3 font-semibold">IP</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Raison</th>
                  <th className="pb-3 font-semibold">Expiration</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.blockedIPs.map((ip) => (
                  <tr key={ip.id} className="border-b border-white/[0.03]">
                    <td className="py-2 font-mono text-xs">
                      {ip.ip_address}
                      {ip.carrier_ip && <AlertTriangle size={12} className="inline ml-1 text-yellow-400" />}
                    </td>
                    <td className="py-2">
                      <AdminBadge
                        status={ip.block_type === "bot" || ip.block_type === "datacenter" ? "fraud" : "active"}
                        label={ip.block_type}
                        size="sm"
                      />
                    </td>
                    <td className="py-2 text-xs font-dm text-white/50">{ip.reason}</td>
                    <td className="py-2 text-xs font-dm text-white/50">
                      {ip.expires_at ? new Date(ip.expires_at).toLocaleDateString("fr-FR") : "Permanent"}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => onUnblockIP(ip.ip_address)}
                        className="text-xs font-dm text-[#1D9E75] hover:text-[#1D9E75]/80 font-bold flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Débloquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
