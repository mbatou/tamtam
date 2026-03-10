"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, formatNumber } from "@/lib/utils";
import StatCard from "@/components/StatCard";

interface Stats {
  totalClicks: number;
  validClicks: number;
  activeEchos: number;
  budgetSpent: number;
  activeRythmes: number;
  totalEchos: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalClicks: 0,
    validClicks: 0,
    activeEchos: 0,
    budgetSpent: 0,
    activeRythmes: 0,
    totalEchos: 0,
  });
  const [topEchos, setTopEchos] = useState<{ id: string; name: string; total_earned: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const [clicksRes, validClicksRes, echosRes, campaignsRes, topRes] = await Promise.all([
      supabase.from("clicks").select("*", { count: "exact", head: true }),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo"),
      supabase.from("campaigns").select("*"),
      supabase
        .from("users")
        .select("id, name, total_earned")
        .eq("role", "echo")
        .order("total_earned", { ascending: false })
        .limit(10),
    ]);

    const campaigns = campaignsRes.data || [];
    const activeCampaigns = campaigns.filter((c) => c.status === "active");
    const totalSpent = campaigns.reduce((sum: number, c: { spent?: number }) => sum + (c.spent || 0), 0);

    setStats({
      totalClicks: clicksRes.count || 0,
      validClicks: validClicksRes.count || 0,
      activeEchos: echosRes.count || 0,
      budgetSpent: totalSpent,
      activeRythmes: activeCampaigns.length,
      totalEchos: echosRes.count || 0,
    });

    setTopEchos(topRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total clics" value={formatNumber(stats.totalClicks)} accent="orange" />
        <StatCard label="Clics valides" value={formatNumber(stats.validClicks)} accent="teal" />
        <StatCard label="Échos actifs" value={stats.activeEchos.toString()} accent="purple" />
        <StatCard label="Budget dépensé" value={formatFCFA(stats.budgetSpent)} accent="orange" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Rythmes actifs" value={stats.activeRythmes.toString()} accent="teal" />
        <StatCard
          label="Taux de validité"
          value={stats.totalClicks > 0 ? `${Math.round((stats.validClicks / stats.totalClicks) * 100)}%` : "—"}
          accent="orange"
        />
        <StatCard label="Total Échos" value={stats.totalEchos.toString()} accent="purple" />
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Top Échos</h2>
        <div className="space-y-3">
          {topEchos.length === 0 ? (
            <p className="text-white/30 text-sm">Aucun écho enregistré.</p>
          ) : (
            topEchos.map((echo, i) => (
              <div key={echo.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold">{echo.name}</span>
                </div>
                <span className="text-sm font-bold text-accent">{formatFCFA(echo.total_earned)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
