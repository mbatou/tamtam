"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import { Users, Building2, AlertTriangle, Wallet } from "lucide-react";
import UsersFilters from "./_components/UsersFilters";
import UsersTable from "./_components/UsersTable";
import UserDetailDrawer from "./_components/UserDetailDrawer";
import CreateBrandDrawer from "./_components/CreateBrandDrawer";
import TopupDrawer from "./_components/TopupDrawer";
import type {
  UserRow,
  CampaignHistory,
  PayoutHistory,
  ApiStats,
  ApiTabs,
  HistoryTab,
} from "./_components/types";

export default function UsersPageWrapper() {
  return <Suspense><UsersPageContent /></Suspense>;
}

function UsersPageContent() {
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
  const [historyTab, setHistoryTab] = useState<HistoryTab>("echo");

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
    } catch (err) {
      console.error("Failed to load user history", err);
    }
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

  // Refs so loadData can read the latest values without re-running the fetch
  // effect when they change.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const highlightIdRef = useRef(highlightId);
  highlightIdRef.current = highlightId;

  const loadData = useCallback(async () => {
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
      if (highlightIdRef.current) openUserById(data.users || [], highlightIdRef.current);
    } catch {
      showToastRef.current("Erreur de chargement", "error");
    }
    setLoading(false);
  }, [page, filter, roleFilter, debouncedSearch, openUserById]);

  useEffect(() => { loadData(); }, [loadData]);

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

      <UsersFilters
        values={{ filter, roleFilter, activityFilter, platformFilter, search }}
        handlers={{ setFilter, setRoleFilter, setActivityFilter, setPlatformFilter, setSearch, setPage, onCreateBrand: () => setShowCreateBrand(true) }}
        tabs={tabs}
        dualRoleCount={dualRoleUsers.length}
      />

      <UsersTable users={displayUsers} onSelectUser={selectUser} />

      <div className="mt-4">
        <Pagination currentPage={page} totalItems={totalFiltered} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <UserDetailDrawer
        user={selected}
        users={users}
        onClose={() => { setSelected(null); setEchoCampaigns([]); setBatteurCampaigns([]); setPayoutHistory([]); }}
        onSelectUser={selectUser}
        onAction={performAction}
        onTopup={(user) => { setTopupUser(user); setShowTopup(true); }}
        showToast={showToast}
        history={{ echoCampaigns, batteurCampaigns, payouts: payoutHistory, loading: historyLoading, tab: historyTab, onTabChange: setHistoryTab }}
        payoutActions={{
          actionLoading: payoutActionLoading,
          rejectId: payoutRejectId,
          rejectReason: payoutRejectReason,
          onRejectIdChange: setPayoutRejectId,
          onRejectReasonChange: setPayoutRejectReason,
          onAction: handlePayoutAction,
        }}
      />

      <CreateBrandDrawer
        open={showCreateBrand}
        onClose={() => setShowCreateBrand(false)}
        value={newBrand}
        onChange={setNewBrand}
        creating={creatingBrand}
        onSubmit={createBrandUser}
      />

      <TopupDrawer
        open={showTopup}
        onClose={() => { setShowTopup(false); setTopupUser(null); setTopupAmount(""); }}
        user={topupUser}
        amount={topupAmount}
        onAmountChange={setTopupAmount}
        submitting={toppingUp}
        onSubmit={handleTopup}
      />
    </div>
  );
}
