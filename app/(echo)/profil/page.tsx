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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon Profil</h1>

      <div className="glass-card p-6 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-black mb-4">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-sm text-white/40">{user?.phone}</p>
        {user?.city && <p className="text-sm text-white/30">{user.city}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black">{stats.totalClicks}</p>
          <p className="text-[10px] text-white/40 font-semibold">Résonances</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black">{stats.activeCampaigns}</p>
          <p className="text-[10px] text-white/40 font-semibold">Rythmes actifs</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-accent">{formatFCFA(stats.totalEarned)}</p>
          <p className="text-[10px] text-white/40 font-semibold">Gagné</p>
        </div>
      </div>

      <div className="glass-card p-6 mb-6 space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Solde</span>
          <span className="text-sm font-bold text-primary">{formatFCFA(user?.balance || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Total gagné</span>
          <span className="text-sm font-bold text-accent">{formatFCFA(user?.total_earned || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Moyen de paiement</span>
          <span className="text-sm font-semibold">
            {user?.mobile_money_provider === "wave" ? "Wave" : "Orange Money"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Ville</span>
          <span className="text-sm font-semibold">{user?.city || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Membre depuis</span>
          <span className="text-sm font-semibold">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-btn border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition"
      >
        Se déconnecter
      </button>
    </div>
  );
}
