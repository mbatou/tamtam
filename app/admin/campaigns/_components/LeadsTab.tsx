"use client";

import { useTranslation } from "@/lib/i18n";
import type { Lead } from "./types";

export default function LeadsTab({
  campaignId,
  leads,
  leadsLoading,
  leadActionLoading,
  onLeadAction,
}: {
  campaignId: string;
  leads: Lead[];
  leadsLoading: boolean;
  leadActionLoading: string | null;
  onLeadAction: (leadId: string, action: "verify" | "reject") => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("admin.campaigns.leadsTab")} ({leads.length})</p>
        {leads.length > 0 && (
          <a
            href={`/api/admin/campaigns/leads?campaign_id=${campaignId}&format=csv`}
            download
            className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold hover:bg-purple-500/20 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {t("admin.campaigns.downloadCSV")}
          </a>
        )}
      </div>
      {leadsLoading ? (
        <div className="rounded-2xl p-8 text-center text-white/30 text-sm" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>{t("admin.campaigns.loadingData")}</div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl p-8 text-center text-white/30 text-sm" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>{t("admin.campaigns.noLeads")}</div>
      ) : (
        <div className="rounded-2xl overflow-x-auto" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          {(() => {
            const customFieldKeys = Array.from(new Set(leads.flatMap(l => l.custom_fields ? Object.keys(l.custom_fields) : [])));
            return (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-4 py-3 text-xs text-white/40 font-semibold">{t("admin.campaigns.leadName")}</th>
                    <th className="px-4 py-3 text-xs text-white/40 font-semibold">{t("admin.campaigns.leadPhone")}</th>
                    <th className="px-4 py-3 text-xs text-white/40 font-semibold">{t("common.email")}</th>
                    {customFieldKeys.map(key => (
                      <th key={key} className="px-4 py-3 text-xs text-white/40 font-semibold">{key}</th>
                    ))}
                    <th className="px-4 py-3 text-xs text-white/40 font-semibold">{t("admin.campaigns.leadStatus")}</th>
                    <th className="px-4 py-3 text-xs text-white/40 font-semibold">{t("admin.campaigns.leadDate")}</th>
                    <th className="px-4 py-3 text-xs text-white/40 font-semibold">{t("admin.campaigns.leadActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-4 py-3">{lead.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{lead.phone}</td>
                      <td className="px-4 py-3 text-xs text-white/60">{lead.email || (lead.custom_fields && Object.entries(lead.custom_fields).find(([k]) => k.toLowerCase().includes("email"))?.[1]) || "—"}</td>
                      {customFieldKeys.map(key => (
                        <td key={key} className="px-4 py-3 text-xs text-white/60">{lead.custom_fields?.[key] || "—"}</td>
                      ))}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          lead.status === "verified" ? "bg-emerald-500/20 text-emerald-300" :
                          lead.status === "rejected" ? "bg-red-500/20 text-red-300" :
                          lead.status === "flagged" ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-white/10 text-white/60"
                        }`}>
                          {lead.status === "verified" ? t("admin.campaigns.leadAccepted") : lead.status === "rejected" ? t("admin.campaigns.leadRejected") : lead.status === "flagged" ? t("admin.campaigns.leadFlagged") : t("admin.campaigns.leadPending")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">{new Date(lead.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">
                        {(lead.status === "pending" || lead.status === "flagged") && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onLeadAction(lead.id, "verify")}
                              disabled={leadActionLoading === lead.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40"
                            >
                              {leadActionLoading === lead.id ? "..." : t("admin.campaigns.acceptLead")}
                            </button>
                            <button
                              onClick={() => onLeadAction(lead.id, "reject")}
                              disabled={leadActionLoading === lead.id}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition disabled:opacity-40"
                            >
                              {leadActionLoading === lead.id ? "..." : t("admin.campaigns.rejectLead")}
                            </button>
                          </div>
                        )}
                        {lead.status === "verified" && (
                          <button
                            onClick={() => onLeadAction(lead.id, "reject")}
                            disabled={leadActionLoading === lead.id}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition disabled:opacity-40"
                          >
                            {leadActionLoading === lead.id ? "..." : t("admin.campaigns.rejectLead")}
                          </button>
                        )}
                        {lead.status === "rejected" && <span className="text-[11px] text-red-400/50">{t("admin.campaigns.leadRejected")}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}
    </div>
  );
}
