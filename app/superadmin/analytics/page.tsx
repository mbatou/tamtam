"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DayData {
  date: string;
  clicks: number;
  revenue: number;
  echos: number;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [weekStats, setWeekStats] = useState({ clicks: 0, revenue: 0, newEchos: 0, fraudRate: 0 });
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [topEchos, setTopEchos] = useState<{ name: string; total_earned: number }[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<{ title: string; name: string; clicks: number; echos: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [clicksRes, invalidRes, newEchosRes, allClicksRes, topEchosRes, campaignsRes, linksRes] = await Promise.all([
      supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", weekAgo).eq("is_valid", false),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "echo").gte("created_at", weekAgo),
      supabase.from("clicks").select("created_at, is_valid").gte("created_at", weekAgo),
      supabase.from("users").select("name, total_earned").eq("role", "echo").order("total_earned", { ascending: false }).limit(5),
      supabase.from("campaigns").select("id, title, spent, cpc, batteur_id, users(name)").order("spent", { ascending: false }).limit(5),
      supabase.from("tracked_links").select("campaign_id"),
    ]);

    const totalWeek = clicksRes.count || 0;
    const invalidWeek = invalidRes.count || 0;

    setWeekStats({
      clicks: totalWeek,
      revenue: 0, // calculated from chart data
      newEchos: newEchosRes.count || 0,
      fraudRate: totalWeek > 0 ? Math.round((invalidWeek / totalWeek) * 100) : 0,
    });

    // Build daily chart data
    const days: DayData[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      const dayClicks = (allClicksRes.data || []).filter(
        (c) => c.created_at.startsWith(dateStr) && c.is_valid !== false
      ).length;
      days.push({
        date: label,
        clicks: dayClicks,
        revenue: Math.floor(dayClicks * 25 * 0.25), // approximate
        echos: 0,
      });
    }
    setChartData(days);
    setWeekStats((s) => ({
      ...s,
      revenue: days.reduce((sum, d) => sum + d.revenue, 0),
    }));

    setTopEchos((topEchosRes.data || []) as { name: string; total_earned: number }[]);

    // Top campaigns with echo count
    const echoCountMap = new Map<string, number>();
    (linksRes.data || []).forEach((l: { campaign_id: string }) => {
      echoCountMap.set(l.campaign_id, (echoCountMap.get(l.campaign_id) || 0) + 1);
    });

    setTopCampaigns(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (campaignsRes.data || []).map((c: any) => ({
        title: c.title,
        name: Array.isArray(c.users) ? c.users[0]?.name || "—" : c.users?.name || "—",
        clicks: c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0,
        echos: echoCountMap.get(c.id) || 0,
      }))
    );

    setLoading(false);
  }

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
      <h1 className="text-2xl font-bold mb-6">{t("superadmin.analytics.title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("superadmin.analytics.weekClicks")} value={formatNumber(weekStats.clicks)} accent="orange" />
        <StatCard label={t("superadmin.analytics.weekRevenue")} value={formatFCFA(weekStats.revenue)} accent="teal" />
        <StatCard label={t("superadmin.analytics.newEchos")} value={weekStats.newEchos.toString()} accent="purple" />
        <StatCard label={t("superadmin.analytics.fraudRate")} value={`${weekStats.fraudRate}%`} accent="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.analytics.clicksPerDay")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              />
              <Bar dataKey="clicks" fill="url(#gradOrange)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D35400" />
                  <stop offset="100%" stopColor="#F39C12" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.analytics.revenuePerDay")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatFCFA(Number(value))}
              />
              <Bar dataKey="revenue" fill="url(#gradTeal)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1ABC9C" />
                  <stop offset="100%" stopColor="#16A085" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.analytics.topEchos")}</h3>
          <div className="space-y-3">
            {topEchos.map((echo, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
                  }`}>
                    {["🥇", "🥈", "🥉"][i] || i + 1}
                  </span>
                  <span className="text-sm font-semibold">{echo.name}</span>
                </div>
                <span className="text-sm font-bold text-accent">{formatFCFA(echo.total_earned)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.analytics.topCampaigns")}</h3>
          <div className="space-y-3">
            {topCampaigns.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-semibold block">{c.title}</span>
                  <span className="text-xs text-white/30">{c.name} · {c.echos} échos</span>
                </div>
                <span className="text-sm font-bold text-primary">{formatNumber(c.clicks)} clics</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
