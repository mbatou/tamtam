"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { User } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "echo")
      .order("total_earned", { ascending: false });

    setUsers((data || []) as User[]);
    setLoading(false);
  }

  async function updateUserStatus(userId: string, status: string) {
    await supabase.from("users").update({ status }).eq("id", userId);
    showToast(`Status mis à jour: ${status}`, "success");
    setSelected(null);
    loadData();
  }

  const filtered = users.filter((u) => {
    if (filter === "verified") return u.status === "verified";
    if (filter === "flagged") return u.status === "flagged";
    if (filter === "high") return u.risk_level === "high";
    return true;
  });

  const totalPaid = users.reduce((sum, u) => sum + u.total_earned, 0);

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

      <h1 className="text-2xl font-bold mb-6">👥 Utilisateurs</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Échos" value={users.length.toString()} accent="orange" />
        <StatCard label="Vérifiés" value={users.filter((u) => u.status === "verified").length.toString()} accent="teal" />
        <StatCard label="Signalés" value={users.filter((u) => u.status === "flagged").length.toString()} accent="red" />
        <StatCard label="Total payé" value={formatFCFA(totalPaid)} accent="purple" />
      </div>

      <TabBar
        tabs={[
          { key: "all", label: "Tous", count: users.length },
          { key: "verified", label: "Vérifiés", count: users.filter((u) => u.status === "verified").length },
          { key: "flagged", label: "Signalés", count: users.filter((u) => u.status === "flagged").length },
          { key: "high", label: "Haut risque", count: users.filter((u) => u.risk_level === "high").length },
        ]}
        active={filter}
        onChange={setFilter}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/30 border-b border-white/5">
              <th className="pb-3 font-semibold">Écho</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Risque</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Gains</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Solde</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Fournisseur</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
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
                      <div className="text-xs text-white/30">{user.city || ""}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <Badge status={user.status || "active"} />
                </td>
                <td className="py-3 hidden md:table-cell">
                  <Badge status={user.risk_level || "low"} />
                </td>
                <td className="py-3 font-bold hidden md:table-cell">{formatFCFA(user.total_earned)}</td>
                <td className="py-3 hidden lg:table-cell">{formatFCFA(user.balance)}</td>
                <td className="py-3 hidden lg:table-cell text-xs">
                  {user.mobile_money_provider === "wave" ? "🌊 Wave" : user.mobile_money_provider === "orange_money" ? "🟠 OM" : "—"}
                </td>
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
                <p className="text-xs text-white/40">{selected.phone || ""} · {selected.city || ""}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge status={selected.status || "active"} />
              <Badge status={selected.risk_level || "low"} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{formatFCFA(selected.total_earned)}</div>
                <div className="text-[10px] text-white/40">Total gagné</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold">{formatFCFA(selected.balance)}</div>
                <div className="text-[10px] text-white/40">Solde</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg font-bold">
                  {selected.mobile_money_provider === "wave" ? "🌊" : "🟠"}
                </div>
                <div className="text-[10px] text-white/40">
                  {selected.mobile_money_provider === "wave" ? "Wave" : "OM"}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => updateUserStatus(selected.id, "verified")}
                className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
              >
                Vérifier
              </button>
              <button
                onClick={() => updateUserStatus(selected.id, "flagged")}
                className="flex-1 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold"
              >
                Signaler
              </button>
              <button
                onClick={() => updateUserStatus(selected.id, "suspended")}
                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                Suspendre
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
