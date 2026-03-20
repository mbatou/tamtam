"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import Pagination, { paginate } from "@/components/ui/Pagination";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  destination_url: string;
  budget: number;
  spent: number;
  cpc: number;
  status: string;
  moderation_status: string | null;
  moderation_reason: string | null;
  created_at: string;
  echo_count: number;
  total_clicks: number;
  users: { name: string; phone: string } | null;
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

export default function CampaignModerationPageWrapper() {
  return <Suspense><CampaignModerationPageContent /></Suspense>;
}

function CampaignModerationPageContent() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [notifying, setNotifying] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  // Detail modal tab state
  const [detailTab, setDetailTab] = useState<"info" | "echos" | "clicks">("info");
  const [echoData, setEchoData] = useState<EchoData | null>(null);
  const [loadingEchos, setLoadingEchos] = useState(false);

  // Create campaign state
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
  });

  const openById = useCallback((list: Campaign[], id: string) => {
    const match = list.find((c) => c.id === id);
    if (match) setSelected(match);
  }, []);

  useEffect(() => { loadData(); }, []);

  // Fetch echo data when detail tab switches to echos or clicks
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
      setCampaigns(campData);
      if (highlightId) openById(campData, highlightId);
      setBatteurs(
        (usersData || [])
          .filter((u: { role: string }) => u.role === "batteur")
          .map((u: { id: string; name: string; balance: number }) => ({
            id: u.id,
            name: u.name,
            balance: u.balance,
          }))
      );
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setLoading(false);
  }

  async function moderateCampaign(id: string, action: string, reason?: string) {
    try {
      const res = await fetch("/api/superadmin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: id, action, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        const toastMsg = action === "approve" ? "Campagne approuvée et en ligne" :
          action === "reject" ? "Campagne rejetée" :
          action === "pause" ? "Campagne mise en pause" :
          action === "resume" ? "Campagne réactivée" : t("common.success");
        showToast(toastMsg, action === "approve" || action === "resume" ? "success" : "info");
        setRejectReason("");
        // Reload data and update the selected campaign in the modal
        const campRes = await fetch("/api/superadmin/campaigns");
        const campData = await campRes.json();
        setCampaigns(campData);
        // Update the selected campaign with fresh data or close if not found
        const updated = (campData as Campaign[]).find((c) => c.id === id);
        setSelected(updated || null);
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
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
      if (res.ok && data.sent > 0) {
        showToast(t("superadmin.campaigns.notifySent", { count: data.sent }), "success");
      } else if (res.ok && data.sent === 0) {
        const errMsg = data.errors?.[0] || t("common.error");
        showToast(`0 emails sent: ${errMsg}`, "error");
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setNotifying(false);
  }

  async function createCampaign() {
    if (!newCamp.batteur_id || !newCamp.title || !newCamp.destination_url) {
      showToast(t("common.error"), "error");
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
        showToast(t("superadmin.campaigns.approvedTab"), "success");
        setShowCreate(false);
        setNewCamp({ batteur_id: "", title: "", description: "", destination_url: "", cpc: "25", budget: "5000" });
        loadData();
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setCreating(false);
  }

  const pendingCount = campaigns.filter((c) => (c.moderation_status || "pending") === "pending").length;
  const filtered = campaigns.filter((c) => {
    const ms = c.moderation_status || "pending";
    if (filter === "pending") return ms === "pending";
    if (filter === "approved") return ms === "approved";
    if (filter === "rejected") return ms === "rejected";
    return true;
  });

  const selectedBatteur = batteurs.find((b) => b.id === newCamp.batteur_id);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("superadmin.campaigns.title")}</h1>
        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="px-4 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-bold hover:opacity-90 transition flex items-center gap-2"
          >
            {t("superadmin.campaigns.createCampaign")} <span className="text-xs opacity-70">&#9662;</span>
          </button>
          {showTemplateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
              <div className="absolute right-0 mt-2 glass-card rounded-xl border border-white/10 w-64 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setNewCamp({ batteur_id: "", title: "Recrutement Échos", description: "Campagne pour recruter de nouveaux Échos sur Tamtam.", destination_url: "https://tamma.me/register", cpc: "15", budget: "" });
                    setShowCreate(true);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition"
                >
                  <div className="text-sm font-bold">🤝 Recrutement Échos</div>
                  <div className="text-[10px] text-white/40">Campagne pour recruter de nouveaux Échos</div>
                </button>
                <button
                  onClick={() => {
                    setNewCamp({ batteur_id: "", title: "", description: "", destination_url: "", cpc: "25", budget: "" });
                    setShowCreate(true);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition border-t border-white/5"
                >
                  <div className="text-sm font-bold">📢 Promo Marque</div>
                  <div className="text-[10px] text-white/40">Campagne type pour une marque</div>
                </button>
                <button
                  onClick={() => {
                    setNewCamp({ batteur_id: "", title: "", description: "", destination_url: "", cpc: "", budget: "" });
                    setShowCreate(true);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition border-t border-white/5"
                >
                  <div className="text-sm font-bold">✏️ Campagne libre</div>
                  <div className="text-[10px] text-white/40">Commencer de zéro</div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-yellow-400 text-sm font-semibold">
            {pendingCount} {t("superadmin.campaigns.pendingTab")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("superadmin.campaigns.allTab")} value={campaigns.length.toString()} accent="orange" />
        <StatCard label={t("superadmin.campaigns.approvedTab")} value={campaigns.filter((c) => c.status === "active").length.toString()} accent="teal" />
        <StatCard label={t("superadmin.campaigns.pendingTab")} value={pendingCount.toString()} accent="purple" />
        <StatCard label={t("superadmin.campaigns.rejectedTab")} value={campaigns.filter((c) => c.moderation_status === "rejected").length.toString()} accent="red" />
      </div>

      <TabBar
        tabs={[
          { key: "all", label: t("superadmin.campaigns.allTab"), count: campaigns.length },
          { key: "pending", label: t("superadmin.campaigns.pendingTab"), count: pendingCount },
          { key: "approved", label: t("superadmin.campaigns.approvedTab"), count: campaigns.filter((c) => c.moderation_status === "approved").length },
          { key: "rejected", label: t("superadmin.campaigns.rejectedTab"), count: campaigns.filter((c) => c.moderation_status === "rejected").length },
        ]}
        active={filter}
        onChange={(f) => { setFilter(f); setPage(1); }}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/30 border-b border-white/5">
              <th className="pb-3 font-semibold">{t("superadmin.campaigns.campaignLabel")}</th>
              <th className="pb-3 font-semibold">{t("superadmin.campaigns.moderation")}</th>
              <th className="pb-3 font-semibold hidden md:table-cell">{t("common.budget")}</th>
              <th className="pb-3 font-semibold hidden md:table-cell">{t("common.cpc")}</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">{t("superadmin.campaigns.echos")}</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">{t("common.clicks")}</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">{t("common.date")}</th>
            </tr>
          </thead>
          <tbody>
            {paginate(filtered, page, PAGE_SIZE).map((campaign) => (
              <tr
                key={campaign.id}
                className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition"
                onClick={() => setSelected(campaign)}
              >
                <td className="py-3">
                  <div className="font-semibold">{campaign.title}</div>
                  <div className="text-xs text-white/30">{campaign.users?.name || "—"}</div>
                  {/* Inline budget bar */}
                  {campaign.budget > 0 && (
                    <div className="mt-1 h-1 w-full max-w-[120px] bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (campaign.spent / campaign.budget) * 100)}%`,
                          background: (campaign.spent / campaign.budget) > 0.9 ? "#ef4444" : (campaign.spent / campaign.budget) > 0.7 ? "#eab308" : "#22c55e",
                        }}
                      />
                    </div>
                  )}
                </td>
                <td className="py-3">
                  <Badge status={campaign.moderation_status || "pending"} />
                </td>
                <td className="py-3 hidden md:table-cell">
                  <div>{formatFCFA(campaign.budget)}</div>
                  <div className="text-[10px] text-white/25">{formatFCFA(campaign.spent)} {t("superadmin.campaigns.spentBudget").toLowerCase()}</div>
                </td>
                <td className="py-3 hidden md:table-cell">{campaign.cpc} FCFA</td>
                <td
                  className="py-3 hidden lg:table-cell cursor-pointer text-primary hover:underline"
                  onClick={(e) => { e.stopPropagation(); setSelected(campaign); setDetailTab("echos"); }}
                >
                  {campaign.echo_count}
                </td>
                <td className="py-3 hidden lg:table-cell" onClick={(e) => { e.stopPropagation(); setSelected(campaign); setDetailTab("clicks"); }}>
                  <span className="cursor-pointer hover:underline">{campaign.total_clicks}</span>
                </td>
                <td className="py-3 text-xs text-white/40 hidden lg:table-cell">
                  {new Date(campaign.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* Campaign Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setRejectReason(""); setDetailTab("info"); setEchoData(null); }} title={selected?.title || ""}>
        {selected && (
          <div className="space-y-4">
            {/* Tab switcher */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              <button onClick={() => setDetailTab("info")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${detailTab === "info" ? "bg-primary text-white" : "text-white/40 hover:text-white/60"}`}>
                Infos
              </button>
              <button onClick={() => setDetailTab("echos")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${detailTab === "echos" ? "bg-primary text-white" : "text-white/40 hover:text-white/60"}`}>
                Échos ({echoData?.engagedCount ?? selected.echo_count})
              </button>
              <button onClick={() => setDetailTab("clicks")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${detailTab === "clicks" ? "bg-primary text-white" : "text-white/40 hover:text-white/60"}`}>
                Clics récents
              </button>
            </div>

            {/* Tab: Info */}
            {detailTab === "info" && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-white/40 block">{t("superadmin.finance.batteur")}</span>
                    <span>{selected.users?.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 block">{t("common.status")}</span>
                    <Badge status={selected.moderation_status || "pending"} />
                  </div>
                  <div>
                    <span className="text-xs text-white/40 block">{t("common.budget")}</span>
                    <span>{formatFCFA(selected.budget)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 block">{t("common.cpc")}</span>
                    <span>{selected.cpc} FCFA</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 block">{t("superadmin.campaigns.engagedEchos")}</span>
                    <span>{selected.echo_count}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 block">{t("superadmin.campaigns.totalClicks")}</span>
                    <span>{selected.total_clicks}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.spentBudget")}</span>
                    <ProgressBar value={selected.spent} max={selected.budget} />
                    <span className="text-xs text-white/30 mt-1 block">
                      {formatFCFA(selected.spent)} / {formatFCFA(selected.budget)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-white/40 block">{t("common.url")}</span>
                    <span className="text-xs font-mono break-all text-primary">{selected.destination_url}</span>
                  </div>
                  {selected.description && (
                    <div className="col-span-2">
                      <span className="text-xs text-white/40 block">{t("common.description")}</span>
                      <span className="text-xs">{selected.description}</span>
                    </div>
                  )}
                  {selected.moderation_reason && (
                    <div className="col-span-2">
                      <span className="text-xs text-white/40 block">{t("superadmin.campaigns.rejectionReason")}</span>
                      <span className="text-xs text-red-400">{selected.moderation_reason}</span>
                    </div>
                  )}
                </div>

                {(selected.moderation_status || "pending") === "pending" && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t("superadmin.campaigns.rejectionReasonPlaceholder")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none h-20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateCampaign(selected.id, "approve")}
                        className="flex-1 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm"
                      >
                        {t("superadmin.campaigns.approvedTab")}
                      </button>
                      <button
                        onClick={() => {
                          if (!rejectReason.trim()) { showToast(t("common.error"), "error"); return; }
                          moderateCampaign(selected.id, "reject", rejectReason);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm"
                      >
                        {t("superadmin.campaigns.rejectedTab")}
                      </button>
                    </div>
                  </div>
                )}

                {selected.status === "active" && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <button
                      onClick={() => notifyEchos(selected.id)}
                      disabled={notifying}
                      className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                      {notifying ? t("superadmin.campaigns.notifying") : t("superadmin.campaigns.notifyEchos")}
                    </button>
                    <button
                      onClick={() => moderateCampaign(selected.id, "pause")}
                      className="w-full py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-sm"
                    >
                      {t("superadmin.campaigns.pendingTab")}
                    </button>
                  </div>
                )}

                {selected.status === "paused" && (
                  <div className="pt-2 border-t border-white/5">
                    <button
                      onClick={() => moderateCampaign(selected.id, "resume")}
                      className="w-full py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm"
                    >
                      {t("superadmin.campaigns.approvedTab")}
                    </button>
                  </div>
                )}

                {/* Clone Campaign */}
                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setNewCamp({
                        batteur_id: "",
                        title: `${selected.title} (${t("superadmin.campaigns.clone")})`,
                        description: selected.description || "",
                        destination_url: selected.destination_url,
                        cpc: String(selected.cpc),
                        budget: String(selected.budget),
                      });
                      setSelected(null);
                      setShowCreate(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:bg-white/10 transition"
                  >
                    {t("superadmin.campaigns.clone")}
                  </button>
                </div>
              </>
            )}

            {/* Tab: Échos */}
            {detailTab === "echos" && (
              <div>
                {loadingEchos ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
                  </div>
                ) : echoData ? (
                  <>
                    {/* Participation rate */}
                    <div className="bg-white/5 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-sm">Participation</span>
                        <span className="text-white font-bold text-sm">
                          {echoData.engagedCount} / {echoData.totalEchos} Échos
                          <span className="text-white/40 text-xs ml-2">
                            ({echoData.participationRate}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${echoData.participationRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Écho leaderboard */}
                    <div className="space-y-1">
                      {echoData.echos.map((echo, i) => (
                        <div key={echo.id}
                          className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-sm w-6 ${
                              i < 3 ? "text-primary" : "text-white/30"
                            }`}>
                              {i + 1}
                            </span>
                            <div>
                              <div className="text-white text-sm font-medium">{echo.name}</div>
                              <div className="text-white/30 text-xs">
                                {echo.city || "—"} · rejoint {new Date(echo.joinedAt).toLocaleDateString("fr-FR")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <div className="text-white font-medium">{echo.validClicks}</div>
                              <div className="text-white/30 text-xs">clics valides</div>
                            </div>
                            <div className="text-right">
                              <div className="text-accent font-bold">
                                {Math.round(echo.earnings).toLocaleString("fr-FR")} F
                              </div>
                              <div className="text-white/30 text-xs">gagné</div>
                            </div>
                            {echo.phone && (
                              <a href={`https://wa.me/${echo.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-400 hover:text-green-300 text-lg"
                                title="WhatsApp">
                                💬
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                      {echoData.echos.length === 0 && (
                        <div className="text-center py-8 text-white/30 text-sm">
                          Aucun Écho n&apos;a encore rejoint cette campagne
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Tab: Clics récents */}
            {detailTab === "clicks" && (
              <div>
                {loadingEchos ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
                  </div>
                ) : echoData ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-2 text-xs text-white/30 uppercase tracking-wider px-3 py-2">
                      <span>Heure</span>
                      <span>Écho</span>
                      <span>Ville</span>
                      <span>IP</span>
                      <span>Statut</span>
                    </div>
                    {echoData.recentClicks.map((click) => (
                      <div key={click.id}
                        className="grid grid-cols-5 gap-2 text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition">
                        <span className="text-white/40">
                          {new Date(click.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-white truncate">
                          {click.tracked_links?.users?.name || "—"}
                        </span>
                        <span className="text-white/40 truncate">
                          {click.tracked_links?.users?.city || "—"}
                        </span>
                        <span className="text-white/30 font-mono text-xs truncate">
                          {click.ip_address ? `${click.ip_address.substring(0, 12)}...` : "—"}
                        </span>
                        <span className={click.is_valid ? "text-green-400" : "text-red-400"}>
                          {click.is_valid ? "✓ Valide" : "✕ Filtré"}
                        </span>
                      </div>
                    ))}

                    {echoData.recentClicks.length === 0 && (
                      <div className="text-center py-8 text-white/30 text-sm">
                        Aucun clic enregistré
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Campaign Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("superadmin.campaigns.createCampaignTitle")}>
        <div className="space-y-4">
          {/* Select brand */}
          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.batteurLabel")}</label>
            <select
              value={newCamp.batteur_id}
              onChange={(e) => setNewCamp({ ...newCamp, batteur_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            >
              <option value="">{t("superadmin.campaigns.selectBatteur")}</option>
              {batteurs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {t("common.balance")}: {formatFCFA(b.balance)}
                </option>
              ))}
            </select>
          </div>

          {selectedBatteur && (
            <div className="p-3 rounded-xl bg-white/5 text-xs">
              <span className="text-white/40">{t("superadmin.campaigns.availableBalance")}: </span>
              <span className="font-bold text-accent">{formatFCFA(selectedBatteur.balance)}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.campaignTitleLabel")}</label>
            <input
              type="text"
              value={newCamp.title}
              onChange={(e) => setNewCamp({ ...newCamp, title: e.target.value })}
              placeholder={t("superadmin.campaigns.campaignTitlePlaceholder")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.description")}</label>
            <textarea
              value={newCamp.description}
              onChange={(e) => setNewCamp({ ...newCamp, description: e.target.value })}
              placeholder={t("superadmin.campaigns.descriptionPlaceholder")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none h-16"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.destinationUrl")}</label>
            <input
              type="url"
              value={newCamp.destination_url}
              onChange={(e) => setNewCamp({ ...newCamp, destination_url: e.target.value })}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.cpcLabel")}</label>
              <input
                type="number"
                value={newCamp.cpc}
                onChange={(e) => setNewCamp({ ...newCamp, cpc: e.target.value })}
                min="5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t("superadmin.campaigns.budgetLabel")}</label>
              <input
                type="number"
                value={newCamp.budget}
                onChange={(e) => setNewCamp({ ...newCamp, budget: e.target.value })}
                min="500"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          {selectedBatteur && parseInt(newCamp.budget) > selectedBatteur.balance && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {t("superadmin.finance.budgetExceeded", { balance: formatFCFA(selectedBatteur.balance) })}
            </div>
          )}

          <button
            onClick={createCampaign}
            disabled={creating}
            className="w-full py-3 rounded-xl bg-gradient-primary text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {creating ? t("common.loading") : t("superadmin.campaigns.title")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
