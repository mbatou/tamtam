"use client";

import { formatFCFA } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";
import { ExternalLink, MessageCircle, Pencil } from "lucide-react";
import { BrandTableRowActions, BrandTableSelection, BrandUser, STAGE_CONFIG } from "./types";

export default function BrandTable({
  users,
  loading,
  total,
  page,
  onPageChange,
  selection,
  rowActions,
}: {
  users: BrandUser[];
  loading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  selection: BrandTableSelection;
  rowActions: BrandTableRowActions;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
      {loading ? (
        <div className="flex items-center justify-center py-20" style={{ color: "rgba(255,255,255,0.25)" }}>
          <div className="animate-spin w-5 h-5 rounded-full mr-3" style={{ border: "2px solid #D35400", borderTopColor: "transparent" }} />
          <span className="font-dm text-sm">Chargement...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 font-dm text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Aucune marque trouvée</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#111128" }}>
                  <th className="py-3 px-4 text-left w-10">
                    <input type="checkbox" checked={selection.selected.length === users.length && users.length > 0}
                      onChange={selection.onSelectAll} className="rounded accent-orange-500" />
                  </th>
                  {["Entreprise", "Email", "Ville", "Solde", "Campagnes", "Étape", "Inscrit", "Actions"].map(h => (
                    <th key={h} className="py-3 px-4 text-left font-dm font-medium uppercase tracking-wider" style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const stage = STAGE_CONFIG[user.pipelineStage || "registered"] || STAGE_CONFIG.registered;
                  return (
                    <tr key={user.id} className="transition-colors" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <td className="py-3 px-4">
                        <input type="checkbox" checked={selection.selected.includes(user.id)} onChange={() => selection.onToggle(user.id)} className="rounded accent-orange-500" />
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => rowActions.onOpenDetail(user)} className="text-left group">
                          <div className="font-dm text-sm font-semibold text-white group-hover:text-[#D35400] transition">{user.company_name || user.name}</div>
                          {user.company_name && <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{user.name}</div>}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</td>
                      <td className="py-3 px-4 font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{user.city || "—"}</td>
                      <td className="py-3 px-4 font-syne font-bold text-sm text-white text-right">{formatFCFA(user.balance || 0)}</td>
                      <td className="py-3 px-4 font-dm text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {user.campaignCount || 0}
                        {(user.activeCampaigns || 0) > 0 && (
                          <span className="ml-1" style={{ color: "#5DCAA5", fontSize: "11px" }}>({user.activeCampaigns})</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-dm text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
                      </td>
                      <td className="py-3 px-4 font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {new Date(user.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => rowActions.onEdit(user)} className="p-1.5 rounded-lg transition" title="Modifier"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#D35400"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                            <Pencil size={13} />
                          </button>
                          {user.phone && (
                            <a href={`https://wa.me/${user.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg transition" title="WhatsApp"
                              style={{ color: "rgba(255,255,255,0.3)" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#5DCAA5"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
                              <MessageCircle size={13} />
                            </a>
                          )}
                          <button onClick={() => rowActions.onInvestigate(user.id)} className="p-1.5 rounded-lg transition" title="Investigation"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#60A5FA"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
            <Pagination currentPage={page} totalItems={total} pageSize={25} onPageChange={onPageChange} />
          </div>
        </>
      )}
    </div>
  );
}
