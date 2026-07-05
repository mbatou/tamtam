"use client";

import Image from "next/image";
import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import ProgressBar from "@/components/ui/ProgressBar";
import { SITE_URL } from "@/lib/constants";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import {
  CheckCircle2,
  XCircle,
  Bell,
  MousePointerClick,
  Eye,
  Target,
  Copy,
  Pause,
  Play,
  Square,
  ExternalLink,
} from "lucide-react";
import { Campaign, DetailTab, EchoData, STATUS_MAP } from "./types";
import { InfoField } from "./fields";

export interface CampaignDetailState {
  selected: Campaign | null;
  detailTab: DetailTab;
  echoData: EchoData | null;
  loadingEchos: boolean;
  landingPageSlug: string | null;
  rejectReason: string;
  moderating: boolean;
  notifying: boolean;
}

export interface CampaignDetailActions {
  onClose: () => void;
  onTabChange: (tab: DetailTab) => void;
  onRejectReasonChange: (value: string) => void;
  onModerate: (id: string, action: string, reason?: string) => void;
  onNotify: (id: string) => void;
  onClone: (campaign: Campaign) => void;
}

export default function CampaignDetailDrawer({
  state,
  actions,
}: {
  state: CampaignDetailState;
  actions: CampaignDetailActions;
}) {
  const { selected, detailTab, echoData, loadingEchos, landingPageSlug, rejectReason, moderating, notifying } = state;
  const { onClose, onTabChange, onRejectReasonChange, onModerate, onNotify, onClone } = actions;

  return (
    <AdminDrawer
      open={!!selected}
      onClose={onClose}
      title={selected?.title || ""}
      subtitle={selected?.users ? getBrandDisplayName({ ...selected.users, role: "batteur" }) : undefined}
      width="520px"
    >
      {selected && (
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            {([
              { key: "info" as const, label: "Info", icon: Eye },
              { key: "echos" as const, label: `Échos (${echoData?.engagedCount ?? selected.echo_count})`, icon: MousePointerClick },
              { key: "clicks" as const, label: "Clics récents", icon: Target },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-medium transition-all"
                style={{
                  background: detailTab === tab.key ? "rgba(211,84,0,0.12)" : "transparent",
                  color: detailTab === tab.key ? "#D35400" : "rgba(255,255,255,0.4)",
                }}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Info */}
          {detailTab === "info" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Marque" value={selected.users ? getBrandDisplayName({ ...selected.users, role: "batteur" }) : "—"} />
                <InfoField label="Statut">
                  <div className="flex items-center gap-2">
                    <AdminBadge status={STATUS_MAP[selected.moderation_status || "pending"]?.badge || "pending"} size="md">
                      {STATUS_MAP[selected.moderation_status || "pending"]?.label || "En attente"}
                    </AdminBadge>
                    {selected.deleted_at && <AdminBadge status="error" size="md">Supprimée</AdminBadge>}
                  </div>
                </InfoField>
                <InfoField label="Objectif" className="col-span-2">
                  <span className="font-dm text-sm text-white font-medium">
                    {(selected.objective || "traffic") === "awareness" ? "Awareness (visuel requis)" :
                     (selected.objective || "traffic") === "lead_generation" ? "Lead Generation (landing page)" :
                     "Traffic (clics)"}
                  </span>
                </InfoField>
                <InfoField label="Budget" value={formatFCFA(selected.budget)} />
                {(selected.pricing_model || "cpc") === "cpa" ? (
                  <>
                    <InfoField label="Modèle">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(211,84,0,0.12)", color: "#D35400" }}>CPA</span>
                    </InfoField>
                    <InfoField label="CPA" value={`${selected.cpa_amount || 0} FCFA / ${selected.cpa_event || "—"}`} />
                  </>
                ) : (
                  <InfoField label="CPC" value={`${selected.cpc} FCFA`} />
                )}

                {(selected.objective || "traffic") === "lead_generation" && (
                  <>
                    <InfoField label="CPL" value={`${selected.cost_per_lead_fcfa || "—"} FCFA`} />
                    <InfoField label="Leads capturés" value={String(selected.leads_captured_count || 0)} />
                    {selected.landing_page_id && (
                      <InfoField label="Landing Page" className="col-span-2">
                        {landingPageSlug ? (
                          <a href={`${SITE_URL}/l/${landingPageSlug}`} target="_blank" rel="noopener noreferrer"
                            className="font-dm text-xs font-mono break-all transition" style={{ color: "#D35400" }}>
                            {SITE_URL}/l/{landingPageSlug}
                            <ExternalLink size={10} className="inline ml-1" />
                          </a>
                        ) : (
                          <span className="font-dm text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Chargement...</span>
                        )}
                      </InfoField>
                    )}
                    {selected.setup_fee_paid && (
                      <InfoField label="Frais landing page" value={`${formatFCFA(selected.setup_fee_amount_fcfa || 0)} (payé)`} />
                    )}
                  </>
                )}

                <InfoField label="Échos engagés" value={String(selected.echo_count)} />
                <InfoField label="Total clics" value={String(selected.total_clicks)} />

                <div className="col-span-2">
                  <span className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Budget consommé</span>
                  <ProgressBar value={selected.spent} max={selected.budget} />
                  <span className="font-dm text-xs mt-1 block" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {formatFCFA(selected.spent)} / {formatFCFA(selected.budget)}
                  </span>
                </div>

                <InfoField label="URL destination" className="col-span-2">
                  <span className="font-dm text-xs font-mono break-all" style={{ color: "#D35400" }}>{selected.destination_url}</span>
                </InfoField>

                {selected.description && (
                  <InfoField label="Description" className="col-span-2" value={selected.description} />
                )}
                {selected.moderation_reason && (
                  <InfoField label="Raison du rejet" className="col-span-2">
                    <span className="font-dm text-xs" style={{ color: "#F09595" }}>{selected.moderation_reason}</span>
                  </InfoField>
                )}
                {selected.creative_urls && selected.creative_urls.length > 0 && (
                  <div className="col-span-2">
                    <span className="font-dm text-[10px] uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Visuels</span>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.creative_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="relative aspect-square rounded-xl overflow-hidden transition"
                          style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}>
                          {url.match(/\.(mp4|webm)/) ? (
                            <video src={url} className="w-full h-full object-cover" controls />
                          ) : (
                            <Image src={url} alt={`Visuel ${i + 1}`} fill sizes="160px" className="object-cover" />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Moderation actions — pending */}
              {(selected.moderation_status || "pending") === "pending" && (
                <div className="space-y-3 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => onRejectReasonChange(e.target.value)}
                    placeholder="Raison du rejet (optionnel)..."
                    className="w-full rounded-xl px-4 py-3 font-dm text-sm resize-none h-20 focus:outline-none transition"
                    style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => onModerate(selected.id, "approve")}
                      disabled={moderating}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                      style={{ background: "rgba(29,158,117,0.12)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                    >
                      <CheckCircle2 size={14} />
                      {moderating ? "..." : "Approuver"}
                    </button>
                    <button
                      onClick={() => onModerate(selected.id, "reject", rejectReason.trim() || undefined)}
                      disabled={moderating}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                      style={{ background: "rgba(226,75,74,0.12)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                    >
                      <XCircle size={14} />
                      {moderating ? "..." : "Rejeter"}
                    </button>
                  </div>
                </div>
              )}

              {/* Active campaign actions */}
              {selected.status === "active" && (
                <div className="space-y-2 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                  {(() => {
                    const rem = selected.budget - (selected.spent || 0);
                    if (rem < selected.cpc) {
                      return (
                        <div className="px-4 py-3 rounded-xl font-dm text-xs font-bold animate-pulse"
                          style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.2)", color: "#F09595" }}>
                          {rem.toLocaleString()} FCFA restants — en dessous du CPC ({selected.cpc} FCFA).
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <button
                    onClick={() => onNotify(selected.id)}
                    disabled={notifying}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                    style={{ background: "rgba(211,84,0,0.1)", border: "0.5px solid rgba(211,84,0,0.3)", color: "#D35400" }}
                  >
                    <Bell size={14} />
                    {notifying ? "Envoi..." : "Notifier les Échos"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onModerate(selected.id, "pause")}
                      disabled={moderating}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                      style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.3)", color: "#EAB308" }}
                    >
                      <Pause size={14} />
                      Pause
                    </button>
                    <button
                      onClick={() => onModerate(selected.id, "stop")}
                      disabled={moderating}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                      style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                    >
                      <Square size={14} />
                      Stop + Rembourser
                    </button>
                  </div>
                </div>
              )}

              {/* Paused campaign actions */}
              {selected.status === "paused" && (
                <div className="flex gap-2 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <button
                    onClick={() => onModerate(selected.id, "resume")}
                    disabled={moderating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                    style={{ background: "rgba(29,158,117,0.12)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                  >
                    <Play size={14} />
                    Reprendre
                  </button>
                  <button
                    onClick={() => onModerate(selected.id, "stop")}
                    disabled={moderating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                    style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                  >
                    <Square size={14} />
                    Stop + Rembourser
                  </button>
                </div>
              )}

              {selected.status === "completed" && (
                <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <span className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Campagne terminée</span>
                </div>
              )}

              {/* Clone */}
              <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                <button
                  onClick={() => onClone(selected)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                >
                  <Copy size={14} />
                  Dupliquer
                </button>
              </div>
            </>
          )}

          {/* Tab: Echos */}
          {detailTab === "echos" && (
            <div>
              {loadingEchos ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
                </div>
              ) : echoData ? (
                <>
                  <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Taux de participation</span>
                      <span className="font-dm text-sm font-bold text-white">
                        {echoData.engagedCount} / {echoData.totalEchos}
                        <span className="font-normal ml-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          ({echoData.participationRate}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${echoData.participationRate}%`, background: "#D35400" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    {echoData.echos.map((echo, i) => (
                      <div key={echo.id}
                        className="flex items-center justify-between py-3 px-3 rounded-lg transition"
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-syne font-bold text-sm w-6" style={{ color: i < 3 ? "#D35400" : "rgba(255,255,255,0.3)" }}>
                            {i + 1}
                          </span>
                          <div>
                            <div className="font-dm text-sm font-medium text-white">{echo.name}</div>
                            <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {echo.city || "—"} · rejoint le {new Date(echo.joinedAt).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <div className="font-dm font-medium text-white">{echo.validClicks}</div>
                            <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>clics valides</div>
                          </div>
                          <div className="text-right">
                            <div className="font-syne font-bold" style={{ color: "#5DCAA5" }}>
                              {Math.round(echo.earnings).toLocaleString()} F
                            </div>
                            <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>gagné</div>
                          </div>
                          {echo.phone && (
                            <a href={`https://wa.me/${echo.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-sm transition" style={{ color: "#5DCAA5" }}
                              title="WhatsApp">
                              WA
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {echoData.echos.length === 0 && (
                      <div className="text-center py-8 font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Aucun Écho n&apos;a rejoint cette campagne
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Tab: Recent Clicks */}
          {detailTab === "clicks" && (
            <div>
              {loadingEchos ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
                </div>
              ) : echoData ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-5 gap-2 px-3 py-2 font-dm uppercase tracking-wider"
                    style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                    <span>Heure</span>
                    <span>Écho</span>
                    <span>Ville</span>
                    <span>IP</span>
                    <span>Statut</span>
                  </div>
                  {echoData.recentClicks.map((click) => (
                    <div key={click.id}
                      className="grid grid-cols-5 gap-2 font-dm text-sm px-3 py-2 rounded-lg transition"
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        {new Date(click.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-white truncate">
                        {click.tracked_links?.users?.name || "—"}
                      </span>
                      <span className="truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {click.tracked_links?.users?.city || "—"}
                      </span>
                      <span className="font-mono text-xs truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {click.ip_address ? `${click.ip_address.substring(0, 12)}...` : "—"}
                      </span>
                      <span style={{ color: click.is_valid ? "#5DCAA5" : "#F09595" }}>
                        {click.is_valid ? "Valide" : "Filtré"}
                      </span>
                    </div>
                  ))}
                  {echoData.recentClicks.length === 0 && (
                    <div className="text-center py-8 font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Aucun clic enregistré
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </AdminDrawer>
  );
}
