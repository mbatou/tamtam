"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { getBrandDisplayName, getBrandSubtitle } from "@/lib/display-utils";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import CitySelect from "@/components/ui/CitySelect";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import {
  Users,
  Building2,
  AlertTriangle,
  Wallet,
  Search,
  Plus,
  CheckCircle2,
  Flag,
  Ban,
  RotateCcw,
  Crown,
  CreditCard,
  MousePointerClick,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  role: string;
  status: string | null;
  risk_level: string | null;
  balance: number;
  total_earned: number;
  mobile_money_provider: string | null;
  created_at: string;
  click_stats: { total: number; valid: number; fraud: number; rate: number };
  referral_count: number;
  referred_by: string | null;
  referral_code: string | null;
  last_click_at: string | null;
  campaigns_joined: number;
  is_dual_role?: boolean;
  has_echo_activity?: boolean;
  has_batteur_activity?: boolean;
  platforms?: string[] | null;
  primary_platform?: string | null;
  audience_size_range?: string | null;
}

interface CampaignHistory {
  campaign_id: string;
  title: string;
  status: string;
  cpc: number;
  clicks?: number;
  earned?: number;
  joined_at?: string;
  budget?: number;
  spent?: number;
  echos?: number;
  created_at?: string;
}

interface PayoutHistory {
  id: string;
  amount: number;
  provider: string | null;
  status: string;
  created_at: string;
  failure_reason?: string | null;
  completed_at?: string | null;
}

export default function UsersPageWrapper() {
  return <Suspense><UsersPageContent /></Suspense>;
}

interface ApiStats {
  totalEchos: number;
  totalBrands: number;
  flagged: number;
  totalPaid: number;
}

interface ApiTabs {
  all: number;
  verified: number;
  flagged: number;
  suspended: number;
}

function UsersPageContent() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<ApiStats>({ totalEchos: 0, totalBrands: 0, flagged: 0, totalPaid: 0 });
  const [tabs, setTabs] = useState<ApiTabs>({ all: 0, verified: 0, flagged: 0, suspended: 0 });
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", email: "", password: "", phone: "", city: "" });

  const [echoCampaigns, setEchoCampaigns] = useState<CampaignHistory[]>([]);
  const [batteurCampaigns, setBatteurCampaigns] = useState<CampaignHistory[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<"echo" | "batteur" | "payouts">("echo");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const [payoutActionLoading, setPayoutActionLoading] = useState<string | null>(null);
  const [payoutRejectId, setPayoutRejectId] = useState<string | null>(null);
  const [payoutRejectReason, setPayoutRejectReason] = useState("");

  const [showTopup, setShowTopup] = useState(false);
  const [topupUser, setTopupUser] = useState<UserRow | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  async function loadHistory(user: UserRow) {
    setHistoryLoading(true);
    setEchoCampaigns([]);
    setBatteurCampaigns([]);
    setPayoutHistory([]);
    try {
      const res = await fetch(`/api/superadmin/users/history?user_id=${user.id}&role=${user.role}`);
      if (res.ok) {
        const data = await res.json();
        setEchoCampaigns(data.echoCampaigns || []);
        setBatteurCampaigns(data.batteurCampaigns || []);
        setPayoutHistory(data.payouts || []);
        if (data.echoCampaigns?.length > 0) setHistoryTab("echo");
        else if (data.batteurCampaigns?.length > 0) setHistoryTab("batteur");
        else setHistoryTab("echo");
      }
    } catch { /* silently fail */ }
    setHistoryLoading(false);
  }

  function selectUser(user: UserRow) {
    setSelected(user);
    loadHistory(user);
  }

  const openUserById = useCallback((userList: UserRow[], id: string) => {
    const match = userList.find((u) => u.id === id);
    if (match) {
      setSelected(match);
      setTimeout(() => {
        setHistoryLoading(true);
        setEchoCampaigns([]);
        setBatteurCampaigns([]);
        setPayoutHistory([]);
        fetch(`/api/superadmin/users/history?user_id=${match.id}&role=${match.role}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data) {
              setEchoCampaigns(data.echoCampaigns || []);
              setBatteurCampaigns(data.batteurCampaigns || []);
              setPayoutHistory(data.payouts || []);
              if (data.echoCampaigns?.length > 0) setHistoryTab("echo");
              else if (data.batteurCampaigns?.length > 0) setHistoryTab("batteur");
            }
          })
          .finally(() => setHistoryLoading(false));
      }, 0);
    }
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadData(); }, [page, filter, roleFilter, debouncedSearch]);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", PAGE_SIZE.toString());
      if (roleFilter !== "all") params.set("role", roleFilter === "dual" ? "all" : roleFilter);
      if (filter !== "all") params.set("status", filter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/superadmin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || { totalEchos: 0, totalBrands: 0, flagged: 0, totalPaid: 0 });
      setTabs(data.tabs || { all: 0, verified: 0, flagged: 0, suspended: 0 });
      setTotalFiltered(data.total || 0);
      if (highlightId) openUserById(data.users || [], highlightId);
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

  async function performAction(userId: string, action: string) {
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action }),
      });
      if (res.ok) {
        showToast(`Action "${action}" effectuée`, "success");
        setSelected(null);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function createBrandUser() {
    if (!newBrand.name || !newBrand.email || !newBrand.password) {
      showToast("Nom, email et mot de passe requis", "error");
      return;
    }
    if (newBrand.password.length < 6) {
      showToast("Mot de passe min. 6 caractères", "error");
      return;
    }
    setCreatingBrand(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_batteur", ...newBrand }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Marque créée", "success");
        setShowCreateBrand(false);
        setNewBrand({ name: "", email: "", password: "", phone: "", city: "" });
        loadData();
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setCreatingBrand(false);
  }

  async function handleTopup() {
    if (!topupUser || !topupAmount || parseInt(topupAmount) <= 0) {
      showToast("Montant invalide", "error");
      return;
    }
    setToppingUp(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topup", user_id: topupUser.id, amount: topupAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Nouveau solde : ${formatFCFA(data.new_balance)}`, "success");
        setShowTopup(false);
        setTopupUser(null);
        setTopupAmount("");
        setSelected(null);
        loadData();
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setToppingUp(false);
  }

  async function handlePayoutAction(payoutId: string, action: "approve" | "reject", reason?: string) {
    setPayoutActionLoading(payoutId);
    try {
      const res = await fetch("/api/superadmin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId, action, reason }),
      });
      if (res.ok) {
        showToast(action === "approve" ? "Envoyé" : "Rejeté", action === "approve" ? "success" : "info");
        setPayoutRejectId(null);
        setPayoutRejectReason("");
        if (selected) loadHistory(selected);
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setPayoutActionLoading(null);
  }

  const dualRoleUsers = users.filter((u) => u.is_dual_role || (u.has_echo_activity && u.has_batteur_activity));

  const displayUsers = users.filter((u) => {
    if (roleFilter === "dual") {
      if (!u.is_dual_role && !(u.has_echo_activity && u.has_batteur_activity)) return false;
    }
    if (activityFilter === "active" && u.click_stats.total === 0) return false;
    if (activityFilter === "inactive" && u.click_stats.total > 0) return false;
    if (platformFilter !== "all") {
      if (!u.platforms || !u.platforms.includes(platformFilter)) return false;
    }
    return true;
  });

  function qualityScore(user: UserRow): number {
    const validRatio = user.click_stats.total > 0 ? user.click_stats.valid / user.click_stats.total : 0;
    const campaignsJoined = Math.min(user.campaigns_joined / 5, 1);
    return Math.round((validRatio * 0.6 + campaignsJoined * 0.4) * 100);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px]">
      {ToastComponent}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard label="Total Échos" value={stats.totalEchos} icon={<Users size={16} />} />
        <AdminStatCard label="Marques" value={stats.totalBrands} icon={<Building2 size={16} />} accent="teal" />
        <AdminStatCard label="Signalés" value={stats.flagged} icon={<AlertTriangle size={16} />} accent={stats.flagged > 0 ? "red" : "white"} />
        <AdminStatCard label="Total versé" value={formatFCFA(stats.totalPaid)} icon={<Wallet size={16} />} accent="teal" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Role filter */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          {[
            { key: "all", label: "Tous" },
            { key: "echo", label: "Échos" },
            { key: "batteur", label: "Marques" },
            ...(dualRoleUsers.length > 0 ? [{ key: "dual", label: `Double rôle (${dualRoleUsers.length})` }] : []),
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => { setRoleFilter(r.key); setPage(1); }}
              className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
              style={{
                background: roleFilter === r.key ? (r.key === "dual" ? "rgba(192,132,252,0.12)" : "rgba(211,84,0,0.12)") : "transparent",
                color: roleFilter === r.key ? (r.key === "dual" ? "#C084FC" : "#D35400") : "rgba(255,255,255,0.4)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Activity filter */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          {([
            { key: "all" as const, label: "Tous" },
            { key: "active" as const, label: "Actifs" },
            { key: "inactive" as const, label: "Inactifs" },
          ]).map((a) => (
            <button
              key={a.key}
              onClick={() => { setActivityFilter(a.key); setPage(1); }}
              className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
              style={{
                background: activityFilter === a.key ? "rgba(29,158,117,0.12)" : "transparent",
                color: activityFilter === a.key ? "#5DCAA5" : "rgba(255,255,255,0.4)",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Platform filter */}
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl font-dm text-xs font-medium transition-all focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: platformFilter === "all" ? "rgba(255,255,255,0.4)" : "#5DCAA5" }}
        >
          <option value="all">Plateforme</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
          <option value="snapchat">Snapchat</option>
          <option value="other">Autre</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, téléphone, ville..."
            className="w-full pl-9 pr-4 py-2 rounded-xl font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>

        {/* Create brand button */}
        <button
          onClick={() => setShowCreateBrand(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm font-bold transition ml-auto"
          style={{ background: "#D35400", color: "#fff" }}
        >
          <Plus size={14} />
          Créer Marque
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { key: "all", label: "Tous", count: tabs.all },
          { key: "verified", label: "Vérifiés", count: tabs.verified },
          { key: "flagged", label: "Signalés", count: tabs.flagged },
          { key: "suspended", label: "Suspendus", count: tabs.suspended },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); setPage(1); }}
            className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
            style={{
              background: filter === t.key ? "rgba(211,84,0,0.12)" : "transparent",
              color: filter === t.key ? "#D35400" : "rgba(255,255,255,0.4)",
            }}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#111128" }}>
                {["Utilisateur", "Rôle", "Statut", "Plateformes", "Clics", "Gains", "Qualité", "Solde", "Inscrit"].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${
                      i >= 3 && i <= 6 ? "hidden md:table-cell" : ""
                    } ${i >= 7 ? "hidden lg:table-cell" : ""}`}
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((user) => {
                const score = (user.role === "echo" || user.has_echo_activity) ? qualityScore(user) : null;
                return (
                  <tr
                    key={user.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                    onClick={() => selectUser(user)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-dm text-xs font-bold text-white shrink-0" style={{ background: "#D35400" }}>
                          {getBrandDisplayName(user).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-dm text-sm font-semibold text-white">{getBrandDisplayName(user)}</span>
                            {user.is_dual_role && (
                              <span className="text-[9px] font-dm font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(192,132,252,0.15)", color: "#C084FC" }}>Double</span>
                            )}
                          </div>
                          {getBrandSubtitle(user) && <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{getBrandSubtitle(user)}</div>}
                          <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{user.city || user.phone || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-dm text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{
                          background: user.role === "echo" ? "rgba(211,84,0,0.12)" : user.role === "batteur" ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.12)",
                          color: user.role === "echo" ? "#D35400" : user.role === "batteur" ? "#5DCAA5" : "#F09595",
                        }}
                      >
                        {user.role === "echo" ? "Écho" : user.role === "batteur" ? "Marque" : user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge status={
                        user.status === "verified" ? "verified" :
                        user.status === "flagged" ? "error" :
                        user.status === "suspended" ? "suspended" :
                        "active"
                      }>
                        {user.status === "verified" ? "Vérifié" :
                         user.status === "flagged" ? "Signalé" :
                         user.status === "suspended" ? "Suspendu" :
                         "Actif"}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {user.platforms && user.platforms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.platforms.slice(0, 3).map((p) => (
                            <span key={p} className="font-dm text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(29,158,117,0.12)", color: "#5DCAA5" }}>
                              {p === "whatsapp" ? "WA" : p === "instagram" ? "IG" : p === "tiktok" ? "TT" : p === "facebook" ? "FB" : p === "snapchat" ? "SC" : p}
                            </span>
                          ))}
                          {user.platforms.length > 3 && (
                            <span className="font-dm text-[9px] px-1 py-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>+{user.platforms.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                      )}
                      {user.audience_size_range && (
                        <div className="font-dm text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {user.audience_size_range === "small" ? "<200" : user.audience_size_range === "medium" ? "200-500" : user.audience_size_range === "growing" ? "500-2k" : "2k+"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {user.click_stats.total > 0 ? (
                        <span>{user.click_stats.total} <span style={{ color: user.click_stats.rate > 20 ? "#F09595" : "rgba(255,255,255,0.3)" }}>({user.click_stats.rate}% fraude)</span></span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-syne font-bold text-white text-sm">{formatFCFA(user.total_earned)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {score !== null ? (
                        <span
                          className="font-dm text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background: score >= 70 ? "rgba(29,158,117,0.12)" : score >= 40 ? "rgba(211,84,0,0.12)" : "rgba(226,75,74,0.12)",
                            color: score >= 70 ? "#5DCAA5" : score >= 40 ? "#D35400" : "#F09595",
                          }}
                        >
                          {score}%
                        </span>
                      ) : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell font-dm text-sm text-white">{formatFCFA(user.balance)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{new Date(user.created_at).toLocaleDateString("fr-FR")}</div>
                      <div className="font-dm text-[10px]" style={{ color: user.last_click_at ? "rgba(29,158,117,0.6)" : "rgba(255,255,255,0.15)" }}>
                        {user.last_click_at ? timeAgo(user.last_click_at) : "Jamais actif"}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Pagination currentPage={page} totalItems={totalFiltered} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* User Detail Drawer */}
      <AdminDrawer
        open={!!selected}
        onClose={() => { setSelected(null); setEchoCampaigns([]); setBatteurCampaigns([]); setPayoutHistory([]); }}
        title={selected ? getBrandDisplayName(selected) : ""}
        subtitle={selected ? `${selected.role === "echo" ? "Écho" : "Marque"} · ${selected.city || ""} · ${selected.phone || ""}` : undefined}
        width="520px"
      >
        {selected && (
          <div className="space-y-5">
            {/* Avatar + ID */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-dm text-xl font-bold text-white shrink-0" style={{ background: "#D35400" }}>
                {getBrandDisplayName(selected).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-syne font-bold text-lg text-white">{getBrandDisplayName(selected)}</h3>
                  {selected.is_dual_role && (
                    <span className="font-dm text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(192,132,252,0.15)", color: "#C084FC" }}>Double rôle</span>
                  )}
                </div>
                {getBrandSubtitle(selected) && <p className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{getBrandSubtitle(selected)}</p>}
                <p
                  className="font-dm text-[10px] font-mono mt-0.5 cursor-pointer select-all"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                  onClick={() => { navigator.clipboard.writeText(selected.id); showToast("UUID copié", "success"); }}
                  title="Cliquer pour copier"
                >
                  {selected.id}
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex gap-2">
              <AdminBadge size="md" status={
                selected.status === "verified" ? "verified" :
                selected.status === "flagged" ? "error" :
                selected.status === "suspended" ? "suspended" :
                "active"
              }>
                {selected.status === "verified" ? "Vérifié" :
                 selected.status === "flagged" ? "Signalé" :
                 selected.status === "suspended" ? "Suspendu" :
                 "Actif"}
              </AdminBadge>
              {selected.risk_level && (
                <AdminBadge size="md" status={selected.risk_level === "high" ? "fraud" : selected.risk_level === "medium" ? "pending" : "active"}>
                  Risque: {selected.risk_level}
                </AdminBadge>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: formatFCFA(selected.total_earned), label: "Total gagné", color: "#D35400" },
                { value: formatFCFA(selected.balance || 0), label: "Solde", color: "#5DCAA5" },
                { value: String(selected.click_stats.total), label: "Total clics", color: "#fff" },
                { value: `${selected.click_stats.rate}%`, label: "Taux fraude", color: selected.click_stats.rate > 20 ? "#F09595" : "#fff" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="font-syne font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quality Score */}
            {(selected.role === "echo" || selected.has_echo_activity) && (() => {
              const score = qualityScore(selected);
              const scoreColor = score >= 70 ? "#5DCAA5" : score >= 40 ? "#D35400" : "#F09595";
              const scoreBg = score >= 70 ? "rgba(29,158,117,0.06)" : score >= 40 ? "rgba(211,84,0,0.06)" : "rgba(226,75,74,0.06)";
              const scoreBorder = score >= 70 ? "rgba(29,158,117,0.15)" : score >= 40 ? "rgba(211,84,0,0.15)" : "rgba(226,75,74,0.15)";
              return (
                <div className="rounded-xl p-3" style={{ background: scoreBg, border: `0.5px solid ${scoreBorder}` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-dm text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Score qualité</span>
                    <span className="font-syne font-bold text-lg" style={{ color: scoreColor }}>{score}%</span>
                  </div>
                  <div className="flex gap-4 mt-2 font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    <span>Ratio valide : {selected.click_stats.total > 0 ? Math.round(selected.click_stats.valid / selected.click_stats.total * 100) : 0}%</span>
                    <span>Campagnes : {selected.campaigns_joined}</span>
                  </div>
                </div>
              );
            })()}

            {/* Referral info */}
            {(selected.referral_count > 0 || selected.referred_by) && (
              <div className="rounded-xl p-3" style={{ background: "rgba(192,132,252,0.04)", border: "0.5px solid rgba(192,132,252,0.1)" }}>
                <span className="font-dm text-xs font-semibold" style={{ color: "#C084FC" }}>Parrainage</span>
                <div className="flex flex-wrap gap-4 mt-2 font-dm text-xs">
                  {selected.referral_code && (
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Code : </span>
                      <span className="font-bold" style={{ color: "#C084FC" }}>{selected.referral_code}</span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Filleuls : </span>
                    <span className="font-bold" style={{ color: "#5DCAA5" }}>{selected.referral_count}</span>
                  </div>
                  {selected.referred_by && (
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Parrainé par : </span>
                      <button
                        onClick={() => {
                          const referrer = users.find((u) => u.id === selected.referred_by);
                          if (referrer) selectUser(referrer);
                        }}
                        className="font-bold transition" style={{ color: "#D35400" }}
                      >
                        {(() => { const ref = users.find((u) => u.id === selected.referred_by); return ref ? getBrandDisplayName(ref) : selected.referred_by!.slice(0, 8); })()}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History tabs */}
            <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <div className="flex gap-1 mb-3">
                {echoCampaigns.length > 0 && (
                  <button
                    onClick={() => setHistoryTab("echo")}
                    className="px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                    style={{
                      background: historyTab === "echo" ? "rgba(211,84,0,0.12)" : "rgba(255,255,255,0.04)",
                      color: historyTab === "echo" ? "#D35400" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    Campagnes rejointes ({echoCampaigns.length})
                  </button>
                )}
                {batteurCampaigns.length > 0 && (
                  <button
                    onClick={() => setHistoryTab("batteur")}
                    className="px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                    style={{
                      background: historyTab === "batteur" ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.04)",
                      color: historyTab === "batteur" ? "#5DCAA5" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    Campagnes lancées ({batteurCampaigns.length})
                  </button>
                )}
                <button
                  onClick={() => setHistoryTab("payouts")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                  style={{
                    background: historyTab === "payouts" ? "rgba(192,132,252,0.12)" : "rgba(255,255,255,0.04)",
                    color: historyTab === "payouts" ? "#C084FC" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Retraits ({payoutHistory.length})
                  {payoutHistory.filter((p) => p.status === "pending").length > 0 && (
                    <span className="font-bold text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(226,75,74,0.15)", color: "#F09595" }}>
                      {payoutHistory.filter((p) => p.status === "pending").length}
                    </span>
                  )}
                </button>
              </div>

              {echoCampaigns.length === 0 && batteurCampaigns.length === 0 && historyTab !== "payouts" && (
                <button
                  onClick={() => setHistoryTab("echo")}
                  className="px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold mb-3"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                >
                  Campagnes rejointes (0)
                </button>
              )}

              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
                </div>
              ) : historyTab === "payouts" ? (
                payoutHistory.length === 0 ? (
                  <p className="font-dm text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>Aucun retrait</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {payoutHistory.map((p) => {
                      const isPending = p.status === "pending";
                      const isRejecting = payoutRejectId === p.id;
                      return (
                        <div key={p.id} className="p-3 rounded-xl transition" style={{
                          background: isPending ? "rgba(234,179,8,0.03)" : "rgba(255,255,255,0.03)",
                          border: `0.5px solid ${isPending ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.05)"}`,
                        }}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="font-syne font-bold text-sm text-white">{formatFCFA(p.amount)}</span>
                            <AdminBadge status={p.status === "pending" ? "pending" : p.status === "sent" ? "active" : "error"}>
                              {p.status === "pending" ? "En attente" : p.status === "sent" ? "Envoyé" : "Échoué"}
                            </AdminBadge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 font-dm text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            <span>Via : <strong className="text-white/70">{p.provider === "wave" ? "Wave" : "Orange Money"}</strong></span>
                            <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                            {p.failure_reason && <span style={{ color: "#F09595" }}>{p.failure_reason}</span>}
                          </div>
                          {isPending && !isRejecting && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handlePayoutAction(p.id, "approve")}
                                disabled={payoutActionLoading === p.id}
                                className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold transition disabled:opacity-50"
                                style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                              >
                                {payoutActionLoading === p.id ? "..." : "Approuver"}
                              </button>
                              <button
                                onClick={() => setPayoutRejectId(p.id)}
                                className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                                style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                              >
                                Rejeter
                              </button>
                            </div>
                          )}
                          {isRejecting && (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={payoutRejectReason}
                                onChange={(e) => setPayoutRejectReason(e.target.value)}
                                placeholder="Raison du rejet..."
                                className="w-full rounded-lg px-3 py-2 font-dm text-xs resize-none h-12 focus:outline-none transition"
                                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setPayoutRejectId(null); setPayoutRejectReason(""); }}
                                  className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold"
                                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handlePayoutAction(p.id, "reject", payoutRejectReason)}
                                  disabled={payoutActionLoading === p.id}
                                  className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold disabled:opacity-50"
                                  style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                                >
                                  {payoutActionLoading === p.id ? "..." : "Confirmer"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                (() => {
                  const displayCampaigns = historyTab === "batteur" ? batteurCampaigns : echoCampaigns;
                  const isEcho = historyTab === "echo";
                  return displayCampaigns.length === 0 ? (
                    <p className="font-dm text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune campagne</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {displayCampaigns.map((c) => (
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
                })()
              )}
            </div>

            {/* Top-up for brands */}
            {(selected.role === "batteur" || selected.role === "admin" || selected.role === "superadmin") && (
              <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                <button
                  onClick={() => { setTopupUser(selected); setShowTopup(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition"
                  style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                >
                  <CreditCard size={14} />
                  Recharger le solde
                </button>
              </div>
            )}

            {/* Investigate */}
            <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => router.push(`/superadmin/investigate?user_id=${selected.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                <MousePointerClick size={14} />
                Investiguer cet utilisateur
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => performAction(selected.id, "verify")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
                style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}>
                <CheckCircle2 size={12} /> Vérifier
              </button>
              <button onClick={() => performAction(selected.id, "flag")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
                style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.3)", color: "#EAB308" }}>
                <Flag size={12} /> Signaler
              </button>
              <button onClick={() => performAction(selected.id, "suspend")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
                style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}>
                <Ban size={12} /> Suspendre
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => performAction(selected.id, "reset_balance")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                <RotateCcw size={12} /> Reset solde
              </button>
              <button onClick={() => performAction(selected.id, "promote_admin")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
                style={{ background: "rgba(192,132,252,0.1)", border: "0.5px solid rgba(192,132,252,0.3)", color: "#C084FC" }}>
                <Crown size={12} /> Promouvoir Admin
              </button>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Create Brand Drawer */}
      <AdminDrawer
        open={showCreateBrand}
        onClose={() => setShowCreateBrand(false)}
        title="Créer une marque"
        subtitle="Remplissez les informations"
      >
        <div className="space-y-4">
          <FormField label="Nom de la marque">
            <input type="text" value={newBrand.name} onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
              placeholder="Ex : SenegalShop" className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </FormField>
          <FormField label="Email">
            <input type="email" value={newBrand.email} onChange={(e) => setNewBrand({ ...newBrand, email: e.target.value })}
              placeholder="contact@marque.com" className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </FormField>
          <FormField label="Mot de passe">
            <input type="password" value={newBrand.password} onChange={(e) => setNewBrand({ ...newBrand, password: e.target.value })}
              placeholder="Min. 6 caractères" className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Téléphone">
              <input type="tel" value={newBrand.phone} onChange={(e) => setNewBrand({ ...newBrand, phone: e.target.value })}
                placeholder="+221..." className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            </FormField>
            <FormField label="Ville">
              <CitySelect value={newBrand.city} onChange={(city) => setNewBrand({ ...newBrand, city })} />
            </FormField>
          </div>
          <button onClick={createBrandUser} disabled={creatingBrand}
            className="w-full py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "#D35400", color: "#fff" }}>
            {creatingBrand ? "Création..." : "Créer la marque"}
          </button>
        </div>
      </AdminDrawer>

      {/* Top-Up Drawer */}
      <AdminDrawer
        open={showTopup}
        onClose={() => { setShowTopup(false); setTopupUser(null); setTopupAmount(""); }}
        title="Recharger le solde"
        subtitle={topupUser ? getBrandDisplayName(topupUser) : undefined}
      >
        {topupUser && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-dm text-sm font-bold text-white" style={{ background: "#D35400" }}>
                  {getBrandDisplayName(topupUser).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-dm text-sm font-semibold text-white">{getBrandDisplayName(topupUser)}</div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{topupUser.phone || topupUser.city || "marque"}</div>
                </div>
              </div>
              <div className="flex justify-between font-dm text-sm">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Solde actuel</span>
                <span className="font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA(topupUser.balance || 0)}</span>
              </div>
            </div>

            <FormField label="Montant (FCFA)">
              <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Ex : 50 000" min="100"
                className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            </FormField>

            {topupAmount && parseInt(topupAmount) > 0 && (
              <div className="rounded-xl px-4 py-3" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
                <div className="flex justify-between font-dm text-xs">
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Nouveau solde</span>
                  <span className="font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA((topupUser.balance || 0) + parseInt(topupAmount))}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt.toString())}
                  className="flex-1 py-2 rounded-lg font-dm text-xs font-bold transition"
                  style={{
                    background: topupAmount === amt.toString() ? "#D35400" : "rgba(255,255,255,0.04)",
                    color: topupAmount === amt.toString() ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>

            <button onClick={handleTopup} disabled={toppingUp || !topupAmount || parseInt(topupAmount) <= 0}
              className="w-full py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
              style={{ background: "#D35400", color: "#fff" }}>
              {toppingUp ? "Rechargement..." : `Recharger ${topupAmount ? formatFCFA(parseInt(topupAmount)) : ""}`}
            </button>
          </div>
        )}
      </AdminDrawer>
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
