"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

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

export default function UsersPageWrapper() {
  return <Suspense><UsersPageContent /></Suspense>;
}

function UsersPageContent() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  // Create brand user state
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
  });

  // Campaign history state
  const [history, setHistory] = useState<CampaignHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Top-up state
  const [showTopup, setShowTopup] = useState(false);
  const [topupUser, setTopupUser] = useState<UserRow | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  async function loadHistory(user: UserRow) {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await fetch(`/api/superadmin/users/history?user_id=${user.id}&role=${user.role}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.campaigns || []);
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
      // Load history in next tick to avoid calling during render
      setTimeout(() => {
        setHistoryLoading(true);
        setHistory([]);
        fetch(`/api/superadmin/users/history?user_id=${match.id}&role=${match.role}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => data && setHistory(data.campaigns || []))
          .finally(() => setHistoryLoading(false));
      }, 0);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/users");
      const data = await res.json();
      setUsers(data);
      if (highlightId) openUserById(data, highlightId);
    } catch {
      showToast(t("superadmin.users.loadError"), "error");
    }
    setLoading(false);
  }

  async function performAction(userId: string, action: string, reason?: string) {
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action, reason }),
      });
      if (res.ok) {
        showToast(t("superadmin.users.actionDone", { action }), "success");
        setSelected(null);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
  }

  async function createBrandUser() {
    if (!newBrand.name || !newBrand.email || !newBrand.password) {
      showToast(t("superadmin.users.nameEmailRequired"), "error");
      return;
    }
    if (newBrand.password.length < 6) {
      showToast(t("superadmin.users.passwordMinCreate"), "error");
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
        showToast(t("superadmin.users.batteurCreated"), "success");
        setShowCreateBrand(false);
        setNewBrand({ name: "", email: "", password: "", phone: "", city: "" });
        loadData();
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setCreatingBrand(false);
  }

  async function handleTopup() {
    if (!topupUser || !topupAmount || parseInt(topupAmount) <= 0) {
      showToast(t("superadmin.users.invalidAmount"), "error");
      return;
    }
    setToppingUp(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "topup",
          user_id: topupUser.id,
          amount: topupAmount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t("superadmin.users.newBalanceResult", { balance: formatFCFA(data.new_balance) }), "success");
        setShowTopup(false);
        setTopupUser(null);
        setTopupAmount("");
        setSelected(null);
        loadData();
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setToppingUp(false);
  }

  const echos = users.filter((u) => u.role === "echo");
  const batteurs = users.filter((u) => u.role === "batteur");

  const displayUsers = users.filter((u) => {
    if (roleFilter === "echo" && u.role !== "echo") return false;
    if (roleFilter === "batteur" && u.role !== "batteur") return false;
    if (filter === "verified") return u.status === "verified";
    if (filter === "flagged") return u.status === "flagged";
    if (filter === "suspended") return u.status === "suspended";
    return true;
  });

  const totalPaid = echos.reduce((sum, u) => sum + u.total_earned, 0);

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
        <h1 className="text-2xl font-bold">{t("superadmin.users.title")}</h1>
        <button
          onClick={() => setShowCreateBrand(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-bold hover:opacity-90 transition"
        >
          {t("superadmin.users.createBatteur")}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("superadmin.users.totalEchos")} value={echos.length.toString()} accent="orange" />
        <StatCard label={t("superadmin.users.batteurs")} value={batteurs.length.toString()} accent="teal" />
        <StatCard label={t("superadmin.users.flagged")} value={users.filter((u) => u.status === "flagged").length.toString()} accent="red" />
        <StatCard label={t("superadmin.users.totalPaid")} value={formatFCFA(totalPaid)} accent="purple" />
      </div>

      {/* Role filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: t("superadmin.users.all") },
          { key: "echo", label: t("superadmin.users.echosFilter") },
          { key: "batteur", label: t("superadmin.users.batteursFilter") },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => setRoleFilter(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              roleFilter === r.key ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <TabBar
        tabs={[
          { key: "all", label: t("superadmin.users.allTab"), count: users.length },
          { key: "verified", label: t("superadmin.users.verified"), count: users.filter((u) => u.status === "verified").length },
          { key: "flagged", label: t("superadmin.users.flaggedTab"), count: users.filter((u) => u.status === "flagged").length },
          { key: "suspended", label: t("superadmin.users.suspended"), count: users.filter((u) => u.status === "suspended").length },
        ]}
        active={filter}
        onChange={setFilter}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/30 border-b border-white/5">
              <th className="pb-3 font-semibold">{t("superadmin.users.user")}</th>
              <th className="pb-3 font-semibold">{t("superadmin.users.role")}</th>
              <th className="pb-3 font-semibold">{t("common.status")}</th>
              <th className="pb-3 font-semibold hidden md:table-cell">{t("superadmin.users.clicks")}</th>
              <th className="pb-3 font-semibold hidden md:table-cell">{t("superadmin.users.gains")}</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">{t("superadmin.users.balance")}</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">{t("superadmin.users.registered")}</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition"
                onClick={() => selectUser(user)}
              >
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-white/30">{user.city || user.phone || ""}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    user.role === "echo" ? "bg-primary/10 text-primary" :
                    user.role === "batteur" ? "bg-accent/10 text-accent" :
                    "bg-red-500/10 text-red-400"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3">
                  <Badge status={user.status || "active"} />
                </td>
                <td className="py-3 hidden md:table-cell text-xs">
                  {user.click_stats.total > 0 ? (
                    <span>
                      {user.click_stats.total} ({user.click_stats.rate}% fraude)
                    </span>
                  ) : "—"}
                </td>
                <td className="py-3 font-bold hidden md:table-cell">{formatFCFA(user.total_earned)}</td>
                <td className="py-3 hidden lg:table-cell">{formatFCFA(user.balance)}</td>
                <td className="py-3 text-xs text-white/40 hidden lg:table-cell">
                  {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setHistory([]); }} title={selected?.name || ""}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-bold text-white">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg">{selected.name}</h3>
                <p className="text-xs text-white/40">{selected.phone || ""} · {selected.city || ""} · {selected.role}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge status={selected.status || "active"} />
              {selected.risk_level && <Badge status={selected.risk_level} />}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{formatFCFA(selected.total_earned)}</div>
                <div className="text-[10px] text-white/40">{t("superadmin.users.totalEarnedLabel")}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{formatFCFA(selected.balance || 0)}</div>
                <div className="text-[10px] text-white/40">{t("superadmin.users.balance")}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{selected.click_stats.total}</div>
                <div className="text-[10px] text-white/40">{t("superadmin.users.totalClicks")}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold text-red-400">{selected.click_stats.rate}%</div>
                <div className="text-[10px] text-white/40">{t("superadmin.users.fraudRate")}</div>
              </div>
            </div>

            {/* Campaign history */}
            <div className="pt-3 border-t border-white/5">
              <h4 className="text-xs font-bold text-white/50 mb-3">
                {selected.role === "echo"
                  ? t("superadmin.users.campaignsJoined")
                  : t("superadmin.users.campaignsLaunched")}
              </h4>

              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-3">{t("superadmin.users.noCampaigns")}</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {history.map((c) => {
                    const statusColors: Record<string, string> = {
                      active: "text-emerald-400 bg-emerald-500/10",
                      completed: "text-blue-400 bg-blue-500/10",
                      paused: "text-yellow-400 bg-yellow-500/10",
                      draft: "text-white/40 bg-white/5",
                      rejected: "text-red-400 bg-red-500/10",
                    };
                    const isEcho = selected.role === "echo";
                    return (
                      <div key={c.campaign_id + (c.joined_at || c.created_at || "")} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-sm font-semibold truncate flex-1">{c.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColors[c.status] || "text-white/40 bg-white/5"}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
                          {isEcho ? (
                            <>
                              <span>{t("superadmin.users.histClicks")}: <strong className="text-white/70">{c.clicks}</strong></span>
                              <span>{t("superadmin.users.histEarned")}: <strong className="text-accent">{formatFCFA(c.earned || 0)}</strong></span>
                              <span>CPC: {formatFCFA(c.cpc)}</span>
                            </>
                          ) : (
                            <>
                              <span>{t("common.budget")}: <strong className="text-white/70">{formatFCFA(c.budget || 0)}</strong></span>
                              <span>{t("admin.dashboard.spent")}: <strong className="text-accent">{formatFCFA(c.spent || 0)}</strong></span>
                              <span>{t("superadmin.users.histEchos")}: <strong className="text-white/70">{c.echos}</strong></span>
                              <span>CPC: {formatFCFA(c.cpc)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top-up button for batteurs */}
            {selected.role === "batteur" && (
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setTopupUser(selected);
                    setShowTopup(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm"
                >
                  {t("superadmin.users.rechargeBalance")}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => performAction(selected.id, "verify")}
                className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
              >
                {t("superadmin.users.verify")}
              </button>
              <button
                onClick={() => performAction(selected.id, "flag")}
                className="flex-1 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold"
              >
                {t("superadmin.users.flag")}
              </button>
              <button
                onClick={() => performAction(selected.id, "suspend")}
                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                {t("superadmin.users.suspend")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => performAction(selected.id, "reset_balance")}
                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold"
              >
                {t("superadmin.users.resetBalance")}
              </button>
              <button
                onClick={() => performAction(selected.id, "promote_admin")}
                className="flex-1 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold"
              >
                {t("superadmin.users.promoteAdmin")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Brand User Modal */}
      <Modal open={showCreateBrand} onClose={() => setShowCreateBrand(false)} title={t("superadmin.users.createBatteurTitle")}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.users.brandNameLabel")}</label>
            <input
              type="text"
              value={newBrand.name}
              onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
              placeholder={t("superadmin.users.brandNamePlaceholder")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.users.emailLabel")}</label>
            <input
              type="email"
              value={newBrand.email}
              onChange={(e) => setNewBrand({ ...newBrand, email: e.target.value })}
              placeholder="contact@marque.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1">{t("superadmin.users.passwordLabel")}</label>
            <input
              type="password"
              value={newBrand.password}
              onChange={(e) => setNewBrand({ ...newBrand, password: e.target.value })}
              placeholder={t("common.minChars")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 block mb-1">{t("superadmin.users.phoneLabel")}</label>
              <input
                type="tel"
                value={newBrand.phone}
                onChange={(e) => setNewBrand({ ...newBrand, phone: e.target.value })}
                placeholder="+221..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">{t("superadmin.users.cityLabel")}</label>
              <input
                type="text"
                value={newBrand.city}
                onChange={(e) => setNewBrand({ ...newBrand, city: e.target.value })}
                placeholder="Dakar"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <button
            onClick={createBrandUser}
            disabled={creatingBrand}
            className="w-full py-3 rounded-xl bg-gradient-primary text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {creatingBrand ? t("superadmin.users.creating") : t("superadmin.users.createButton")}
          </button>
        </div>
      </Modal>

      {/* Top-Up Modal */}
      <Modal
        open={showTopup}
        onClose={() => { setShowTopup(false); setTopupUser(null); setTopupAmount(""); }}
        title={t("superadmin.users.rechargeTitle", { name: topupUser?.name || "" })}
      >
        {topupUser && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white">
                  {topupUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{topupUser.name}</div>
                  <div className="text-xs text-white/40">{topupUser.phone || topupUser.city || "batteur"}</div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">{t("superadmin.users.currentBalance")}</span>
                <span className="font-bold text-accent">{formatFCFA(topupUser.balance || 0)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 block mb-1">{t("superadmin.users.rechargeAmount")}</label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder={t("superadmin.users.rechargeAmountPlaceholder")}
                min="100"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>

            {topupAmount && parseInt(topupAmount) > 0 && (
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">{t("superadmin.users.newBalance")}</span>
                  <span className="font-bold text-accent">
                    {formatFCFA((topupUser.balance || 0) + parseInt(topupAmount))}
                  </span>
                </div>
              </div>
            )}

            {/* Quick amounts */}
            <div className="flex gap-2">
              {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt.toString())}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    topupAmount === amt.toString()
                      ? "bg-gradient-primary text-white"
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  {amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>

            <button
              onClick={handleTopup}
              disabled={toppingUp || !topupAmount || parseInt(topupAmount) <= 0}
              className="w-full py-3 rounded-xl bg-gradient-primary text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {toppingUp ? t("superadmin.users.recharging") : t("superadmin.users.rechargeButton", { amount: topupAmount ? formatFCFA(parseInt(topupAmount)) : "" })}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
