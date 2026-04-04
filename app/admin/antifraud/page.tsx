"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";

export default function AntiFraudPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ totalClicks: 0, validClicks: 0, invalidClicks: 0, fraudRate: 0 });
  const [recentClicks, setRecentClicks] = useState<Array<{
    id: string; ip_address: string; is_valid: boolean; created_at: string;
    tracked_links: { short_code: string; users: { name: string }; campaigns: { title: string } };
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const res = await fetch("/api/admin/antifraud");
    if (res.ok) {
      const data = await res.json();
      setStats({
        totalClicks: data.totalClicks || 0,
        validClicks: data.validClicks || 0,
        invalidClicks: data.invalidClicks || 0,
        fraudRate: data.fraudRate || 0,
      });
      setRecentClicks(data.recentClicks || []);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8">{t("admin.antifraud.title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("admin.dashboard.totalClicks")} value={stats.totalClicks.toString()} accent="orange" />
        <StatCard label={t("admin.dashboard.validClicks")} value={stats.validClicks.toString()} accent="teal" />
        <StatCard label={t("admin.antifraud.invalidClicks")} value={stats.invalidClicks.toString()} accent="purple" />
        <StatCard label={t("admin.antifraud.fraudRate")} value={`${stats.fraudRate}%`} accent={stats.fraudRate > 20 ? "orange" : "teal"} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5"><h2 className="font-bold">{t("admin.antifraud.recentClicks")}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.status")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("admin.analytics.campaign")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("admin.payouts.echoLabel")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("admin.antifraud.ip")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.date")}</th>
              </tr>
            </thead>
            <tbody>
              {recentClicks.map((click) => (
                <tr key={click.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3"><span className={click.is_valid ? "badge-active" : "badge-failed"}>{click.is_valid ? t("common.valid") : t("common.invalid")}</span></td>
                  <td className="px-5 py-3 text-white/60">{click.tracked_links?.campaigns?.title || "—"}</td>
                  <td className="px-5 py-3 text-white/60">{click.tracked_links?.users?.name || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-white/40">{click.ip_address || "—"}</td>
                  <td className="px-5 py-3 text-white/40">{timeAgo(click.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentClicks.length === 0 && <div className="p-8 text-center"><p className="text-white/30 text-sm">{t("admin.antifraud.noClicks")}</p></div>}
      </div>
    </div>
  );
}
