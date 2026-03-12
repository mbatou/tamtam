"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";
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

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/users");
      const data = await res.json();
      setUsers(data);
    } catch {
      showToast("Erreur de chargement", "error");
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

      <h1 className="text-2xl font-bold mb-6">Utilisateurs</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Échos" value={echos.length.toString()} accent="orange" />
        <StatCard label="Batteurs" value={batteurs.length.toString()} accent="teal" />
        <StatCard label="Signalés" value={users.filter((u) => u.status === "flagged").length.toString()} accent="red" />
        <StatCard label="Total payé" value={formatFCFA(totalPaid)} accent="purple" />
      </div>

      {/* Role filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "Tous" },
          { key: "echo", label: "Échos" },
          { key: "batteur", label: "Batteurs" },
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
          { key: "all", label: "Tous", count: users.length },
          { key: "verified", label: "Vérifiés", count: users.filter((u) => u.status === "verified").length },
          { key: "flagged", label: "Signalés", count: users.filter((u) => u.status === "flagged").length },
          { key: "suspended", label: "Suspendus", count: users.filter((u) => u.status === "suspended").length },
        ]}
        active={filter}
        onChange={setFilter}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/30 border-b border-white/5">
              <th className="pb-3 font-semibold">Utilisateur</th>
              <th className="pb-3 font-semibold">Rôle</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Clics</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Gains</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Solde</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition"
                onClick={() => setSelected(user)}
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
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ""}>
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
                <div className="text-[10px] text-white/40">Total gagné</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{formatFCFA(selected.balance)}</div>
                <div className="text-[10px] text-white/40">Solde</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{selected.click_stats.total}</div>
                <div className="text-[10px] text-white/40">Clics totaux</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold text-red-400">{selected.click_stats.rate}%</div>
                <div className="text-[10px] text-white/40">Taux fraude</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => performAction(selected.id, "verify")}
                className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
              >
                Vérifier
              </button>
              <button
                onClick={() => performAction(selected.id, "flag")}
                className="flex-1 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold"
              >
                Signaler
              </button>
              <button
                onClick={() => performAction(selected.id, "suspend")}
                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                Suspendre
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => performAction(selected.id, "reset_balance")}
                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold"
              >
                Reset solde
              </button>
              <button
                onClick={() => performAction(selected.id, "promote_admin")}
                className="flex-1 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold"
              >
                Promouvoir Admin
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
