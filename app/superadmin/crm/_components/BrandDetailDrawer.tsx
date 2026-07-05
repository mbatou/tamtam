"use client";

import { formatFCFA } from "@/lib/utils";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { CreditCard, ExternalLink, Eye, Megaphone, Pencil, Wallet } from "lucide-react";
import BrandInfoTab from "./BrandInfoTab";
import BrandCampaignsTab from "./BrandCampaignsTab";
import BrandFinanceTab from "./BrandFinanceTab";
import {
  BrandDetail,
  BrandDetailDrawerActions,
  BrandUser,
  DetailTab,
  NotesSectionProps,
  STAGE_CONFIG,
} from "./types";

export default function BrandDetailDrawer({
  user,
  tab,
  onTabChange,
  onClose,
  detail,
  notes,
  onUpdateTags,
  actions,
}: {
  user: BrandUser | null;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onClose: () => void;
  detail: { data: BrandDetail | null; loading: boolean };
  notes: NotesSectionProps;
  onUpdateTags: (userId: string, tags: string[]) => void;
  actions: BrandDetailDrawerActions;
}) {
  return (
    <AdminDrawer
      open={!!user}
      onClose={onClose}
      title={user ? (user.company_name || user.name) : ""}
      subtitle={user?.company_name ? user.name : undefined}
      width="560px"
    >
      {user && (
        <div className="space-y-5">
          {/* Stage + city */}
          <div className="flex items-center gap-2">
            <span className="font-dm text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: (STAGE_CONFIG[user.pipelineStage || "registered"] || STAGE_CONFIG.registered).bg, color: (STAGE_CONFIG[user.pipelineStage || "registered"] || STAGE_CONFIG.registered).color }}>
              {(STAGE_CONFIG[user.pipelineStage || "registered"] || STAGE_CONFIG.registered).label}
            </span>
            {user.city && (
              <span className="font-dm text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{user.city}</span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: formatFCFA(user.balance || 0), label: "Solde", color: "#fff" },
              { value: String(user.campaignCount || 0), label: "Campagnes", color: "#fff" },
              { value: String(user.activeCampaigns || 0), label: "Actives", color: "#5DCAA5" },
              { value: String(user.teamMembers || 0), label: "Équipe", color: "#fff" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="font-syne font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            {([
              { key: "info" as const, label: "Info", icon: Eye },
              { key: "campaigns" as const, label: "Campagnes", icon: Megaphone },
              { key: "finance" as const, label: "Finance", icon: Wallet },
            ]).map(t => (
              <button key={t.key} onClick={() => onTabChange(t.key)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-medium transition-all"
                style={{ background: tab === t.key ? "rgba(211,84,0,0.12)" : "transparent", color: tab === t.key ? "#D35400" : "rgba(255,255,255,0.4)" }}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Info */}
          {tab === "info" && (
            <BrandInfoTab user={user} onUpdateTags={onUpdateTags} notes={notes} />
          )}

          {/* Tab: Campaigns */}
          {tab === "campaigns" && (
            <BrandCampaignsTab detail={detail.data} loading={detail.loading} />
          )}

          {/* Tab: Finance */}
          {tab === "finance" && (
            <BrandFinanceTab user={user} detail={detail.data} loading={detail.loading} />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <button onClick={() => { actions.onTopup(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition"
              style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}>
              <CreditCard size={14} /> Recharger
            </button>
            <button onClick={() => actions.onEdit(user)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <Pencil size={14} /> Modifier
            </button>
            <button onClick={() => actions.onInvestigate(user.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <ExternalLink size={14} /> Voir
            </button>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}
