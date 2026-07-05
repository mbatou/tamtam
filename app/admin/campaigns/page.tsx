"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { Campaign, CampaignObjective, PricingModel } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

import CampaignDetailView from "./_components/CampaignDetailView";
import CampaignFormView from "./_components/CampaignFormView";
import CampaignListView from "./_components/CampaignListView";
import CampaignObjectiveView from "./_components/CampaignObjectiveView";
import CampaignsLoadingSkeleton from "./_components/CampaignsLoadingSkeleton";
import type {
  BrandPixel, CampaignAction, CampaignFormState, CampaignStatsMap,
  ConvData, DetailTab, ImageFormatHint, Lead, PerfData, View,
} from "./_components/types";

export default function AdminCampaignsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormState>({
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [avgCpc, setAvgCpc] = useState<number>(0);
  const [imageFormatHint, setImageFormatHint] = useState<ImageFormatHint>(null);
  const [objective, setObjective] = useState<CampaignObjective>("traffic");
  const [pricingModel, setPricingModel] = useState<PricingModel>("cpc");
  const [cpaAmount, setCpaAmount] = useState("");
  const [cpaEvent, setCpaEvent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [perf, setPerf] = useState<PerfData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  // Per-campaign real click + echo counts from stats API
  const [campaignStats, setCampaignStats] = useState<CampaignStatsMap>({});
  // Lead gen: leads tab data
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadActionLoading, setLeadActionLoading] = useState<string | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [landingSlug, setLandingSlug] = useState<string | null>(null);
  const [brandPixels, setBrandPixels] = useState<BrandPixel[]>([]);
  const [selectedPixelId, setSelectedPixelId] = useState<string | null>(null);
  const [showPixelSection, setShowPixelSection] = useState(false);
  // Conversion analytics state
  const [convData, setConvData] = useState<ConvData | null>(null);
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convPage, setConvPage] = useState(0);
  const supabase = createClient();

  // Keep a ref to the selected campaign so loaders/effects can read the latest
  // value without re-running when the selection changes.
  const selectedCampaignRef = useRef(selectedCampaign);
  selectedCampaignRef.current = selectedCampaign;
  const selectedCampaignId = selectedCampaign?.id;

  const loadCampaigns = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/campaigns?batteur_id=${session.user.id}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setCampaigns(list);
    const current = selectedCampaignRef.current;
    if (current) {
      const updated = list.find((c: Campaign) => c.id === current.id);
      if (updated) setSelectedCampaign(updated);
      else { setSelectedCampaign(null); setView("list"); }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => {
    fetch("/api/brand/pixels")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data?.pixels && setBrandPixels(data.pixels))
      .catch((err) => console.error("Failed to load brand pixels:", err));
  }, []);
  useEffect(() => {
    fetch("/api/campaigns/avg-cpc")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setAvgCpc(data.avgCpc))
      .catch((err) => console.error("Failed to load average CPC:", err));
    // Fetch enriched campaign data (real click + echo counts)
    fetch("/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.campaigns) return;
        const map: CampaignStatsMap = {};
        for (const c of data.campaigns) map[c.id] = { realClicks: c.realClicks || 0, realValidClicks: c.realValidClicks || 0, echoCount: c.echoCount || 0 };
        setCampaignStats(map);
      })
      .catch((err) => console.error("Failed to load campaign stats:", err));
  }, []);
  useEffect(() => {
    if (view === "detail" && selectedCampaignId) {
      setPerfLoading(true); setPerf(null);
      fetch(`/api/admin/campaigns/performance?campaignId=${selectedCampaignId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { setPerf(data); setPerfLoading(false); })
        .catch((err) => { console.error("Failed to load campaign performance:", err); setPerfLoading(false); });
    }
  }, [view, selectedCampaignId]);

  // Fetch conversion analytics when Conversions tab is active
  useEffect(() => {
    if (view === "detail" && selectedCampaign?.pixel_id && detailTab === "conversions") {
      setConvLoading(true); setConvData(null); setConvError(null);
      fetch(`/api/brand/conversions?campaign_id=${selectedCampaign.id}`)
        .then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
            setConvError(err?.error || `Erreur ${r.status}`); setConvLoading(false);
            return;
          }
          const data = await r.json();
          setConvData(data); setConvLoading(false);
        })
        .catch((e) => { setConvError(e.message); setConvLoading(false); });
    }
  }, [view, selectedCampaign?.id, selectedCampaign?.pixel_id, detailTab]);

  // Fetch leads and landing page slug for lead gen campaigns
  useEffect(() => {
    const campaign = selectedCampaignRef.current;
    if (view === "detail" && selectedCampaignId && campaign && (campaign.objective || "traffic") === "lead_generation") {
      setDetailTab("overview");
      // Fetch leads
      setLeadsLoading(true);
      fetch(`/api/admin/campaigns/leads?campaign_id=${selectedCampaignId}`)
        .then((r) => r.ok ? r.json() : { leads: [] })
        .then((data) => { setLeads(Array.isArray(data?.leads) ? data.leads : []); setLeadsLoading(false); })
        .catch((err) => { console.error("Failed to load leads:", err); setLeads([]); setLeadsLoading(false); });
      // Fetch landing page slug
      if (campaign.landing_page_id) {
        fetch(`/api/landing-pages`)
          .then((r) => r.ok ? r.json() : [])
          .then((pages: { id: string; slug: string }[]) => {
            const match = Array.isArray(pages) ? pages.find((p) => p.id === campaign.landing_page_id) : null;
            setLandingSlug(match?.slug || null);
          })
          .catch((err) => { console.error("Failed to load landing pages:", err); setLandingSlug(null); });
      } else {
        setLandingSlug(null);
      }
    }
  }, [view, selectedCampaignId]);

  function resetForm() {
    setForm({ title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "" });
    setCreativeUrls([]); setTargetCities([]); setCitySearch(""); setEditingId(null);
    setObjective("traffic"); setPricingModel("cpc"); setCpaAmount(""); setCpaEvent("");
    setSelectedPixelId(null); setError(null); setShowRechargePrompt(false); setShowCancelConfirm(false);
  }

  function openDetail(campaign: Campaign) { setSelectedCampaign(campaign); setView("detail"); }

  function openNewForm() { resetForm(); setView("objective"); }

  function openEditForm(campaign: Campaign) {
    setForm({
      title: campaign.title, description: campaign.description || "", destination_url: campaign.destination_url,
      cpc: campaign.cpc.toString(), budget: campaign.budget.toString(),
      starts_at: campaign.starts_at ? campaign.starts_at.slice(0, 16) : "",
      ends_at: campaign.ends_at ? campaign.ends_at.slice(0, 16) : "",
    });
    setCreativeUrls(campaign.creative_urls || []); setTargetCities(campaign.target_cities || []);
    setEditingId(campaign.id); setObjective(campaign.objective || "traffic");
    setPricingModel(campaign.pricing_model || "cpc");
    setCpaAmount(campaign.cpa_amount?.toString() || ""); setCpaEvent(campaign.cpa_event || "");
    setSelectedPixelId(campaign.pixel_id || null);
    setError(null); setShowRechargePrompt(false);
    setView("form");
  }

  // Lead gen campaigns (shown with the purple objective badge) are edited in
  // the dedicated lead-gen editor; everything else uses the inline form.
  function handleEdit(campaign: Campaign) {
    if (campaign.objective === "lead_generation") router.push(`/admin/campaigns/lead-gen?draft=${campaign.id}`);
    else openEditForm(campaign);
  }

  function handleLaunchDraft(campaign: Campaign) {
    if (campaign.objective === "lead_generation") router.push(`/admin/campaigns/lead-gen?draft=${campaign.id}`);
    else handleSubmitDraft(campaign.id);
  }

  function handleRelaunch(campaign: Campaign) {
    setForm({
      title: campaign.title, description: campaign.description || "", destination_url: campaign.destination_url,
      cpc: campaign.cpc.toString(), budget: campaign.budget.toString(),
      starts_at: "", ends_at: "",
    });
    setCreativeUrls(campaign.creative_urls || []); setEditingId(null);
    setError(null); setShowRechargePrompt(false);
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
          if (aspectRatio < 1.2) setImageFormatHint({ type: "warning", message: "imageFormatWarning" });
          else if (aspectRatio >= 1.7 && aspectRatio <= 1.85) setImageFormatHint({ type: "success", message: "imageFormatSuccess" });
          else setImageFormatHint(null);
          URL.revokeObjectURL(img.src);
        };
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/campaigns/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) setCreativeUrls((prev) => [...prev, data.url]);
      else setError(data.error || t("admin.campaigns.uploadError"));
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
        title: form.title, description: form.description || null, destination_url: form.destination_url,
        cpc: pricingModel === "cpa" ? 0 : form.cpc, budget: form.budget,
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
        creative_urls: creativeUrls, target_cities: targetCities,
        objective, pricing_model: pricingModel,
        ...(pricingModel === "cpa" ? { cpa_amount: cpaAmount, cpa_event: cpaEvent } : {}),
        ...(selectedPixelId ? { pixel_id: selectedPixelId } : {}),
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

  async function handleAction(campaignId: string, action: CampaignAction) {
    if (action === "delete") {
      setDeleteTargetId(campaignId);
      setShowDeleteConfirm(true);
      return;
    }
    setActionLoading(action);
    try {
      const body: Record<string, unknown> = { id: campaignId };
      if (action === "resubmit") {
        body.moderation_status = "pending";
      } else {
        const statusMap = { pause: "paused", activate: "active", complete: "completed" } as const;
        body.status = statusMap[action];
      }
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.code === "INSUFFICIENT_BALANCE") alert(t("admin.campaigns.insufficientBalance"));
        else alert(data.error || t("common.error"));
      }
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    setActionLoading("delete");
    setShowDeleteConfirm(false);
    try {
      const res = await fetch("/api/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTargetId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("common.error"));
      } else {
        const data = await res.json();
        const refundMsg = data.refunded ? ` (+${formatFCFA(data.refunded)} remboursé)` : "";
        setError(null);
        setSelectedCampaign(null);
        setView("list");
        await loadCampaigns();
        // Brief success toast via error state (green would be ideal, but reuse existing pattern)
        setError(`✓ Campagne supprimée${refundMsg}`);
        setTimeout(() => setError(null), 4000);
      }
    } catch {
      setError(t("common.networkRetry"));
    } finally {
      setActionLoading(null);
      setDeleteTargetId(null);
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
        if (data.code === "INSUFFICIENT_BALANCE") alert(t("admin.campaigns.insufficientBalance"));
        else alert(data.error || t("common.error"));
      } else {
        trackEvent.brandLaunchCampaign(campaignId);
      }
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeadAction(leadId: string, action: "verify" | "reject") {
    const lead = leads.find(l => l.id === leadId);
    if (action === "reject" && lead?.status === "verified") {
      if (!confirm(t("admin.campaigns.revertLeadConfirm"))) return;
    }
    setLeadActionLoading(leadId);
    try {
      const res = await fetch("/api/admin/campaigns/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || t("common.error"));
      } else {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: action === "verify" ? "verified" : "rejected" } : l));
      }
    } catch {
      alert(t("common.networkError"));
    } finally {
      setLeadActionLoading(null);
    }
  }

  if (loading) return <CampaignsLoadingSkeleton />;

  if (view === "detail" && selectedCampaign) {
    return (
      <CampaignDetailView
        vm={{
          campaign: selectedCampaign,
          onBack: () => { setSelectedCampaign(null); setView("list"); },
          onEdit: handleEdit, onLaunchDraft: handleLaunchDraft, onAction: handleAction, actionLoading,
          detailTab, setDetailTab, landingSlug,
          leads, leadsLoading, leadActionLoading, onLeadAction: handleLeadAction,
          perf, perfLoading,
          convData, convLoading, convError, convPage, setConvPage,
          showDeleteConfirm,
          onCancelDelete: () => { setShowDeleteConfirm(false); setDeleteTargetId(null); },
          onConfirmDelete: confirmDelete,
        }}
      />
    );
  }

  if (view === "objective") {
    return (
      <CampaignObjectiveView
        objective={objective}
        setObjective={setObjective}
        onBack={() => { resetForm(); setView("list"); }}
        onContinue={() => setView("form")}
      />
    );
  }

  if (view === "form") {
    return (
      <CampaignFormView
        vm={{
          form, setForm, editingId, objective, setView, resetForm,
          creativeUrls, uploading, fileInputRef, handleUpload, removeCreative, imageFormatHint,
          pricingModel, setPricingModel, brandPixels, showPixelSection, setShowPixelSection,
          cpaAmount, setCpaAmount, cpaEvent, setCpaEvent, avgCpc,
          citySearch, setCitySearch, targetCities, setTargetCities,
          selectedPixelId, setSelectedPixelId,
          error, showRechargePrompt, submitting, handleSubmit,
          showCancelConfirm, setShowCancelConfirm,
          showDeleteConfirm, setShowDeleteConfirm, setDeleteTargetId, confirmDelete, actionLoading,
        }}
      />
    );
  }

  return (
    <CampaignListView
      vm={{
        campaigns, campaignStats, error,
        onNewCampaign: openNewForm, onOpenDetail: openDetail,
        onEdit: handleEdit, onLaunchDraft: handleLaunchDraft,
        onResubmit: (campaignId) => handleAction(campaignId, "resubmit"),
        onRelaunch: handleRelaunch, actionLoading,
      }}
    />
  );
}
