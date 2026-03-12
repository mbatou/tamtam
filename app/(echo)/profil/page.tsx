"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalClicks: 0, activeCampaigns: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, linksRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/links"),
    ]);

    if (userRes.ok) {
      const userData = await userRes.json();
      setUser(userData);
    }

    if (linksRes.ok) {
      const linksData = await linksRes.json();
      const links = Array.isArray(linksData) ? linksData : [];
      const totalClicks = links.reduce((sum: number, l: { click_count: number }) => sum + l.click_count, 0);
      const activeCampaigns = links.filter((l: { campaigns?: { status: string } }) => l.campaigns?.status === "active").length;
      const totalEarned = links.reduce((sum: number, l: { click_count: number; campaigns?: { cpc: number } }) => {
        return sum + Math.floor(l.click_count * (l.campaigns?.cpc || 0) * 0.75);
      }, 0);
      setStats({ totalClicks, activeCampaigns, totalEarned });
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5">Mon Profil</h1>

      {/* Profile card */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-black shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{user?.name}</h2>
            <p className="text-xs text-white/40">{user?.phone}</p>
            {user?.city && <p className="text-xs text-white/30">{user.city}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black">{stats.totalClicks}</p>
          <p className="text-[9px] text-white/40 font-semibold">Resonances</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black">{stats.activeCampaigns}</p>
          <p className="text-[9px] text-white/40 font-semibold">Rythmes</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black text-accent">{formatFCFA(stats.totalEarned)}</p>
          <p className="text-[9px] text-white/40 font-semibold">Gagne</p>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card divide-y divide-white/5 mb-5">
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">Solde</span>
          <span className="text-xs font-bold text-primary">{formatFCFA(user?.balance || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">Total gagne</span>
          <span className="text-xs font-bold text-accent">{formatFCFA(user?.total_earned || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">Moyen de paiement</span>
          <span className="text-xs font-semibold">
            {user?.mobile_money_provider === "wave" ? "Wave" : "Orange Money"}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">Ville</span>
          <span className="text-xs font-semibold">{user?.city || "—"}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">Membre depuis</span>
          <span className="text-xs font-semibold">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-btn border border-red-500/20 text-red-400 text-sm font-semibold active:bg-red-500/10 transition"
      >
        Se deconnecter
      </button>
    </div>
  );
}
