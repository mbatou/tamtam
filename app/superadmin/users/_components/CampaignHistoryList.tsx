"use client";

import { formatFCFA } from "@/lib/utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import type { CampaignHistory } from "./types";

export default function CampaignHistoryList({
  campaigns,
  isEcho,
}: {
  campaigns: CampaignHistory[];
  isEcho: boolean;
}) {
  return campaigns.length === 0 ? (
    <p className="font-dm text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune campagne</p>
  ) : (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {campaigns.map((c) => (
        <div key={c.campaign_id + (c.joined_at || c.created_at || "")} className="p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="font-dm text-sm font-semibold truncate flex-1 text-white">{c.title}</span>
            <AdminBadge status={c.status === "active" ? "active" : c.status === "completed" ? "finished" : c.status === "paused" ? "paused" : c.status === "rejected" ? "rejected" : "draft"}>
              {c.status}
            </AdminBadge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-dm text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {isEcho ? (
              <>
                <span>Clics : <strong className="text-white/70">{c.clicks}</strong></span>
                <span>Gagné : <strong style={{ color: "#5DCAA5" }}>{formatFCFA(c.earned || 0)}</strong></span>
                <span>CPC : {formatFCFA(c.cpc)}</span>
              </>
            ) : (
              <>
                <span>Budget : <strong className="text-white/70">{formatFCFA(c.budget || 0)}</strong></span>
                <span>Dépensé : <strong style={{ color: "#5DCAA5" }}>{formatFCFA(c.spent || 0)}</strong></span>
                <span>Échos : <strong className="text-white/70">{c.echos}</strong></span>
                <span>CPC : {formatFCFA(c.cpc)}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
