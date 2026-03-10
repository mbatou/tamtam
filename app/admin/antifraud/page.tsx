"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import StatCard from "@/components/StatCard";

export default function AntiFraudPage() {
  const [stats, setStats] = useState({ totalClicks: 0, validClicks: 0, invalidClicks: 0, fraudRate: 0 });
  const [recentClicks, setRecentClicks] = useState<Array<{
    id: string; ip_address: string; user_agent: string; is_valid: boolean; created_at: string;
    tracked_links: { short_code: string; users: { name: string }; campaigns: { title: string } };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [totalRes, validRes, invalidRes, recentRes] = await Promise.all([
      supabase.from("clicks").select("*", { count: "exact", head: true }),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", true),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false),
      supabase.from("clicks").select("*, tracked_links(short_code, users(name), campaigns(title))").order("created_at", { ascending: false }).limit(50),
    ]);

    const total = totalRes.count || 0;
    const valid = validRes.count || 0;
    const invalid = invalidRes.count || 0;

    setStats({
      totalClicks: total, validClicks: valid, invalidClicks: invalid,
      fraudRate: total > 0 ? Math.round((invalid / total) * 100) : 0,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRecentClicks((recentRes.data || []) as any);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8">Anti-fraude</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total clics" value={stats.totalClicks.toString()} accent="orange" />
        <StatCard label="Clics valides" value={stats.validClicks.toString()} accent="teal" />
        <StatCard label="Clics invalides" value={stats.invalidClicks.toString()} accent="purple" />
        <StatCard label="Taux de fraude" value={`${stats.fraudRate}%`} accent={stats.fraudRate > 20 ? "orange" : "teal"} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5"><h2 className="font-bold">Derniers clics</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Statut</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Campagne</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Écho</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">IP</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentClicks.map((click) => (
                <tr key={click.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3"><span className={click.is_valid ? "badge-active" : "badge-failed"}>{click.is_valid ? "Valide" : "Invalide"}</span></td>
                  <td className="px-5 py-3 text-white/60">{click.tracked_links?.campaigns?.title || "—"}</td>
                  <td className="px-5 py-3 text-white/60">{click.tracked_links?.users?.name || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-white/40">{click.ip_address || "—"}</td>
                  <td className="px-5 py-3 text-white/40">{timeAgo(click.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentClicks.length === 0 && <div className="p-8 text-center"><p className="text-white/30 text-sm">Aucun clic enregistré.</p></div>}
      </div>
    </div>
  );
}
