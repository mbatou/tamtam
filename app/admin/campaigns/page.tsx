"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { Campaign } from "@/lib/types";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { SENEGAL_CITIES } from "@/lib/cities";
import { trackEvent } from "@/lib/analytics";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import type { CampaignObjective } from "@/lib/types";

type View = "list" | "detail" | "objective" | "form";

export default function AdminCampaignsPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "",
  });
  const [creativeUrls, setCreativeUrls] = useState<string[]>([]);
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRechargePrompt, setShowRechargePrompt] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [avgCpc, setAvgCpc] = useState<number>(0);
  const [imageFormatHint, setImageFormatHint] = useState<{ type: "warning" | "success"; message: string } | null>(null);
  const [objective, setObjective] = useState<CampaignObjective>("traffic");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [perf, setPerf] = useState<{
    totalClicks: number; validClicks: number; activeEchos: number; costPerVisitor: number;
    chartData: { date: string; valid: number; fraud: number }[];
    topEchos: { name: string; city: string; clicks: number; earnings: number }[];
    geoBreakdown: { city: string; clicks: number; percentage: number }[];
  } | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  // Per-campaign real click + echo counts from stats API
  const [campaignStats, setCampaignStats] = useState<Record<string, { realClicks: number; realValidClicks: number; echoCount: number }>>({});
  const supabase = createClient();

  useEffect(() => { loadCampaigns(); }, []);
  useEffect(() => {
    fetch("/api/campaigns/avg-cpc")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setAvgCpc(data.avgCpc));
    // Fetch enriched campaign data (real click + echo counts)
    fetch("/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.campaigns) {
          const map: Record<string, { realClicks: number; realValidClicks: number; echoCount: number }> = {};
          for (const c of data.campaigns) {
            map[c.id] = { realClicks: c.realClicks || 0, realValidClicks: c.realValidClicks || 0, echoCount: c.echoCount || 0 };
          }
          setCampaignStats(map);
        }
      });
  }, []);
  useEffect(() => {
    if (view === "detail" && selectedCampaign) {
      setPerfLoading(true);
      setPerf(null);
      fetch(`/api/admin/campaigns/performance?campaignId=${selectedCampaign.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { setPerf(data); setPerfLoading(false); })
        .catch(() => setPerfLoading(false));
    }
  }, [view, selectedCampaign?.id]);

  async function loadCampaigns() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/campaigns?batteur_id=${session.user.id}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setCampaigns(list);
    if (selectedCampaign) {
      const updated = list.find((c: Campaign) => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);
      else { setSelectedCampaign(null); setView("list"); }
    }
    setLoading(false);
  }

  function resetForm() {
    setForm({ title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "" });
    setCreativeUrls([]);
    setTargetCities([]);
    setCitySearch("");
    setEditingId(null);
    setObjective("traffic");
    setError(null);
    setShowRechargePrompt(false);
    setShowCancelConfirm(false);
  }

  function openDetail(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setView("detail");
  }

  function openNewForm() {
    resetForm();
    setView("objective");
  }

  function openEditForm(campaign: Campaign) {
    setForm({
      title: campaign.title,
      description: campaign.description || "",
      destination_url: campaign.destination_url,
      cpc: campaign.cpc.toString(),
      budget: campaign.budget.toString(),
      starts_at: campaign.starts_at ? campaign.starts_at.slice(0, 16) : "",
      ends_at: campaign.ends_at ? campaign.ends_at.slice(0, 16) : "",
    });
    setCreativeUrls(campaign.creative_urls || []);
    setTargetCities(campaign.target_cities || []);
    setEditingId(campaign.id);
    setObjective(campaign.objective || "traffic");
    setError(null);
    setShowRechargePrompt(false);
    setView("form");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setImageFormatHint(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check aspect ratio for images
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const aspectRatio = img.height / img.width;
          if (aspectRatio < 1.2) {
            setImageFormatHint({ type: "warning", message: "imageFormatWarning" });
          } else if (aspectRatio >= 1.7 && aspectRatio <= 1.85) {
            setImageFormatHint({ type: "success", message: "imageFormatSuccess" });
          } else {
            setImageFormatHint(null);
          }
          URL.revokeObjectURL(img.src);
        };
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/campaigns/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setCreativeUrls((prev) => [...prev, data.url]);
      } else {
        setError(data.error || t("admin.campaigns.uploadError"));
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeCreative(index: number) {
    setCreativeUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(asDraft = false) {
    setSubmitting(true);
    setError(null);
    setShowRechargePrompt(false);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title,
        description: form.description || null,
        destination_url: form.destination_url,
        cpc: form.cpc,
        budget: form.budget,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        creative_urls: creativeUrls,
        target_cities: targetCities,
        objective,
        ...(!editingId && asDraft ? { save_as_draft: true } : {}),
      };
      const res = await fetch("/api/campaigns", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "INSUFFICIENT_BALANCE") setShowRechargePrompt(true);
        let errorMsg = data.error || t("common.error");
        if (data.details) {
          const fields = Object.entries(data.details).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
          if (fields) errorMsg += ` (${fields})`;
        }
        setError(errorMsg);
        setSubmitting(false);
        return;
      }
      resetForm();
      setSubmitting(false);
      await loadCampaigns();
      if (asDraft) {
        setView("list");
      } else {
        trackEvent.brandCreateCampaign(Number(form.budget), Number(form.cpc));
        setSelectedCampaign(data);
        setView("detail");
      }
    } catch {
      setError(t("common.networkRetry"));
      setSubmitting(false);
    }
  }

  async function handleAction(campaignId: string, action: "pause" | "activate" | "complete" | "delete") {
    setActionLoading(action);
    try {
      if (action === "delete") {
        if (!confirm(t("admin.campaigns.deleteConfirm"))) {
          setActionLoading(null);
          return;
        }
        const res = await fetch("/api/campaigns", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: campaignId }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || t("common.error"));
        } else {
          setSelectedCampaign(null);
          setView("list");
        }
      } else {
        const statusMap = { pause: "paused", activate: "active", complete: "completed" } as const;
        const res = await fetch("/api/campaigns", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: campaignId, status: statusMap[action] }),
        });
        if (!res.ok) {
          const data = await res.json();
          if (data.code === "INSUFFICIENT_BALANCE") {
            alert(t("admin.campaigns.insufficientBalance"));
          } else {
            alert(data.error || t("common.error"));
          }
        }
      }
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmitDraft(campaignId: string) {
    setActionLoading("submitDraft");
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaignId, moderation_status: "pending" }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.code === "INSUFFICIENT_BALANCE") {
          alert(t("admin.campaigns.insufficientBalance"));
        } else {
          alert(data.error || t("common.error"));
        }
      } else {
        trackEvent.brandLaunchCampaign(campaignId);
      }
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusLabel(campaign: Campaign) {
    if (campaign.status === "draft" && campaign.moderation_status === "pending") return t("admin.campaigns.pendingValidation");
    const map: Record<string, string> = {
      active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected"),
    };
    return map[campaign.status] || campaign.status;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ==================== DETAIL VIEW ====================
  if (view === "detail" && selectedCampaign) {
    const c = selectedCampaign;
    const progress = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
    const remaining = Math.max(0, c.budget - c.spent);
    const budgetConsumed = c.spent >= c.budget;
    const isActive = c.status === "active";
    const isPaused = c.status === "paused";
    const isDraft = c.status === "draft" && c.moderation_status !== "pending";
    const isPendingReview = c.status === "draft" && c.moderation_status === "pending";
    const isEnded = c.status === "completed" || c.status === "rejected";

    return (
      <div className="p-6 max-w-5xl">
        <button onClick={() => { setSelectedCampaign(null); setView("list"); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t("admin.campaigns.backToRythmes")}
        </button>

        {/* Draft banner */}
        {isDraft && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-400">{t("admin.campaigns.draft")}</p>
              <p className="text-xs text-white/40">{t("admin.campaigns.draftNotice")}</p>
            </div>
            <button onClick={() => handleSubmitDraft(c.id)} disabled={actionLoading !== null} className="px-5 py-2.5 rounded-xl bg-accent text-dark text-sm font-bold hover:bg-accent/90 transition disabled:opacity-40">
              {actionLoading === "submitDraft" ? "..." : t("admin.campaigns.launchDraft")}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{c.title}</h1>
              <span className={`badge-${c.status === "draft" && c.moderation_status === "pending" ? "pending" : c.status}`}>{getStatusLabel(c)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                (c.objective || "traffic") === "awareness"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-teal-500/20 text-teal-300"
              }`}>
                {(c.objective || "traffic") === "awareness" ? "Notoriete" : "Trafic"}
              </span>
            </div>
            {c.description && <p className="text-white/40 text-sm max-w-xl">{c.description}</p>}
            {c.target_cities && c.target_cities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs text-white/30">📍</span>
                {c.target_cities.map((city) => (
                  <span key={city} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{city}</span>
                ))}
              </div>
            )}
            <p className="text-white/20 text-xs mt-2">{timeAgo(c.created_at)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <button onClick={() => handleSubmitDraft(c.id)} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/20 transition disabled:opacity-40">
                {actionLoading === "submitDraft" ? "..." : t("admin.campaigns.launchDraft")}
              </button>
            )}
            {isActive && (
              <button onClick={() => handleAction(c.id, "pause")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 transition disabled:opacity-40">
                {actionLoading === "pause" ? "..." : t("admin.campaigns.pause")}
              </button>
            )}
            {isPaused && (
              <button onClick={() => handleAction(c.id, "activate")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40">
                {actionLoading === "activate" ? "..." : t("admin.campaigns.reactivate")}
              </button>
            )}
            {(isActive || isPaused) && (
              <button onClick={() => handleAction(c.id, "complete")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40">
                {actionLoading === "complete" ? "..." : t("admin.campaigns.finish")}
              </button>
            )}
            {!isEnded && (
              <button onClick={() => openEditForm(c)} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition">
                {t("common.edit")}
              </button>
            )}
            <button onClick={() => handleAction(c.id, "delete")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-40">
              {actionLoading === "delete" ? "..." : t("common.delete")}
            </button>
          </div>
        </div>

        {/* Pending review banner */}
        {isPendingReview && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-8">
            <span className="text-orange-400 font-bold">⏳ {t("admin.campaigns.pendingReview")}</span>
            <p className="text-gray-400 text-sm mt-1">
              {t("admin.campaigns.pendingReviewDesc")}
            </p>
          </div>
        )}

        {/* Rejected banner */}
        {c.status === "rejected" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
            <span className="text-red-400 font-bold">❌ {t("admin.campaigns.modificationsRequired")}</span>
            {c.moderation_reason && (
              <p className="text-gray-400 text-sm mt-1">{c.moderation_reason}</p>
            )}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{t("common.budget")}</p>
            <p className="text-xl font-bold">{formatFCFA(c.budget)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{t("admin.dashboard.spent")}</p>
            <p className="text-xl font-bold text-accent">{formatFCFA(c.spent)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{t("admin.campaigns.remaining")}</p>
            <p className={`text-xl font-bold ${budgetConsumed ? "text-emerald-400" : "text-primary"}`}>
              {budgetConsumed ? t("admin.campaigns.fullyConsumed") : formatFCFA(remaining)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">CPC</p>
            <p className="text-xl font-bold">{formatFCFA(c.cpc)}</p>
          </div>
        </div>

        {/* Objective context */}
        {(c.objective || "traffic") === "awareness" ? (
          <p className="text-sm text-white/40 mb-4">
            Chaque clic signifie qu&apos;une personne a vu votre visuel ET a clique.
          </p>
        ) : (
          <p className="text-sm text-white/40 mb-4">
            Chaque clic est un visiteur verifie sur votre lien.
          </p>
        )}

        {/* Progress bar */}
        <div className="glass-card p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">{t("admin.campaigns.budgetProgress")}</p>
            <p className="text-sm font-bold text-primary">{Math.round(progress)}%</p>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/30">
            <span>{formatFCFA(c.spent)}</span>
            <span>{formatFCFA(c.budget)}</span>
          </div>
        </div>

        {/* Performance Overview — skeleton while loading */}
        {perfLoading && (
          <div className="space-y-4 mb-8 animate-pulse">
            {/* Metrics skeleton */}
            <div className="glass-card p-5">
              <div className="h-5 w-32 bg-white/10 rounded mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-20 bg-white/10 rounded mb-2" />
                    <div className="h-7 w-16 bg-white/10 rounded mb-1" />
                    <div className="h-2 w-24 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Chart skeleton */}
            <div className="glass-card p-5">
              <div className="h-5 w-40 bg-white/10 rounded mb-4" />
              <div className="flex items-end gap-1 h-48">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-white/5 rounded-t"
                    style={{ height: `${25 + (i % 3) * 20 + (i % 5) * 8}%` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {perf && (
          <div className="space-y-4 mb-8">
            {/* Summary metrics */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-lg mb-4">{t("admin.campaigns.performance")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-white/40">{t("admin.campaigns.totalReach")}</p>
                  <p className="text-2xl font-bold">{perf.totalClicks.toLocaleString()}</p>
                  <p className="text-xs text-white/30">{t("admin.campaigns.totalReachSub")}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">{t("admin.campaigns.realVisitors")}</p>
                  <p className="text-2xl font-bold text-accent">{perf.validClicks.toLocaleString()}</p>
                  <p className="text-xs text-white/30">{t("admin.campaigns.verifiedClicks")}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">{t("admin.campaigns.costPerVisitor")}</p>
                  <p className="text-2xl font-bold">{perf.costPerVisitor} FCFA</p>
                  <p className="text-xs text-white/30">{t("admin.campaigns.perVerifiedClick")}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">{t("admin.campaigns.activeEchos")}</p>
                  <p className="text-2xl font-bold">{perf.activeEchos}</p>
                  <p className="text-xs text-white/30">{t("admin.campaigns.sharingYourLink")}</p>
                </div>
              </div>
            </div>

            {/* Performance chart */}
            <div className="glass-card p-5">
              <h3 className="font-bold mb-4">{t("admin.campaigns.clicksPerDay")}</h3>
              {perf.chartData && perf.chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={perf.chartData}>
                      <defs>
                        <linearGradient id="validGradientPerf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1ABC9C" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1ABC9C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#666", fontSize: 12 }}
                        tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "#1A1A2E", border: "1px solid #333", borderRadius: 8 }}
                        labelFormatter={(d) => new Date(String(d)).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                        formatter={(value, name) => [value, name === "valid" ? t("admin.campaigns.realVisitorsLabel") : t("admin.campaigns.total")]}
                      />
                      <Area type="monotone" dataKey="valid" stroke="#1ABC9C" fill="url(#validGradientPerf)" strokeWidth={2} />
                      <Area type="monotone" dataKey="fraud" stroke="#444" fill="none" strokeWidth={1} strokeDasharray="4 4" name="total" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-white/30">
                  {t("admin.campaigns.noDataYet")}
                </div>
              )}
            </div>

            {/* Two-column: Top Échos + Geographic breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top Échos leaderboard */}
              <div className="glass-card p-5">
                <h3 className="font-bold mb-4">{t("admin.campaigns.topEchos")}</h3>
                {perf.topEchos.length > 0 ? (
                  <div className="space-y-3">
                    {perf.topEchos.map((echo, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `#${i + 1}`}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{echo.name}</p>
                            <p className="text-xs text-white/30">{echo.city}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-accent font-bold text-sm">{echo.clicks} {t("common.clicks")}</p>
                          <p className="text-xs text-white/30">{echo.earnings.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-white/30 text-sm">
                    {t("admin.campaigns.noEchoClicks")}
                  </p>
                )}
              </div>

              {/* Geographic breakdown */}
              <div className="glass-card p-5">
                <h3 className="font-bold mb-4">{t("admin.campaigns.geoBreakdown")}</h3>
                {perf.geoBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {perf.geoBreakdown.map((geo, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{geo.city}</span>
                          <span className="text-sm text-white/40">{geo.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${geo.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-white/30 text-sm">
                    {t("admin.campaigns.geoComingSoon")}
                  </p>
                )}
              </div>
            </div>

            {/* ROI comparison */}
            <div className="glass-card p-5">
              <h3 className="font-bold mb-3">{t("admin.campaigns.roi")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/40 mb-1">Facebook Ads</p>
                  <p className="font-bold">200-500 FCFA/clic</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/40 mb-1">Instagram Ads</p>
                  <p className="font-bold">300-800 FCFA/clic</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <p className="text-emerald-400 mb-1">Tamtam</p>
                  <p className="text-emerald-400 font-bold">{perf.costPerVisitor} FCFA/clic</p>
                  <p className="text-emerald-400/60 text-xs">
                    {perf.costPerVisitor < 200
                      ? t("admin.campaigns.percentCheaper", { pct: String(Math.round((1 - perf.costPerVisitor / 350) * 100)) })
                      : t("admin.campaigns.competitive")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass-card p-5">
            <p className="text-xs text-white/40 font-semibold mb-3">{t("admin.campaigns.info")}</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/30">{t("admin.campaigns.destUrl")}</p>
                <a href={c.destination_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{c.destination_url}</a>
              </div>
              {c.starts_at && (
                <div>
                  <p className="text-xs text-white/30">{t("admin.campaigns.startDate")}</p>
                  <p className="text-sm">{new Date(c.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              )}
              {c.ends_at && (
                <div>
                  <p className="text-xs text-white/30">{t("admin.campaigns.endDate")}</p>
                  <p className="text-sm">{new Date(c.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs text-white/40 font-semibold mb-3">{t("admin.campaigns.visuals")}</p>
            {c.creative_urls && c.creative_urls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {c.creative_urls.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10">
                    {url.match(/\.(mp4|webm)/) ? (
                      <video src={url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={url} alt={`Visuel ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/20">{t("admin.campaigns.noVisuals")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== OBJECTIVE PICKER VIEW ====================
  if (view === "objective") {
    const objectives = [
      {
        id: "traffic" as const,
        label: "Trafic",
        description: "Maximisez les clics vers votre site ou lien",
        detail: "Les Echos partagent votre lien. Vous payez par clic verifie.",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
        disabled: false,
      },
      {
        id: "awareness" as const,
        label: "Notoriete",
        description: "Maximisez la visibilite de votre marque",
        detail: "Les Echos partagent votre visuel + lien ensemble. Votre image est vue a chaque partage.",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
        disabled: false,
      },
      {
        id: "conversion" as const,
        label: "Conversion",
        description: "Suivez les actions sur votre site",
        detail: "Bientot disponible — Tamtam Pixel",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
        disabled: true,
      },
    ];

    return (
      <div className="p-6 max-w-4xl">
        <button onClick={() => { resetForm(); setView("list"); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t("common.back")}
        </button>

        <h1 className="text-2xl font-bold mb-2">{t("admin.campaigns.newRythme")}</h1>
        <p className="text-white/40 text-sm mb-8">Quel est l&apos;objectif de votre campagne ?</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {objectives.map((obj) => (
            <button
              key={obj.id}
              onClick={() => !obj.disabled && setObjective(obj.id as CampaignObjective)}
              disabled={obj.disabled}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                obj.disabled
                  ? "opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02]"
                  : objective === obj.id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              {obj.disabled && (
                <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-semibold">
                  Bientot
                </span>
              )}
              {!obj.disabled && objective === obj.id && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              )}
              <div className="text-primary mb-3">{obj.icon}</div>
              <h3 className="font-bold text-lg mb-1">{obj.label}</h3>
              <p className="text-sm text-white/60 mb-2">{obj.description}</p>
              <p className="text-xs text-white/30">{obj.detail}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setView("form")}
            className="btn-primary px-8 py-3"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // ==================== FORM VIEW ====================
  if (view === "form") {
    return (
      <div className="p-6 max-w-4xl">
        <button onClick={() => { resetForm(); setView(editingId ? "detail" : "list"); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t("common.back")}
        </button>

        <h1 className="text-2xl font-bold mb-4">{editingId ? t("admin.campaigns.editRythme") : t("admin.campaigns.newRythme")}</h1>

        {/* Objective indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
            objective === "awareness"
              ? "bg-blue-500/20 text-blue-300"
              : "bg-teal-500/20 text-teal-300"
          }`}>
            {objective === "awareness" ? "Notoriete" : "Trafic"}
          </span>
          {!editingId && (
            <button onClick={() => setView("objective")} className="text-xs text-white/30 hover:text-white/50 transition">
              Changer
            </button>
          )}
        </div>

        {objective === "awareness" && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-lg">📸</span>
            <div>
              <p className="text-sm font-semibold text-blue-300">Campagne Notoriete</p>
              <p className="text-xs text-white/40">Les Echos partageront votre visuel + lien ensemble. L&apos;image est obligatoire.</p>
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.titleLabel")}</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("admin.campaigns.titlePlaceholder")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.description")}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("admin.campaigns.descPlaceholder")} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.destUrlLabel")}</label>
              <input type="url" value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder={t("admin.campaigns.destUrlPlaceholder")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">
                {t("admin.campaigns.campaignVisuals")}
                {objective === "awareness" && <span className="text-red-400 ml-1">*</span>}
              </label>
              {objective === "awareness" && creativeUrls.length === 0 && (
                <p className="text-xs text-red-400 mb-2">Image obligatoire pour une campagne Notoriete</p>
              )}
              <div className="flex flex-wrap gap-3 mb-3">
                {creativeUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    {url.match(/\.(mp4|webm)/) ? (
                      <video src={url} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                    ) : (
                      <img src={url} alt={`Creative ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
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
                  <span>·</span>
                  <span>👻 {t("admin.campaigns.snapchatComingSoon")}</span>
                </div>
              </div>
              {imageFormatHint && (
                <p className={`text-xs mt-1 ${imageFormatHint.type === "warning" ? "text-orange-400" : "text-green-400"}`}>
                  {imageFormatHint.type === "warning" ? `⚠️ ${t("admin.campaigns.imageFormatWarning")}` : `✓ ${t("admin.campaigns.imageFormatSuccess")}`}
                </p>
              )}
              <p className="text-xs text-white/20 mt-1">{t("admin.campaigns.visualFormats")}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.cpcLabel")}</label>
              <input type="number" value={form.cpc} onChange={(e) => setForm({ ...form, cpc: e.target.value })} placeholder="25" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
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
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.budgetLabel")}</label>
              <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="100000" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.startDate")}</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.endDate")}</label>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>

            {/* City Targeting */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.campaigns.targeting")}</label>
              <p className="text-xs text-white/30 mb-2">{t("admin.campaigns.targetingHint")}</p>
              <div className="relative">
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder={t("admin.campaigns.searchCity")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
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
                    <span key={city} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                      {city}
                      <button onClick={() => setTargetCities(targetCities.filter((c) => c !== city))} className="hover:text-white transition">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Estimation section */}
          {Number(form.cpc) > 0 && Number(form.budget) > 0 && (() => {
            const cpc = Number(form.cpc);
            const budget = Number(form.budget);
            const estimatedClicks = Math.floor(budget / cpc);
            const echoEarningsPerClick = Math.floor(cpc * ECHO_SHARE_PERCENT / 100);
            const isAboveAvg = avgCpc > 0 && cpc >= avgCpc;
            return (
              <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                  {t("admin.campaigns.estimationTitle")}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-primary">{estimatedClicks.toLocaleString()}</p>
                    <p className="text-[10px] text-white/40">{t("admin.campaigns.estClicks")}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-accent">{formatFCFA(echoEarningsPerClick)}</p>
                    <p className="text-[10px] text-white/40">{t("admin.campaigns.echoEarnsPerClick")}</p>
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
                <a href="/admin/wallet" className="inline-block mt-2 px-4 py-2 rounded-xl bg-primary/20 text-primary font-semibold text-xs hover:bg-primary/30 transition">
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
                  disabled={submitting || !form.title || !form.destination_url || !form.cpc || !form.budget || (objective === "awareness" && creativeUrls.length === 0)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/10 transition disabled:opacity-40"
                >
                  {submitting ? "..." : t("admin.campaigns.saveDraft")}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !form.title || !form.destination_url || !form.cpc || !form.budget || (objective === "awareness" && creativeUrls.length === 0)}
                className="btn-primary px-8 py-3 disabled:opacity-40"
              >
                {submitting ? t("common.saving") : editingId ? t("common.save") : t("admin.campaigns.launchRythme")}
              </button>
            </div>
          </div>

          {showCancelConfirm && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full">
                <h3 className="text-white font-bold text-lg mb-2">{t("admin.campaigns.cancelConfirm")}</h3>
                <p className="text-white/40 text-sm mb-6">
                  {t("admin.campaigns.cancelMessage")}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition"
                  >
                    {t("admin.campaigns.continueEditing")}
                  </button>
                  <button
                    onClick={() => { setShowCancelConfirm(false); handleSubmit(true); }}
                    className="flex-1 py-2.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 transition"
                  >
                    {t("admin.campaigns.saveDraft")}
                  </button>
                  <button
                    onClick={() => { setShowCancelConfirm(false); resetForm(); setView("list"); }}
                    className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition"
                  >
                    {t("admin.campaigns.quitWithout")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== LIST VIEW (Card Grid) ====================
  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{t("admin.campaigns.title")}</h1>
        <button onClick={openNewForm} className="btn-primary text-sm">{t("admin.campaigns.newRythme")}</button>
      </div>

      {campaigns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3m0 0L9.5 7.5M12 3l2.5 4.5" />
            </svg>
          </div>
          <p className="text-white/40 text-sm mb-2">{t("admin.campaigns.noRythmes")}</p>
          <p className="text-xs text-white/30 mb-4">{t("admin.campaigns.noRythmesDesc")}</p>
          <button onClick={openNewForm} className="btn-primary text-sm">{t("admin.campaigns.createFirst")}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
            const stats = campaignStats[campaign.id];
            const realClicks = stats?.realValidClicks ?? 0;
            const echoCount = stats?.echoCount ?? 0;
            const estimatedClicks = realClicks > 0 ? realClicks : (campaign.cpc > 0 ? Math.floor(campaign.spent / campaign.cpc) : 0);
            const actualCPC = estimatedClicks > 0 ? Math.round(campaign.spent / estimatedClicks) : campaign.cpc;
            const isFinished = campaign.status === "completed";
            const budgetConsumed = progress >= 100;

            // Find best campaign by CPC for badge
            const allFinished = campaigns.filter(c => c.status === "completed" && c.spent > 0);
            const bestCPCId = allFinished.length > 1
              ? allFinished.sort((a, b) => {
                  const aCPC = a.cpc > 0 ? Math.floor(a.spent / a.cpc) : 0;
                  const bCPC = b.cpc > 0 ? Math.floor(b.spent / b.cpc) : 0;
                  return (aCPC > 0 ? a.spent / aCPC : Infinity) - (bCPC > 0 ? b.spent / bCPC : Infinity);
                })[0]?.id
              : null;

            return (
              <div
                key={campaign.id}
                className="glass-card p-5 hover:border-primary/30 transition-all group"
              >
                <div onClick={() => openDetail(campaign)} className="cursor-pointer">
                  {campaign.creative_urls && campaign.creative_urls.length > 0 ? (
                    <div className="h-32 rounded-xl overflow-hidden mb-4 border border-white/5">
                      <img src={campaign.creative_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-32 rounded-xl mb-4 bg-white/[0.02] border border-white/5 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/10">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate">{campaign.title}</h3>
                      {campaign.description && <p className="text-xs text-white/30 truncate mt-0.5">{campaign.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        (campaign.objective || "traffic") === "awareness"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-teal-500/20 text-teal-300"
                      }`}>
                        {(campaign.objective || "traffic") === "awareness" ? "Notoriete" : "Trafic"}
                      </span>
                      <span className={`badge-${campaign.status === "draft" && campaign.moderation_status === "pending" ? "pending" : campaign.status} shrink-0`}>{getStatusLabel(campaign)}</span>
                    </div>
                  </div>

                  {/* Budget progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/40">{formatFCFA(campaign.spent)}</span>
                      <span className={budgetConsumed ? "text-emerald-400 font-semibold" : "text-white/40"}>
                        {budgetConsumed ? t("admin.campaigns.fullyConsumed") : formatFCFA(campaign.budget)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${budgetConsumed ? "bg-emerald-500" : "bg-gradient-primary"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-3 text-xs text-white/40 mb-2">
                    <span>{echoCount} Échos</span>
                    <span>·</span>
                    <span>{estimatedClicks} {t("admin.campaigns.realClicks")}</span>
                    <span>·</span>
                    <span>{formatFCFA(actualCPC)}/{t("admin.campaigns.perClick")}</span>
                  </div>

                  {/* Performance badge */}
                  {bestCPCId === campaign.id && allFinished.length > 1 && (
                    <div className="mb-2">
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{t("admin.campaigns.bestCPC")}</span>
                    </div>
                  )}
                </div>

                {/* Draft actions */}
                {campaign.status === "draft" && campaign.moderation_status !== "pending" && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm(campaign); }}
                      className="flex-1 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSubmitDraft(campaign.id); }}
                      disabled={actionLoading !== null}
                      className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition disabled:opacity-40"
                    >
                      {actionLoading === "submitDraft" ? "..." : t("admin.campaigns.launchDraft")}
                    </button>
                  </div>
                )}

                {/* Relaunch button for finished campaigns */}
                {isFinished && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm({
                        title: campaign.title,
                        description: campaign.description || "",
                        destination_url: campaign.destination_url,
                        cpc: campaign.cpc.toString(),
                        budget: campaign.budget.toString(),
                        starts_at: "",
                        ends_at: "",
                      });
                      setCreativeUrls(campaign.creative_urls || []);
                      setEditingId(null);
                      setError(null);
                      setShowRechargePrompt(false);
                      setView("form");
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition"
                  >
                    {t("admin.campaigns.relaunch")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
