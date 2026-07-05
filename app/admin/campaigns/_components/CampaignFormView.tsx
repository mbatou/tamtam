"use client";

import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";
import { ECHO_SHARE_PERCENT, ECHO_CPA_SHARE_PERCENT } from "@/lib/constants";
import { SENEGAL_CITIES } from "@/lib/cities";
import type { CampaignObjective, PricingModel } from "@/lib/types";
import CancelConfirmModal from "./CancelConfirmModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import type { BrandPixel, CampaignFormState, ImageFormatHint, View } from "./types";

export interface CampaignFormViewProps {
  form: CampaignFormState;
  setForm: Dispatch<SetStateAction<CampaignFormState>>;
  editingId: string | null;
  objective: CampaignObjective;
  setView: Dispatch<SetStateAction<View>>;
  resetForm: () => void;
  creativeUrls: string[];
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  removeCreative: (index: number) => void;
  imageFormatHint: ImageFormatHint;
  pricingModel: PricingModel;
  setPricingModel: Dispatch<SetStateAction<PricingModel>>;
  brandPixels: BrandPixel[];
  showPixelSection: boolean;
  setShowPixelSection: Dispatch<SetStateAction<boolean>>;
  cpaAmount: string;
  setCpaAmount: Dispatch<SetStateAction<string>>;
  cpaEvent: string;
  setCpaEvent: Dispatch<SetStateAction<string>>;
  avgCpc: number;
  citySearch: string;
  setCitySearch: Dispatch<SetStateAction<string>>;
  targetCities: string[];
  setTargetCities: Dispatch<SetStateAction<string[]>>;
  selectedPixelId: string | null;
  setSelectedPixelId: Dispatch<SetStateAction<string | null>>;
  error: string | null;
  showRechargePrompt: boolean;
  submitting: boolean;
  handleSubmit: (asDraft: boolean) => void;
  showCancelConfirm: boolean;
  setShowCancelConfirm: Dispatch<SetStateAction<boolean>>;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setDeleteTargetId: Dispatch<SetStateAction<string | null>>;
  confirmDelete: () => void;
  actionLoading: string | null;
}

export default function CampaignFormView({ vm }: { vm: CampaignFormViewProps }) {
  const { t } = useTranslation();
  const {
    form, setForm, editingId, objective, setView, resetForm,
    creativeUrls, uploading, fileInputRef, handleUpload, removeCreative, imageFormatHint,
    pricingModel, setPricingModel, brandPixels, showPixelSection, setShowPixelSection,
    cpaAmount, setCpaAmount, cpaEvent, setCpaEvent, avgCpc,
    citySearch, setCitySearch, targetCities, setTargetCities,
    selectedPixelId, setSelectedPixelId,
    error, showRechargePrompt, submitting, handleSubmit,
    showCancelConfirm, setShowCancelConfirm,
    showDeleteConfirm, setShowDeleteConfirm, setDeleteTargetId, confirmDelete, actionLoading,
  } = vm;

  return (
    <div className="p-6 lg:p-8" style={{ maxWidth: "100%" }}>
      <button onClick={() => { resetForm(); setView(editingId ? "detail" : "list"); }} className="flex items-center gap-2 text-xs font-medium transition mb-6" style={{ color: "rgba(255,255,255,0.35)" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        {t("common.back")}
      </button>

      <h1 className="text-2xl font-bold font-syne text-white mb-4">{editingId ? t("admin.campaigns.editRythme") : t("admin.campaigns.newRythme")}</h1>

      {/* Objective indicator */}
      <div className="flex items-center gap-2 mb-6">
        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
          objective === "awareness"
            ? "bg-blue-500/20 text-blue-300"
            : objective === "lead_generation"
              ? "bg-purple-500/20 text-purple-300"
              : "bg-teal-500/20 text-teal-300"
        }`}>
          {objective === "awareness" ? t("admin.campaigns.objectiveAwareness") : objective === "lead_generation" ? t("admin.campaigns.objectiveLeadGen") : t("admin.campaigns.objectiveTraffic")}
        </span>
        {!editingId && (
          <button onClick={() => setView("objective")} className="text-xs text-white/30 hover:text-white/50 transition">
            {t("admin.campaigns.changeObjective")}
          </button>
        )}
      </div>

      {objective === "awareness" && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-lg">📸</span>
          <div>
            <p className="text-sm font-semibold text-blue-300">{t("admin.campaigns.awarenessNotice")}</p>
            <p className="text-xs text-white/40">{t("admin.campaigns.awarenessNoticeDesc")}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.titleLabel")}</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("admin.campaigns.titlePlaceholder")} className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.description")}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("admin.campaigns.descPlaceholder")} rows={3} className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition resize-none" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.destUrlLabel")}</label>
            <input type="url" value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder={t("admin.campaigns.destUrlPlaceholder")} className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("admin.campaigns.campaignVisuals")}
              {objective === "awareness" && <span className="text-red-400 ml-1">*</span>}
            </label>
            {objective === "awareness" && creativeUrls.length === 0 && (
              <p className="text-xs text-red-400 mb-2">{t("admin.campaigns.imageRequired")}</p>
            )}
            <div className="flex flex-wrap gap-3 mb-3">
              {creativeUrls.map((url, i) => (
                <div key={i} className="relative group">
                  {url.match(/\.(mp4|webm)/) ? (
                    <video src={url} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                  ) : (
                    <Image src={url} alt={`Creative ${i + 1}`} width={96} height={96} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                  )}
                  <button onClick={() => removeCreative(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">x</button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/50 hover:border-white/40 transition cursor-pointer">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[10px]">{t("admin.campaigns.add")}</span>
                  </>
                )}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple onChange={handleUpload} className="hidden" />
            <div className="bg-white/[0.03] rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 text-xs">
                <span>📱</span>
                <span className="text-white/50">
                  {t("admin.campaigns.formatRecommended")} <strong className="text-white/80">{t("admin.campaigns.formatVertical")}</strong> {t("admin.campaigns.formatDimensions")} — {t("admin.campaigns.formatOptimal")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>💬 WhatsApp</span>
              </div>
            </div>
            {imageFormatHint && (
              <p className={`text-xs mt-1 ${imageFormatHint.type === "warning" ? "text-orange-400" : "text-green-400"}`}>
                {imageFormatHint.type === "warning" ? `⚠️ ${t("admin.campaigns.imageFormatWarning")}` : `✓ ${t("admin.campaigns.imageFormatSuccess")}`}
              </p>
            )}
            <p className="text-xs text-white/20 mt-1">{t("admin.campaigns.visualFormats")}</p>
          </div>

          {/* Pricing Model Selector */}
          {(objective === "traffic" || objective === "awareness") && (
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.pricingModelLabel")}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPricingModel("cpc")}
                  className="text-left p-4 rounded-xl transition-all"
                  style={{
                    background: pricingModel === "cpc" ? "rgba(211,84,0,0.08)" : "rgba(255,255,255,0.02)",
                    border: pricingModel === "cpc" ? "1.5px solid #D35400" : "0.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white font-syne">{t("admin.campaigns.pricingCpc")}</span>
                    {pricingModel === "cpc" && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#D35400" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.4)" }}>{t("admin.campaigns.pricingCpcDesc")}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (brandPixels.filter(p => p.is_active).length === 0) return;
                    setPricingModel("cpa");
                    setShowPixelSection(true);
                  }}
                  className="text-left p-4 rounded-xl transition-all"
                  style={{
                    background: pricingModel === "cpa" ? "rgba(211,84,0,0.08)" : "rgba(255,255,255,0.02)",
                    border: pricingModel === "cpa" ? "1.5px solid #D35400" : "0.5px solid rgba(255,255,255,0.08)",
                    opacity: brandPixels.filter(p => p.is_active).length === 0 ? 0.4 : 1,
                    cursor: brandPixels.filter(p => p.is_active).length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white font-syne">{t("admin.campaigns.pricingCpa")}</span>
                    {pricingModel === "cpa" && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#D35400" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {brandPixels.filter(p => p.is_active).length === 0
                      ? t("admin.campaigns.cpaNoPixel")
                      : t("admin.campaigns.pricingCpaDesc")
                    }
                  </p>
                </button>
              </div>
            </div>
          )}

          {pricingModel === "cpc" ? (
            <>
              <div>
                <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.cpcLabel")}</label>
                <input type="number" value={form.cpc} onChange={(e) => setForm({ ...form, cpc: e.target.value })} placeholder="25" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
                {avgCpc > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-white/40">
                      {t("admin.campaigns.avgCpcHint", { avg: formatFCFA(avgCpc) })}
                    </p>
                    {Number(form.cpc) > 0 && Number(form.cpc) < avgCpc && (
                      <p className="text-xs text-yellow-400 mt-1">
                        {t("admin.campaigns.cpcBelowAvg", { recommended: formatFCFA(Math.round(avgCpc * 1.25)) })}
                      </p>
                    )}
                    {Number(form.cpc) >= avgCpc && (
                      <p className="text-xs text-emerald-400 mt-1">
                        {t("admin.campaigns.cpcAboveAvg")}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.budgetLabel")}</label>
                <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="100000" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.cpaAmountLabel")}</label>
                <input type="number" value={cpaAmount} onChange={(e) => setCpaAmount(e.target.value)} placeholder="100" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
                <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Min. 100 FCFA</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.cpaEventLabel")}</label>
                <select
                  value={cpaEvent}
                  onChange={(e) => setCpaEvent(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
                >
                  <option value="">{t("admin.campaigns.cpaEventPlaceholder")}</option>
                  <option value="purchase">{t("admin.campaigns.cpaEventPurchase")}</option>
                  <option value="signup">{t("admin.campaigns.cpaEventSignup")}</option>
                  <option value="install">{t("admin.campaigns.cpaEventInstall")}</option>
                  <option value="activation">{t("admin.campaigns.cpaEventActivation")}</option>
                  <option value="subscription">{t("admin.campaigns.cpaEventSubscription")}</option>
                  <option value="lead">{t("admin.campaigns.cpaEventLead")}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.budgetLabel")}</label>
                <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="100000" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
              </div>
            </>
          )}
          <div>
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.startDate")}</label>
            <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.endDate")}</label>
            <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* City Targeting */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-medium font-dm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.targeting")}</label>
            <p className="text-xs text-white/30 mb-2">{t("admin.campaigns.targetingHint")}</p>
            <div className="relative">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder={t("admin.campaigns.searchCity")}
                className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
              />
              {citySearch && (
                <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl">
                  {SENEGAL_CITIES.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()) && !targetCities.includes(c)).map((city) => (
                    <li
                      key={city}
                      onClick={() => { setTargetCities([...targetCities, city]); setCitySearch(""); }}
                      className="px-4 py-2 text-sm cursor-pointer hover:bg-white/10 transition text-white/70"
                    >
                      {city}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {targetCities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {targetCities.map((city) => (
                  <span key={city} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(211,84,0,0.15)", color: "#D35400" }}>
                    {city}
                    <button onClick={() => setTargetCities(targetCities.filter((c) => c !== city))} className="hover:text-white transition">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pixel Linking (collapsible) */}
        {brandPixels.length > 0 && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowPixelSection(!showPixelSection)}
              className="flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white/80 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {t("admin.campaigns.conversionTracking")}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showPixelSection ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showPixelSection && (
              <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xs text-white/30 mb-3">
                  {t("admin.campaigns.pixelLinkDesc")}
                </p>
                <select
                  value={selectedPixelId || ""}
                  onChange={(e) => setSelectedPixelId(e.target.value || null)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
                >
                  <option value="">{t("admin.campaigns.noPixel")}</option>
                  {brandPixels.filter((p) => p.is_active).map((p) => (
                    <option key={p.pixel_id} value={p.pixel_id}>
                      {p.name} ({p.platform}) — {p.pixel_id}
                    </option>
                  ))}
                </select>
                {selectedPixelId && (
                  <p className="text-xs text-emerald-400 mt-2">
                    {t("admin.campaigns.pixelLinkedSuccess")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Estimation section */}
        {((pricingModel === "cpc" && Number(form.cpc) > 0) || (pricingModel === "cpa" && Number(cpaAmount) >= 100)) && Number(form.budget) > 0 && (() => {
          const budget = Number(form.budget);
          if (pricingModel === "cpa") {
            const cpa = Number(cpaAmount);
            const estimatedConversions = Math.floor(budget / cpa);
            const echoEarningsPerAction = Math.floor(cpa * ECHO_CPA_SHARE_PERCENT / 100);
            return (
              <div className="mt-5 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)" }}>
                <h4 className="text-sm font-bold font-syne text-white mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#D35400" }}><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                  {t("admin.campaigns.estimationTitle")}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-lg font-black font-syne" style={{ color: "#D35400" }}>{estimatedConversions.toLocaleString()}</p>
                    <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.estConversions")}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-lg font-black font-syne" style={{ color: "#D35400" }}>{formatFCFA(echoEarningsPerAction)}</p>
                    <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.echoEarnsPerAction")}</p>
                  </div>
                </div>
                <p className="text-[10px] text-white/25 mt-2 text-center">{t("admin.campaigns.cpaEstNote")}</p>
              </div>
            );
          }
          const cpc = Number(form.cpc);
          const estimatedClicks = Math.floor(budget / cpc);
          const echoEarningsPerClick = Math.floor(cpc * ECHO_SHARE_PERCENT / 100);
          const isAboveAvg = avgCpc > 0 && cpc >= avgCpc;
          return (
            <div className="mt-5 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <h4 className="text-sm font-bold font-syne text-white mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#D35400" }}><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                {t("admin.campaigns.estimationTitle")}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-black font-syne" style={{ color: "#D35400" }}>{estimatedClicks.toLocaleString()}</p>
                  <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.estClicks")}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-black font-syne" style={{ color: "#D35400" }}>{formatFCFA(echoEarningsPerClick)}</p>
                  <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.echoEarnsPerClick")}</p>
                </div>
              </div>
              {isAboveAvg && (
                <p className="text-xs text-emerald-400 mt-3 text-center">
                  {t("admin.campaigns.estEngagementBoost")}
                </p>
              )}
              {avgCpc > 0 && cpc < avgCpc && (
                <p className="text-xs text-yellow-400/70 mt-3 text-center">
                  {t("admin.campaigns.estLowCpcWarning", { avg: formatFCFA(avgCpc) })}
                </p>
              )}
            </div>
          );
        })()}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <p>{error}</p>
            {showRechargePrompt && (
              <a href="/admin/wallet" className="inline-block mt-2 px-4 py-2 rounded-xl font-semibold text-xs transition" style={{ background: "rgba(211,84,0,0.15)", color: "#D35400" }}>
                {t("admin.campaigns.rechargeWallet")}
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="text-white/30 hover:text-white/60 text-sm transition"
          >
            {t("admin.campaigns.cancel")}
          </button>
          <div className="flex gap-3">
            {!editingId && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || !form.title || !form.destination_url || !form.budget || (pricingModel === "cpc" && !form.cpc) || (pricingModel === "cpa" && (!cpaAmount || !cpaEvent || !selectedPixelId)) || (objective === "awareness" && creativeUrls.length === 0)}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/10 transition disabled:opacity-40"
              >
                {submitting ? "..." : t("admin.campaigns.saveDraft")}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || !form.title || !form.destination_url || !form.budget || (pricingModel === "cpc" && !form.cpc) || (pricingModel === "cpa" && (!cpaAmount || !cpaEvent || !selectedPixelId)) || (objective === "awareness" && creativeUrls.length === 0)}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-40" style={{ background: "#D35400" }}
            >
              {submitting ? t("common.saving") : editingId ? t("common.save") : t("admin.campaigns.launchRythme")}
            </button>
          </div>
        </div>

        {showCancelConfirm && (
          <CancelConfirmModal
            onContinueEditing={() => setShowCancelConfirm(false)}
            onSaveDraft={() => { setShowCancelConfirm(false); handleSubmit(true); }}
            onQuitWithout={() => { setShowCancelConfirm(false); resetForm(); setView("list"); }}
          />
        )}

        {showDeleteConfirm && (
          <DeleteConfirmModal
            deleting={actionLoading === "delete"}
            onCancel={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
            onConfirm={confirmDelete}
          />
        )}
      </div>
    </div>
  );
}
