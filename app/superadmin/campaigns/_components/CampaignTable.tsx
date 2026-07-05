"use client";

import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import { paginate } from "@/components/ui/Pagination";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { Campaign, DetailTab, STATUS_MAP, OBJ_MAP } from "./types";

export default function CampaignTable({
  campaigns,
  page,
  pageSize,
  onSelect,
  onOpenTab,
}: {
  campaigns: Campaign[];
  page: number;
  pageSize: number;
  onSelect: (campaign: Campaign) => void;
  onOpenTab: (campaign: Campaign, tab: DetailTab) => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#111128" }}>
              {["Campagne", "Statut", "Budget", "CPC/CPA", "Échos", "Clics", "Date"].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${
                    i >= 2 && i <= 3 ? "hidden md:table-cell" : ""
                  } ${i >= 4 && i <= 6 ? "hidden lg:table-cell" : ""}`}
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginate(campaigns, page, pageSize).map((campaign) => {
              const modStatus = STATUS_MAP[campaign.moderation_status || "pending"] || STATUS_MAP.pending;
              const obj = OBJ_MAP[(campaign.objective || "traffic")] || OBJ_MAP.traffic;
              const pct = campaign.budget > 0 ? Math.min(100, (campaign.spent / campaign.budget) * 100) : 0;
              const remaining = campaign.budget - (campaign.spent || 0);
              const unitCost = (campaign.pricing_model || "cpc") === "cpa" ? (campaign.cpa_amount || 0) : campaign.cpc;
              const lowBudget = campaign.status === "active" && unitCost > 0 && remaining < unitCost;

              return (
                <tr
                  key={campaign.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                  onClick={() => onSelect(campaign)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-dm text-sm font-semibold text-white">{campaign.title}</span>
                      <span
                        className="text-[10px] font-dm font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: obj.bg, color: obj.color }}
                      >
                        {obj.label}
                      </span>
                    </div>
                    <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {campaign.users ? getBrandDisplayName({ ...campaign.users, role: "batteur" }) : "—"}
                    </div>
                    {campaign.target_cities && campaign.target_cities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {campaign.target_cities.slice(0, 3).map((city: string) => (
                          <span
                            key={city}
                            className="text-[10px] font-dm px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(211,84,0,0.08)", color: "rgba(211,84,0,0.6)" }}
                          >
                            {city}
                          </span>
                        ))}
                        {campaign.target_cities.length > 3 && (
                          <span className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>
                            +{campaign.target_cities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {campaign.budget > 0 && (
                      <div className="mt-1 h-1 w-full max-w-[120px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct > 90 ? "#ef4444" : pct > 70 ? "#eab308" : "#1D9E75",
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <AdminBadge status={modStatus.badge}>{modStatus.label}</AdminBadge>
                      {campaign.status !== campaign.moderation_status && (
                        <AdminBadge status={STATUS_MAP[campaign.status]?.badge || "draft"}>
                          {STATUS_MAP[campaign.status]?.label || campaign.status}
                        </AdminBadge>
                      )}
                      {campaign.deleted_at && (
                        <AdminBadge status="error">Supprimée</AdminBadge>
                      )}
                      {lowBudget && (
                        <span className="text-[10px] font-dm font-bold" style={{ color: "#F09595" }}>Budget &lt; {(campaign.pricing_model || "cpc") === "cpa" ? "CPA" : "CPC"}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="font-dm text-sm text-white">{formatFCFA(campaign.budget)}</div>
                    <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {formatFCFA(campaign.spent)} dépensés
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-dm text-sm text-white/70">
                    {(campaign.pricing_model || "cpc") === "cpa" ? (
                      <div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1" style={{ background: "rgba(211,84,0,0.12)", color: "#D35400" }}>CPA</span>
                        {campaign.cpa_amount} FCFA
                      </div>
                    ) : (
                      <>{campaign.cpc} FCFA</>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 hidden lg:table-cell font-dm text-sm cursor-pointer transition"
                    style={{ color: "#D35400" }}
                    onClick={(e) => { e.stopPropagation(); onOpenTab(campaign, "echos"); }}
                  >
                    {campaign.echo_count}
                  </td>
                  <td
                    className="px-4 py-3 hidden lg:table-cell font-dm text-sm text-white/70 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onOpenTab(campaign, "clicks"); }}
                  >
                    {campaign.total_clicks}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {new Date(campaign.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Aucune campagne trouvée
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
