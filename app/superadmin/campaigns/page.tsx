"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import Pagination, { paginate } from "@/components/ui/Pagination";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { SITE_URL } from "@/lib/constants";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import {
  Megaphone,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ChevronDown,
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

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  destination_url: string;
  budget: number;
  spent: number;
  cpc: number;
  status: string;
  objective: string | null;
  moderation_status: string | null;
  moderation_reason: string | null;
  created_at: string;
  echo_count: number;
  total_clicks: number;
  target_cities: string[] | null;
  users: { name: string; phone: string } | null;
  cost_per_lead_fcfa?: number | null;
  leads_captured_count?: number;
  setup_fee_paid?: boolean;
  setup_fee_amount_fcfa?: number | null;
  landing_page_id?: string | null;
  creative_urls?: string[] | null;
  deleted_at?: string | null;
  pricing_model?: string | null;
  cpa_amount?: number | null;
  cpa_event?: string | null;
}

interface Batteur {
  id: string;
  name: string;
  balance: number;
}

interface EchoActivity {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  joinedAt: string;
  totalClicks: number;
  validClicks: number;
  earnings: number;
}

interface ClickLog {
  id: string;
  created_at: string;
  is_valid: boolean;
  ip_address: string | null;
  user_agent: string | null;
  tracked_links: {
    campaign_id: string;
    users: { name: string; city: string | null } | null;
  } | null;
}

interface EchoData {
  echos: EchoActivity[];
  engagedCount: number;
  totalEchos: number;
  participationRate: number;
  recentClicks: ClickLog[];
}

const STATUS_MAP: Record<string, { label: string; badge: "active" | "pending" | "rejected" | "paused" | "finished" | "draft" }> = {
  approved: { label: "Approuvée", badge: "active" },
  pending: { label: "En attente", badge: "pending" },
  rejected: { label: "Rejetée", badge: "rejected" },
  paused: { label: "En pause", badge: "paused" },
  completed: { label: "Terminée", badge: "finished" },
  active: { label: "Active", badge: "active" },
  stopped: { label: "Stoppée", badge: "finished" },
};

const OBJ_MAP: Record<string, { label: string; color: string; bg: string }> = {
  traffic: { label: "Traffic", color: "#5DCAA5", bg: "rgba(29,158,117,0.12)" },
  awareness: { label: "Awareness", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  lead_generation: { label: "Lead Gen", color: "#C084FC", bg: "rgba(192,132,252,0.12)" },
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
  const [notifyResult, setNotifyResult] = useState<{
    total: number;
    emailSent: number;
    emailFailed: number;
    whatsappReady: number;
    unreachable: number;
    whatsappLinks: { name: string; phone: string; link: string }[];
  } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const [detailTab, setDetailTab] = useState<"info" | "echos" | "clicks">("info");
  const [echoData, setEchoData] = useState<EchoData | null>(null);
  const [loadingEchos, setLoadingEchos] = useState(false);
  const [landingPageSlug, setLandingPageSlug] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [batteurs, setBatteurs] = useState<Batteur[]>([]);
  const [creating, setCreating] = useState(false);
  const [newCamp, setNewCamp] = useState({
    batteur_id: "",
    title: "",
    description: "",
    destination_url: "",
    cpc: "25",
    budget: "5000",
    objective: "traffic",
  });

  const openById = useCallback((list: Campaign[], id: string) => {
    const match = list.find((c) => c.id === id);
    if (match) setSelected(match);
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selected && (selected.objective || "traffic") === "lead_generation" && selected.landing_page_id) {
      fetch(`/api/superadmin/landing-pages?id=${selected.landing_page_id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => setLandingPageSlug(data?.slug || null))
        .catch(() => setLandingPageSlug(null));
    } else {
      setLandingPageSlug(null);
    }
  }, [selected?.id]);

  useEffect(() => {
    if (selected && (detailTab === "echos" || detailTab === "clicks")) {
      setLoadingEchos(true);
      fetch(`/api/superadmin/campaigns/${selected.id}/echos`)
        .then((r) => r.json())
        .then((data) => { setEchoData(data); setLoadingEchos(false); })
        .catch(() => setLoadingEchos(false));
    }
  }, [selected?.id, detailTab]);

  async function loadData() {
    try {
      const [campRes, usersRes] = await Promise.all([
        fetch("/api/superadmin/campaigns"),
        fetch("/api/superadmin/users"),
      ]);
      const campData = await campRes.json();
      const usersData = await usersRes.json();
      if (!campRes.ok || !usersRes.ok) throw new Error("API error");
      setCampaigns(Array.isArray(campData) ? campData : []);
      if (highlightId) openById(campData, highlightId);
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
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

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
        setNewCamp({ batteur_id: "", title: "", description: "", destination_url: "", cpc: "25", budget: "5000", objective: "traffic" });
        loadData();
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setCreating(false);
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

  const selectedBatteur = batteurs.find((b) => b.id === newCamp.batteur_id);

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          label="Total campagnes"
          value={campaigns.length}
          icon={<Megaphone size={16} />}
          sub={`Budget total : ${formatFCFA(totalBudget)}`}
        />
        <AdminStatCard
          label="Approuvées"
          value={approvedCount}
          icon={<CheckCircle2 size={16} />}
          accent="teal"
          sub={`${formatFCFA(totalSpent)} dépensés`}
        />
        <AdminStatCard
          label="En attente"
          value={pendingCount}
          icon={<Clock size={16} />}
          accent={pendingCount > 0 ? "orange" : "white"}
        />
        <AdminStatCard
          label="Rejetées"
          value={rejectedCount}
          icon={<XCircle size={16} />}
          accent={rejectedCount > 0 ? "red" : "white"}
        />
      </div>

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

      {/* Filter tabs + create button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          {[
            { key: "all", label: "Toutes", count: campaigns.length },
            { key: "pending", label: "En attente", count: pendingCount },
            { key: "approved", label: "Approuvées", count: approvedCount },
            { key: "rejected", label: "Rejetées", count: rejectedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setPage(1); }}
              className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
              style={{
                background: filter === tab.key ? "rgba(211,84,0,0.12)" : "transparent",
                color: filter === tab.key ? "#D35400" : "rgba(255,255,255,0.4)",
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 font-bold">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "#D35400", color: "#fff" }}
          >
            <Plus size={14} />
            Créer
            <ChevronDown size={12} className={`transition-transform ${showTemplateMenu ? "rotate-180" : ""}`} />
          </button>
          {showTemplateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl z-50 overflow-hidden"
                style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}
              >
                {[
                  {
                    label: "Recrutement Échos",
                    desc: "Campagne de recrutement",
                    preset: { batteur_id: "", title: "Echo Recruitment", description: "Campaign to recruit new Echos on Tamtam.", destination_url: "https://tamma.me/register", cpc: "15", budget: "", objective: "traffic" },
                  },
                  {
                    label: "Promo Marque",
                    desc: "Campagne standard pour marque",
                    preset: { batteur_id: "", title: "", description: "", destination_url: "", cpc: "25", budget: "", objective: "traffic" },
                  },
                  {
                    label: "Personnalisée",
                    desc: "Partir de zéro",
                    preset: { batteur_id: "", title: "", description: "", destination_url: "", cpc: "", budget: "", objective: "traffic" },
                  },
                ].map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setNewCamp(tmpl.preset);
                      setShowCreate(true);
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 transition"
                    style={{ borderTop: i > 0 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="font-dm text-sm font-semibold text-white/80">{tmpl.label}</div>
                    <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{tmpl.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#111128" }}>
                {["Campagne", "Statut", "Budget", "CPC/CPA", "Échos", "Clics", "Date"].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${
                      i >= 2 && i <= 3 ? "hidden md:table-cell" : ""
                    } ${i >= 4 && i <= 6 ? "hidden lg:table-cell" : ""}`}
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginate(filtered, page, PAGE_SIZE).map((campaign) => {
                const modStatus = STATUS_MAP[campaign.moderation_status || "pending"] || STATUS_MAP.pending;
                const obj = OBJ_MAP[(campaign.objective || "traffic")] || OBJ_MAP.traffic;
                const pct = campaign.budget > 0 ? Math.min(100, (campaign.spent / campaign.budget) * 100) : 0;
                const remaining = campaign.budget - (campaign.spent || 0);
                const unitCost = (campaign.pricing_model || "cpc") === "cpa" ? (campaign.cpa_amount || 0) : campaign.cpc;
                const lowBudget = campaign.status === "active" && unitCost > 0 && remaining < unitCost;

                return (
                  <tr
                    key={campaign.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                    onClick={() => setSelected(campaign)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-dm text-sm font-semibold text-white">{campaign.title}</span>
                        <span
                          className="text-[10px] font-dm font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: obj.bg, color: obj.color }}
                        >
                          {obj.label}
                        </span>
                      </div>
                      <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {campaign.users ? getBrandDisplayName({ ...campaign.users, role: "batteur" }) : "—"}
                      </div>
                      {campaign.target_cities && campaign.target_cities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {campaign.target_cities.slice(0, 3).map((city: string) => (
                            <span
                              key={city}
                              className="text-[10px] font-dm px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(211,84,0,0.08)", color: "rgba(211,84,0,0.6)" }}
                            >
                              {city}
                            </span>
                          ))}
                          {campaign.target_cities.length > 3 && (
                            <span className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>
                              +{campaign.target_cities.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {campaign.budget > 0 && (
                        <div className="mt-1 h-1 w-full max-w-[120px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct > 90 ? "#ef4444" : pct > 70 ? "#eab308" : "#1D9E75",
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <AdminBadge status={modStatus.badge}>{modStatus.label}</AdminBadge>
                        {campaign.status !== campaign.moderation_status && (
                          <AdminBadge status={STATUS_MAP[campaign.status]?.badge || "draft"}>
                            {STATUS_MAP[campaign.status]?.label || campaign.status}
                          </AdminBadge>
                        )}
                        {campaign.deleted_at && (
                          <AdminBadge status="error">Supprimée</AdminBadge>
                        )}
                        {lowBudget && (
                          <span className="text-[10px] font-dm font-bold" style={{ color: "#F09595" }}>Budget &lt; {(campaign.pricing_model || "cpc") === "cpa" ? "CPA" : "CPC"}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="font-dm text-sm text-white">{formatFCFA(campaign.budget)}</div>
                      <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {formatFCFA(campaign.spent)} dépensés
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-dm text-sm text-white/70">
                      {(campaign.pricing_model || "cpc") === "cpa" ? (
                        <div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1" style={{ background: "rgba(211,84,0,0.12)", color: "#D35400" }}>CPA</span>
                          {campaign.cpa_amount} FCFA
                        </div>
                      ) : (
                        <>{campaign.cpc} FCFA</>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 hidden lg:table-cell font-dm text-sm cursor-pointer transition"
                      style={{ color: "#D35400" }}
                      onClick={(e) => { e.stopPropagation(); setSelected(campaign); setDetailTab("echos"); }}
                    >
                      {campaign.echo_count}
                    </td>
                    <td
                      className="px-4 py-3 hidden lg:table-cell font-dm text-sm text-white/70 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setSelected(campaign); setDetailTab("clicks"); }}
                    >
                      {campaign.total_clicks}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(campaign.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Aucune campagne trouvée
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Campaign Detail Drawer */}
      <AdminDrawer
        open={!!selected}
        onClose={() => { setSelected(null); setRejectReason(""); setDetailTab("info"); setEchoData(null); }}
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
                  onClick={() => setDetailTab(tab.key)}
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
                            className="aspect-square rounded-xl overflow-hidden transition"
                            style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}>
                            {url.match(/\.(mp4|webm)/) ? (
                              <video src={url} className="w-full h-full object-cover" controls />
                            ) : (
                              <img src={url} alt={`Visuel ${i + 1}`} className="w-full h-full object-cover" />
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
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Raison du rejet (optionnel)..."
                      className="w-full rounded-xl px-4 py-3 font-dm text-sm resize-none h-20 focus:outline-none transition"
                      style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateCampaign(selected.id, "approve")}
                        disabled={moderating}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                        style={{ background: "rgba(29,158,117,0.12)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                      >
                        <CheckCircle2 size={14} />
                        {moderating ? "..." : "Approuver"}
                      </button>
                      <button
                        onClick={() => moderateCampaign(selected.id, "reject", rejectReason.trim() || undefined)}
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
                      onClick={() => notifyEchos(selected.id)}
                      disabled={notifying}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                      style={{ background: "rgba(211,84,0,0.1)", border: "0.5px solid rgba(211,84,0,0.3)", color: "#D35400" }}
                    >
                      <Bell size={14} />
                      {notifying ? "Envoi..." : "Notifier les Échos"}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateCampaign(selected.id, "pause")}
                        disabled={moderating}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                        style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.3)", color: "#EAB308" }}
                      >
                        <Pause size={14} />
                        Pause
                      </button>
                      <button
                        onClick={() => moderateCampaign(selected.id, "stop")}
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
                      onClick={() => moderateCampaign(selected.id, "resume")}
                      disabled={moderating}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                      style={{ background: "rgba(29,158,117,0.12)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                    >
                      <Play size={14} />
                      Reprendre
                    </button>
                    <button
                      onClick={() => moderateCampaign(selected.id, "stop")}
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
                    onClick={() => {
                      setNewCamp({
                        batteur_id: "",
                        title: `${selected.title} (copie)`,
                        description: selected.description || "",
                        destination_url: selected.destination_url,
                        cpc: String(selected.cpc),
                        budget: String(selected.budget),
                        objective: selected.objective || "traffic",
                      });
                      setSelected(null);
                      setShowCreate(true);
                    }}
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

      {/* Create Campaign Drawer */}
      <AdminDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Créer une campagne"
        subtitle="Remplissez les détails ci-dessous"
      >
        <div className="space-y-4">
          <FormField label="Marque">
            <select
              value={newCamp.batteur_id}
              onChange={(e) => setNewCamp({ ...newCamp, batteur_id: e.target.value })}
              className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            >
              <option value="">Sélectionner une marque...</option>
              {batteurs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — Solde : {formatFCFA(b.balance)}
                </option>
              ))}
            </select>
          </FormField>

          {selectedBatteur && (
            <div className="px-4 py-3 rounded-xl font-dm text-xs"
              style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Solde disponible : </span>
              <span className="font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA(selectedBatteur.balance)}</span>
            </div>
          )}

          <FormField label="Objectif">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "traffic", label: "Traffic", desc: "Clics vers un lien" },
                { id: "awareness", label: "Awareness", desc: "Visuel + lien requis" },
              ].map((obj) => (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setNewCamp({ ...newCamp, objective: obj.id })}
                  className="text-left p-3 rounded-xl transition"
                  style={{
                    border: `1.5px solid ${newCamp.objective === obj.id ? "#D35400" : "rgba(255,255,255,0.1)"}`,
                    background: newCamp.objective === obj.id ? "rgba(211,84,0,0.08)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="font-dm text-sm font-bold text-white/80">{obj.label}</div>
                  <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{obj.desc}</div>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Titre">
            <input
              type="text"
              value={newCamp.title}
              onChange={(e) => setNewCamp({ ...newCamp, title: e.target.value })}
              placeholder="Nom de la campagne..."
              className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={newCamp.description}
              onChange={(e) => setNewCamp({ ...newCamp, description: e.target.value })}
              placeholder="Description optionnelle..."
              className="w-full rounded-xl px-4 py-3 font-dm text-sm resize-none h-16 focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </FormField>

          <FormField label="URL de destination">
            <input
              type="url"
              value={newCamp.destination_url}
              onChange={(e) => setNewCamp({ ...newCamp, destination_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="CPC (FCFA)">
              <input
                type="number"
                value={newCamp.cpc}
                onChange={(e) => setNewCamp({ ...newCamp, cpc: e.target.value })}
                min="5"
                className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </FormField>
            <FormField label="Budget (FCFA)">
              <input
                type="number"
                value={newCamp.budget}
                onChange={(e) => setNewCamp({ ...newCamp, budget: e.target.value })}
                min="500"
                className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </FormField>
          </div>

          {selectedBatteur && parseInt(newCamp.budget) > selectedBatteur.balance && (
            <div className="px-4 py-3 rounded-xl font-dm text-xs"
              style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.2)", color: "#F09595" }}>
              Le budget dépasse le solde disponible ({formatFCFA(selectedBatteur.balance)})
            </div>
          )}

          <button
            onClick={createCampaign}
            disabled={creating}
            className="w-full py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "#D35400", color: "#fff" }}
          >
            {creating ? "Création..." : "Créer la campagne"}
          </button>
        </div>
      </AdminDrawer>

      {/* Notification Result Overlay */}
      {notifyResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="rounded-xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col"
            style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-syne font-bold text-lg text-white">Résultat des notifications</h3>
              <button onClick={() => setNotifyResult(null)} className="text-xl transition" style={{ color: "rgba(255,255,255,0.4)" }}>&times;</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { value: notifyResult.total, label: "Total Échos", bg: "rgba(255,255,255,0.04)", color: "#fff" },
                { value: notifyResult.emailSent, label: "Emails envoyés", bg: "rgba(29,158,117,0.1)", color: "#5DCAA5" },
                { value: notifyResult.whatsappReady, label: "WhatsApp prêts", bg: "rgba(29,158,117,0.1)", color: "#5DCAA5" },
                { value: notifyResult.unreachable, label: "Injoignables", bg: "rgba(226,75,74,0.1)", color: "#F09595" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                  <div className="font-syne font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-dm text-xs" style={{ color: `${s.color}80` }}>{s.label}</div>
                </div>
              ))}
            </div>

            {notifyResult.emailFailed > 0 && (
              <div className="rounded-lg px-3 py-2 mb-4 font-dm text-xs"
                style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.2)", color: "#EAB308" }}>
                {notifyResult.emailFailed} emails ont échoué
              </div>
            )}

            {notifyResult.whatsappLinks.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-dm text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Liens WhatsApp ({notifyResult.whatsappLinks.length})
                  </h4>
                  <span className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Cliquez pour ouvrir</span>
                </div>
                <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
                  {notifyResult.whatsappLinks.map((wa, i) => (
                    <a
                      key={i}
                      href={wa.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg transition group"
                      style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid transparent" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(29,158,117,0.08)";
                        e.currentTarget.style.borderColor = "rgba(29,158,117,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "rgba(29,158,117,0.1)" }}>
                          <span className="font-dm text-xs font-bold" style={{ color: "#5DCAA5" }}>WA</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-dm text-sm font-medium text-white truncate">{wa.name}</div>
                          <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{wa.phone}</div>
                        </div>
                      </div>
                      <span className="font-dm text-xs opacity-0 group-hover:opacity-100 transition shrink-0 ml-2" style={{ color: "#5DCAA5" }}>
                        Ouvrir →
                      </span>
                    </a>
                  ))}
                </div>
              </>
            )}

            <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => setNotifyResult(null)}
                className="px-6 py-2 rounded-lg font-dm text-sm transition"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, children, className }: { label: string; value?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="font-dm text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      {children || <span className="font-dm text-sm text-white">{value}</span>}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</label>
      {children}
    </div>
  );
}
