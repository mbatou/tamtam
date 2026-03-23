"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";
import { SENEGAL_CITIES } from "@/lib/cities";
import { useTranslation } from "@/lib/i18n";

interface EchoWithStats {
  id: string;
  name: string;
  phone: string;
  city: string;
  mobile_money_provider: string;
  balance: number;
  total_earned: number;
  status: string;
  created_at: string;
  brand_clicks: number;
  brand_earned: number;
  campaign_count: number;
  campaign_names: string[];
}

export default function AdminEchosPage() {
  const { t } = useTranslation();
  const [echos, setEchos] = useState<EchoWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");

  useEffect(() => { loadEchos(); }, []);

  async function loadEchos() {
    const res = await fetch("/api/admin/echos");
    if (res.ok) {
      const data = await res.json();
      setEchos(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // Use official city list for filter, only show cities that have echos
  const echoCityCounts = new Map<string, number>();
  echos.forEach(e => { if (e.city) echoCityCounts.set(e.city, (echoCityCounts.get(e.city) || 0) + 1); });
  const cities = SENEGAL_CITIES.filter(c => echoCityCounts.has(c));
  const filteredEchos = cityFilter === "all" ? echos : echos.filter(e => e.city === cityFilter);

  // Top performer insight — single best echo
  const totalClicks = echos.reduce((sum, e) => sum + e.brand_clicks, 0);
  const topEcho = echos.length > 0
    ? echos.reduce((best, e) => e.brand_clicks > best.brand_clicks ? e : best, echos[0])
    : null;
  const topPct = topEcho && totalClicks > 0
    ? Math.round((topEcho.brand_clicks / totalClicks) * 100)
    : 0;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.echos.title")}</h1>
          <span className="text-sm text-white/40">{echos.length} {t("admin.echos.engaged")}</span>
        </div>
        {cities.length > 1 && (
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
          >
            <option value="all" className="bg-[#1a1a2e]">{t("admin.echos.allCities")} ({echos.length})</option>
            {cities.map(city => {
              const count = echoCityCounts.get(city) || 0;
              return (
                <option key={city} value={city} className="bg-[#1a1a2e]">{city} ({count})</option>
              );
            })}
          </select>
        )}
      </div>

      {/* Top performer insight */}
      {topEcho && topEcho.brand_clicks > 0 && echos.length >= 3 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-sm text-white/70">
            {t("admin.echos.topInsightSingle", {
              name: topEcho.name,
              city: topEcho.city || "",
              clicks: String(topEcho.brand_clicks),
              pct: String(topPct),
            })}
          </p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">#</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("common.name")}</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("common.phone")}</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("common.city")}</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("admin.echos.campaigns")}</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("common.clicks")}</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("admin.echos.wonByYou")}</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">{t("admin.echos.payment")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEchos.map((echo, i) => (
                <tr key={echo.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"}`}>{i + 1}</span>
                  </td>
                  <td className="px-5 py-4 font-semibold">{echo.name}</td>
                  <td className="px-5 py-4 text-white/60">{echo.phone}</td>
                  <td className="px-5 py-4 text-white/60">{echo.city || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold">{echo.campaign_count}</span>
                      <span className="text-[10px] text-white/30 line-clamp-1" title={echo.campaign_names.join(", ")}>{echo.campaign_names.join(", ")}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold">{echo.brand_clicks}</td>
                  <td className="px-5 py-4 text-accent font-bold">{formatFCFA(echo.brand_earned)}</td>
                  <td className="px-5 py-4 text-xs font-semibold">{echo.mobile_money_provider === "wave" ? t("common.wave") : echo.mobile_money_provider === "orange_money" ? t("common.orangeMoney") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEchos.length === 0 && <div className="p-8 text-center"><p className="text-white/30 text-sm">{t("admin.echos.noEchos")}</p></div>}
      </div>
    </div>
  );
}
