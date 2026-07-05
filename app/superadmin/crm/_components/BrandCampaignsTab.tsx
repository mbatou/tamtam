"use client";

import { formatFCFA } from "@/lib/utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { BrandDetail } from "./types";

export default function BrandCampaignsTab({
  detail,
  loading,
}: {
  detail: BrandDetail | null;
  loading: boolean;
}) {
  return (
    <div>
      {loading ? (
        <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Chargement...</div>
      ) : !detail || detail.campaigns.length === 0 ? (
        <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune campagne</div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {detail.campaigns.map(c => (
            <div key={c.id} className="rounded-xl p-4 transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-dm text-sm font-semibold text-white truncate">{c.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <AdminBadge status={
                      c.moderation_status === "pending" ? "pending" :
                      c.moderation_status === "rejected" ? "rejected" :
                      c.status === "active" ? "active" :
                      c.status === "paused" ? "paused" : "finished"
                    }>
                      {c.moderation_status === "pending" ? "En attente" :
                       c.moderation_status === "rejected" ? "Rejetée" :
                       c.status === "active" ? "Active" :
                       c.status === "paused" ? "Pause" : c.status}
                    </AdminBadge>
                    {c.target_cities && c.target_cities.length > 0 && (
                      <span className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{c.target_cities.join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="font-syne font-bold text-sm text-white">{formatFCFA(c.budget || 0)}</div>
                  <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{c.cpc} F/clic</div>
                </div>
              </div>
              <div className="flex items-center justify-between font-dm text-xs mt-2 pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }}>
                <span>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                <span>{c.echoCount} écho{c.echoCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
