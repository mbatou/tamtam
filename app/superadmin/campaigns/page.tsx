"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { Clock } from "lucide-react";
import { Campaign, Batteur, DetailTab, EchoData, NewCampaignForm, NotifyResult } from "./_components/types";
import CampaignStatsCards from "./_components/CampaignStatsCards";
import CampaignFilterBar from "./_components/CampaignFilterBar";
import CampaignTable from "./_components/CampaignTable";
import CampaignDetailDrawer from "./_components/CampaignDetailDrawer";
import CreateCampaignDrawer from "./_components/CreateCampaignDrawer";
import NotifyResultModal from "./_components/NotifyResultModal";

const EMPTY_FORM: NewCampaignForm = {
  batteur_id: "",
  title: "",
  description: "",
  destination_url: "",
  cpc: "25",
  budget: "5000",
  objective: "traffic",
};

export default function CampaignPageWrapper() {
  return <Suspense><CampaignPageContent /></Suspense>;
}

function CampaignPageContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [moderating, setModerating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<NotifyResult | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [echoData, setEchoData] = useState<EchoData | null>(null);
  const [loadingEchos, setLoadingEchos] = useState(false);
  const [landingPageSlug, setLandingPageSlug] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [batteurs, setBatteurs] = useState<Batteur[]>([]);
  const [creating, setCreating] = useState(false);
  const [newCamp, setNewCamp] = useState<NewCampaignForm>(EMPTY_FORM);

  const openById = useCallback((list: Campaign[], id: string) => {
    const match = list.find((c) => c.id === id);
    if (match) setSelected(match);
  }, []);

  // Refs so loaders/effects can read the latest values without re-running
  // when they change.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const highlightIdRef = useRef(highlightId);
  highlightIdRef.current = highlightId;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const selectedId = selected?.id;

  const loadData = useCallback(async () => {
    try {
      const [campRes, usersRes] = await Promise.all([
        fetch("/api/superadmin/campaigns"),
        fetch("/api/superadmin/users"),
      ]);
      const campData = await campRes.json();
      const usersData = await usersRes.json();
      if (!campRes.ok || !usersRes.ok) throw new Error("API error");
      setCampaigns(Array.isArray(campData) ? campData : []);
      if (highlightIdRef.current) openById(campData, highlightIdRef.current);
      const usersList = Array.isArray(usersData) ? usersData : usersData?.users || [];
      setBatteurs(
        usersList
          .filter((u: { role: string }) => u.role === "batteur")
          .map((u: { id: string; name: string; balance: number }) => ({
            id: u.id,
            name: u.name,
            balance: u.balance,
          }))
      );
    } catch {
      showToastRef.current("Erreur de chargement", "error");
    }
    setLoading(false);
  }, [openById]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const sel = selectedRef.current;
    if (selectedId && sel && (sel.objective || "traffic") === "lead_generation" && sel.landing_page_id) {
      fetch(`/api/superadmin/landing-pages?id=${sel.landing_page_id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => setLandingPageSlug(data?.slug || null))
        .catch((err) => {
          console.error("Failed to load landing page slug", err);
          setLandingPageSlug(null);
        });
    } else {
      setLandingPageSlug(null);
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && (detailTab === "echos" || detailTab === "clicks")) {
      setLoadingEchos(true);
      fetch(`/api/superadmin/campaigns/${selectedId}/echos`)
        .then((r) => r.json())
        .then((data) => { setEchoData(data); setLoadingEchos(false); })
        .catch((err) => {
          console.error("Failed to load echo activity", err);
          setLoadingEchos(false);
        });
    }
  }, [selectedId, detailTab]);

  async function moderateCampaign(id: string, action: string, reason?: string) {
    if (action === "stop") {
      const confirmed = window.confirm(
        "Stopper cette campagne ? Le budget restant sera remboursé à la marque."
      );
      if (!confirmed) return;
    }

    setModerating(true);
    try {
      const res = await fetch("/api/superadmin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: id, action, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        const toastMsg = action === "approve" ? "Campagne approuvée" :
          action === "reject" ? "Campagne rejetée" :
          action === "pause" ? "Campagne mise en pause" :
          action === "resume" ? "Campagne relancée" :
          action === "stop" ? `Campagne stoppée.${data.refunded > 0 ? ` ${data.refunded.toLocaleString()} FCFA remboursés.` : ""}` :
          "Succès";
        showToast(toastMsg, action === "approve" || action === "resume" ? "success" : "info");
        setRejectReason("");
        const campRes = await fetch("/api/superadmin/campaigns");
        const campData = await campRes.json();
        setCampaigns(campData);
        const updated = (campData as Campaign[]).find((c) => c.id === id);
        setSelected(updated || null);
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    } finally {
      setModerating(false);
    }
  }

  async function notifyEchos(campaignId: string) {
    setNotifying(true);
    try {
      const res = await fetch("/api/superadmin/campaigns/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyResult(data);
        if (data.emailSent > 0) {
          showToast(`${data.emailSent} emails envoyés, ${data.whatsappReady} WhatsApp prêts`, "success");
        }
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setNotifying(false);
  }

  async function createCampaign() {
    if (!newCamp.batteur_id || !newCamp.title || !newCamp.destination_url) {
      showToast("Champs requis manquants", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/superadmin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...newCamp }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Campagne créée", "success");
        setShowCreate(false);
        setNewCamp(EMPTY_FORM);
        loadData();
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setCreating(false);
  }

  function cloneCampaign(campaign: Campaign) {
    setNewCamp({
      batteur_id: "",
      title: `${campaign.title} (copie)`,
      description: campaign.description || "",
      destination_url: campaign.destination_url,
      cpc: String(campaign.cpc),
      budget: String(campaign.budget),
      objective: campaign.objective || "traffic",
    });
    setSelected(null);
    setShowCreate(true);
  }

  const isReallyPending = (c: Campaign) =>
    c.moderation_status === "pending" &&
    !(c.objective === "lead_generation" && !c.landing_page_id);

  const pendingCount = campaigns.filter(isReallyPending).length;
  const approvedCount = campaigns.filter((c) => c.moderation_status === "approved").length;
  const rejectedCount = campaigns.filter((c) => c.moderation_status === "rejected").length;

  const filtered = campaigns.filter((c) => {
    const ms = c.moderation_status;
    if (filter === "pending") return isReallyPending(c);
    if (filter === "approved") return ms === "approved";
    if (filter === "rejected") return ms === "rejected";
    return true;
  });

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px]">
      {ToastComponent}

      <CampaignStatsCards
        totalCount={campaigns.length}
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        rejectedCount={rejectedCount}
        totalBudget={totalBudget}
        totalSpent={totalSpent}
      />

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div
          className="mb-6 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: "rgba(211,84,0,0.08)", border: "0.5px solid rgba(211,84,0,0.2)" }}
        >
          <Clock size={14} style={{ color: "#F0997B" }} />
          <span className="font-dm text-sm" style={{ color: "#F0997B" }}>
            <span className="font-bold">{pendingCount}</span> campagne{pendingCount > 1 ? "s" : ""} en attente de modération
          </span>
          <button
            onClick={() => { setFilter("pending"); setPage(1); }}
            className="ml-auto font-dm text-xs font-semibold px-3 py-1 rounded-lg transition"
            style={{ background: "rgba(211,84,0,0.15)", color: "#D35400" }}
          >
            Voir
          </button>
        </div>
      )}

      <CampaignFilterBar
        filter={filter}
        counts={{ all: campaigns.length, pending: pendingCount, approved: approvedCount, rejected: rejectedCount }}
        onFilterChange={(key) => { setFilter(key); setPage(1); }}
        onTemplateSelect={(preset) => { setNewCamp(preset); setShowCreate(true); }}
      />

      <CampaignTable
        campaigns={filtered}
        page={page}
        pageSize={PAGE_SIZE}
        onSelect={setSelected}
        onOpenTab={(campaign, tab) => { setSelected(campaign); setDetailTab(tab); }}
      />

      <div className="mt-4">
        <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <CampaignDetailDrawer
        state={{ selected, detailTab, echoData, loadingEchos, landingPageSlug, rejectReason, moderating, notifying }}
        actions={{
          onClose: () => { setSelected(null); setRejectReason(""); setDetailTab("info"); setEchoData(null); },
          onTabChange: setDetailTab,
          onRejectReasonChange: setRejectReason,
          onModerate: moderateCampaign,
          onNotify: notifyEchos,
          onClone: cloneCampaign,
        }}
      />

      <CreateCampaignDrawer
        open={showCreate}
        batteurs={batteurs}
        form={newCamp}
        creating={creating}
        onChange={setNewCamp}
        onClose={() => setShowCreate(false)}
        onCreate={createCampaign}
      />

      <NotifyResultModal result={notifyResult} onClose={() => setNotifyResult(null)} />
    </div>
  );
}
