"use client";

import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ConversionFunnel, { CostCards, AttributionBreakdown } from "@/components/ConversionFunnel";
import type { ConvData } from "./types";

export default function ConversionsTab({
  campaignId,
  convData,
  convLoading,
  convError,
  convPage,
  setConvPage,
  onRetry,
}: {
  campaignId: string;
  convData: ConvData | null;
  convLoading: boolean;
  convError: string | null;
  convPage: number;
  setConvPage: Dispatch<SetStateAction<number>>;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {convLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : convData && (convData.funnel.installs > 0 || convData.funnel.signups > 0 || convData.funnel.activations > 0 || convData.funnel.subscriptions > 0 || convData.funnel.purchases > 0 || convData.funnel.leads > 0 || convData.funnel.custom > 0) ? (
        <>
          {/* Funnel */}
          <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-[10px] font-bold font-dm uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.conversionFunnel")}</h3>
            <ConversionFunnel funnel={convData.funnel} rates={convData.rates} />
          </div>

          {/* Cost metrics */}
          <CostCards costs={convData.costs} revenue={convData.revenue} />

          {/* Daily chart */}
          {convData.daily.length > 1 && (
            <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-[10px] font-bold font-dm uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.conversionsPerDay")}</h3>
              <div className="h-64 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={convData.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => { const d = new Date(v); return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }}
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                      labelFormatter={(v) => new Date(String(v)).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    />
                    <Bar dataKey="installs" name="Installations" fill="#D35400" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="signups" name="Inscriptions" fill="#E67E22" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="activations" name="Activations" fill="#F39C12" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="subscriptions" name="Souscriptions" fill="#1ABC9C" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="purchases" name="Achats" fill="#16A085" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="leads" name="Leads" fill="#2ECC71" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Attribution breakdown */}
          <AttributionBreakdown attribution={convData.attribution} />

          {/* Recent conversions table */}
          {convData.recent.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold font-dm uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.recentConversions")}</h3>
                <a
                  href={`/api/brand/conversions?campaign_id=${campaignId}&format=csv`}
                  download
                  className="text-xs font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {t("admin.campaigns.exportCSV")}
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/30 text-xs border-b border-white/5">
                      <th className="text-left py-2 px-3 font-semibold">{t("admin.campaigns.leadDate")}</th>
                      <th className="text-left py-2 px-3 font-semibold">Événement</th>
                      <th className="text-left py-2 px-3 font-semibold">Valeur</th>
                      <th className="text-left py-2 px-3 font-semibold">Attribué</th>
                      <th className="text-left py-2 px-3 font-semibold">Délai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convData.recent.slice(convPage * 10, (convPage + 1) * 10).map((ev) => {
                      const eventColors: Record<string, string> = {
                        install: "bg-orange-500/20 text-orange-400",
                        signup: "bg-yellow-500/20 text-yellow-400",
                        subscription: "bg-teal-500/20 text-teal-400",
                        purchase: "bg-emerald-500/20 text-emerald-400",
                        lead: "bg-blue-500/20 text-blue-400",
                      };
                      let delay = "—";
                      if (ev.click_to_conversion_seconds) {
                        const h = Math.floor(ev.click_to_conversion_seconds / 3600);
                        const m = Math.floor((ev.click_to_conversion_seconds % 3600) / 60);
                        delay = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : `${ev.click_to_conversion_seconds}s`;
                      }
                      return (
                        <tr key={ev.id} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 px-3 text-white/50 text-xs">
                            {new Date(ev.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{" "}
                            {new Date(ev.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${eventColors[ev.event] || "bg-white/10 text-white/50"}`}>
                              {ev.event}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-semibold">
                            {ev.value_amount ? formatFCFA(ev.value_amount) : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-xs">
                            {ev.attributed ? (
                              <span className="text-emerald-400 font-semibold">Direct</span>
                            ) : (
                              <span className="text-white/30">Non</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-white/40">{delay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {convData.recent.length > 10 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setConvPage(Math.max(0, convPage - 1))}
                    disabled={convPage === 0}
                    className="text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition"
                  >
                    {t("admin.campaigns.previous")}
                  </button>
                  <span className="text-xs text-white/30">
                    {convPage + 1} / {Math.ceil(convData.recent.length / 10)}
                  </span>
                  <button
                    onClick={() => setConvPage(Math.min(Math.ceil(convData.recent.length / 10) - 1, convPage + 1))}
                    disabled={(convPage + 1) * 10 >= convData.recent.length}
                    className="text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition"
                  >
                    {t("admin.campaigns.nextPage")}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : convError ? (
        <div className="rounded-2xl text-center py-16" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm text-red-400 font-semibold">Erreur : {convError}</p>
          <button onClick={onRetry} className="mt-4 text-sm hover:underline" style={{ color: "#D35400" }}>{t("admin.campaigns.retryLoad")}</button>
        </div>
      ) : (
        /* Empty state — pixel linked but no conversions yet */
        <div className="rounded-2xl text-center py-16" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-white/15 mb-4"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <h3 className="text-lg font-bold text-white/50">{t("admin.campaigns.waitingConversions")}</h3>
          <p className="text-sm text-white/30 mt-2 max-w-md mx-auto">
            Votre Pixel est configuré et lié à cette campagne.
            Les données de conversion apparaîtront ici dès que votre app enverra le premier événement.
          </p>
          <p className="text-xs text-white/20 mt-3 max-w-sm mx-auto">
            Pour tester : envoyez un événement test via cURL avec le tm_ref d&apos;un de vos clics.
          </p>
          <a href="/admin/pixel/guide" className="inline-block mt-5 text-sm font-semibold hover:underline" style={{ color: "#D35400" }}>
            Voir le guide d&apos;intégration
          </a>
        </div>
      )}
    </div>
  );
}
