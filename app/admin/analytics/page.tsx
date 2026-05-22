"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface CampaignAnalytics {
  id: string;
  title: string;
  status: string;
  budget: number;
  spent: number;
  cpc: number;
  created_at: string;
  totalClicks: number;
  validClicks: number;
  fraudClicks: number;
  echoCount: number;
  dailyClicks: { date: string; valid: number; fraud: number }[];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected"),
    };
    return map[status] || status;
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "active": return { dot: "#D35400", color: "#D35400", bg: "rgba(211,84,0,0.1)" };
      case "paused": return { dot: "#EAB308", color: "#EAB308", bg: "rgba(234,179,8,0.1)" };
      case "completed": return { dot: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
      case "rejected": return { dot: "#EF4444", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
      default: return { dot: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
    }
  }

  async function downloadPDF(campaigns: CampaignAnalytics[]) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

    doc.setFontSize(20);
    doc.setTextColor(211, 84, 0);
    doc.text("Tamtam — Analytics Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(t("admin.analytics.generatedOn", { date }), 14, 28);

    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const totalValid = campaigns.reduce((s, c) => s + c.validClicks, 0);
    const totalReach = campaigns.reduce((s, c) => s + c.totalClicks, 0);
    const avgCPC = totalValid > 0 ? Math.round(totalSpent / totalValid) : 0;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(t("admin.analytics.globalSummary"), 14, 42);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`${t("admin.analytics.totalReach")}: ${totalReach.toLocaleString()}`, 14, 52);
    doc.text(`${t("admin.analytics.realVisitors")}: ${totalValid.toLocaleString()}`, 14, 58);
    doc.text(`${t("admin.analytics.totalSpent")}: ${totalSpent.toLocaleString()} FCFA`, 14, 64);
    doc.text(`${t("admin.analytics.costPerVisitor")}: ${avgCPC.toLocaleString()} FCFA`, 14, 70);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(t("admin.analytics.detailsByCampaign"), 14, 86);

    let y = 96;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(t("admin.analytics.headerCampaign"), 14, y);
    doc.text(t("admin.analytics.headerStatus"), 80, y);
    doc.text(t("admin.analytics.headerBudget"), 110, y);
    doc.text(t("admin.analytics.headerSpent"), 135, y);
    doc.text(t("admin.analytics.headerVisitors"), 162, y);
    doc.text(t("admin.analytics.headerCPC"), 185, y);
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    for (const c of campaigns) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const cpc = c.validClicks > 0 ? Math.round(c.spent / c.validClicks) : 0;
      doc.text(c.title.slice(0, 30), 14, y);
      doc.text(getStatusLabel(c.status), 80, y);
      doc.text(`${c.budget.toLocaleString()}`, 110, y);
      doc.text(`${c.spent.toLocaleString()}`, 135, y);
      doc.text(`${c.validClicks.toLocaleString()}`, 162, y);
      doc.text(cpc > 0 ? `${cpc.toLocaleString()}` : "—", 185, y);
      y += 8;
    }

    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(t("admin.analytics.generatedBy"), 14, 285);
    doc.save(`tamtam-rapport-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function shareWhatsApp(campaigns: CampaignAnalytics[]) {
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const totalValid = campaigns.reduce((s, c) => s + c.validClicks, 0);
    const avgCPC = totalValid > 0 ? Math.round(totalSpent / totalValid) : 0;

    const text = [
      `📊 *${t("admin.analytics.whatsappReport")}*`,
      ``,
      `📣 ${campaigns.length} ${t("admin.analytics.whatsappCampaigns")}`,
      `👁 ${totalValid.toLocaleString()} ${t("admin.analytics.whatsappVisitors")}`,
      `💰 ${totalSpent.toLocaleString()} ${t("admin.analytics.whatsappSpent")}`,
      `📉 ${avgCPC.toLocaleString()} ${t("admin.analytics.whatsappCPV")}`,
      ``,
      campaigns.slice(0, 5).map((c) => {
        const cpc = c.validClicks > 0 ? Math.round(c.spent / c.validClicks) : 0;
        return `• ${c.title}: ${c.validClicks} ${t("admin.analytics.whatsappVisitors")}, ${cpc} FCFA/${t("common.clicks")}`;
      }).join("\n"),
      ``,
      t("admin.analytics.whatsappGenerated"),
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function downloadCSV(campaigns: CampaignAnalytics[]) {
    const header = t("admin.analytics.csvHeader") + "\n";
    const rows = campaigns.map((c) => {
      const cpc = c.validClicks > 0 ? Math.round(c.spent / c.validClicks) : 0;
      return `"${c.title}",${getStatusLabel(c.status)},${c.budget},${c.spent},${cpc},${c.totalClicks},${c.validClicks},${cpc},${c.echoCount}`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamtam-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        if (data.campaigns?.length > 0) setSelectedId(data.campaigns[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-5" style={{ maxWidth: "100%" }}>
        <div className="h-7 w-40 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <div className="h-3 w-20 rounded mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-6 w-16 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
          ))}
        </div>
        <div className="rounded-2xl h-72 animate-pulse" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }} />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
        <h1 className="text-xl font-bold font-syne text-white mb-8">{t("admin.analytics.title")}</h1>
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(211,84,0,0.1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          </div>
          <p className="text-sm font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.analytics.noAnalytics")}</p>
          <a
            href="/admin/campaigns"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all active:scale-[0.97]"
            style={{ background: "#D35400" }}
          >
            {t("admin.dashboard.launchRythme")}
          </a>
        </div>
      </div>
    );
  }

  const selected = campaigns.find((c) => c.id === selectedId) || campaigns[0];

  const totals = campaigns.reduce(
    (acc, c) => ({
      clicks: acc.clicks + c.totalClicks,
      valid: acc.valid + c.validClicks,
      spent: acc.spent + c.spent,
      budget: acc.budget + c.budget,
    }),
    { clicks: 0, valid: 0, spent: 0, budget: 0 }
  );

  const costPerClick = totals.valid > 0 ? Math.round(totals.spent / totals.valid) : 0;
  const avgConfiguredCPC = campaigns.length > 0
    ? Math.round(campaigns.reduce((s, c) => s + c.cpc, 0) / campaigns.length)
    : 0;
  const progress = selected.budget > 0 ? Math.round((selected.spent / selected.budget) * 100) : 0;
  const selectedCPC = selected.validClicks > 0 ? Math.round(selected.spent / selected.validClicks) : 0;

  const bestCampaign = [...campaigns]
    .filter(c => c.validClicks > 0)
    .sort((a, b) => (a.spent / a.validClicks) - (b.spent / b.validClicks))[0];

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">{t("admin.analytics.title")}</h1>
          <p className="text-[11px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {campaigns.length} {campaigns.length === 1 ? t("admin.campaigns.rythmeCount") : t("admin.campaigns.rythmeCountPlural")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadPDF(campaigns)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}
            aria-label={t("admin.analytics.downloadPDF")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            PDF
          </button>
          <button
            onClick={() => shareWhatsApp(campaigns)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors"
            style={{ background: "rgba(37,211,102,0.08)", color: "#25D366" }}
            aria-label="WhatsApp"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={() => downloadCSV(campaigns)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
            aria-label="CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label={t("admin.dashboard.totalReach")} value={formatNumber(totals.clicks)} accent="orange" />
        <StatCard label={t("admin.analytics.realVisitors")} value={formatNumber(totals.valid)} accent="teal" />
        <StatCard label={t("admin.dashboard.costPerClick")} value={costPerClick > 0 ? formatFCFA(costPerClick) : totals.spent > 0 ? formatFCFA(avgConfiguredCPC) : "—"} accent="purple" />
        <StatCard label={t("admin.dashboard.budgetSpent")} value={formatFCFA(totals.spent)} accent="orange" />
      </div>

      {/* ROI Calculator */}
      {totals.valid > 0 && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.analytics.roiTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[10px] font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.analytics.youSpent")}</p>
              <p className="text-lg font-black font-syne" style={{ color: "#D35400" }}>{formatFCFA(totals.spent)}</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[10px] font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.analytics.youGot")}</p>
              <p className="text-lg font-black font-syne" style={{ color: "#1D9E75" }}>{formatNumber(totals.valid)} {t("admin.analytics.visitors")}</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[10px] font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.analytics.costPerVisitor")}</p>
              <p className="text-lg font-black font-syne text-white">{formatFCFA(costPerClick)}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "rgba(29,158,117,0.04)", border: "0.5px solid rgba(29,158,117,0.1)" }}>
            <p className="text-xs font-dm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>{t("admin.analytics.comparison")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Facebook Ads</span>
                <span className="font-semibold text-white">200-500 FCFA/{t("common.clicks")}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Instagram Ads</span>
                <span className="font-semibold text-white">300-800 FCFA/{t("common.clicks")}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold" style={{ color: "#1D9E75" }}>Tamtam</span>
                <span className="font-bold" style={{ color: "#1D9E75" }}>{formatFCFA(costPerClick)}/{t("common.clicks")}</span>
              </div>
            </div>
            {costPerClick < 200 && (
              <p className="text-[10px] font-semibold mt-3" style={{ color: "#1D9E75" }}>
                {t("admin.analytics.savings")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Campaign detail + chart */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold font-syne text-white">{t("admin.analytics.campaignDetails")}</h3>
          <select
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
            aria-label={t("admin.analytics.campaignDetails")}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id} style={{ background: "#111128" }}>
                {c.title} ({getStatusLabel(c.status)})
              </option>
            ))}
          </select>
        </div>

        {/* Selected campaign KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[9px] font-dm mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.dashboard.totalReach")}</p>
            <p className="text-base font-bold font-syne text-white">{formatNumber(selected.totalClicks)}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[9px] font-dm mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.analytics.realVisitors")}</p>
            <p className="text-base font-bold font-syne" style={{ color: "#1D9E75" }}>{formatNumber(selected.validClicks)}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[9px] font-dm mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.dashboard.costPerClick")}</p>
            <p className="text-base font-bold font-syne" style={{ color: "#8B5CF6" }}>{selectedCPC > 0 ? formatFCFA(selectedCPC) : selected.spent > 0 ? formatFCFA(selected.cpc) : "—"}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[9px] font-dm mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.dashboard.activeEchos")}</p>
            <p className="text-base font-bold font-syne text-white">{selected.echoCount}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[9px] font-dm mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("common.budget")}</p>
            <p className="text-base font-bold font-syne" style={{ color: progress >= 100 ? "#1D9E75" : "#D35400" }}>
              {progress >= 100 ? t("admin.analytics.consumed") : `${progress}%`}
            </p>
          </div>
        </div>

        {/* Daily clicks chart */}
        <p className="text-[10px] font-dm mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.analytics.clicksPerDay")}</p>
        {selected.dailyClicks.some((d) => d.valid > 0 || d.fraud > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={selected.dailyClicks}>
              <defs>
                <linearGradient id="gradValidAn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D35400" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D35400" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111128", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                labelFormatter={(v) => formatShortDate(String(v))}
              />
              <Area type="monotone" dataKey="valid" name={t("admin.analytics.realVisitors")} stroke="#D35400" fill="url(#gradValidAn)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[11px] text-center py-10 font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.analytics.noClicksCampaign")}</p>
        )}
      </div>

      {/* Campaign comparison table */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.analytics.campaignComparison")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ color: "rgba(255,255,255,0.35)" }}>
                <th className="pb-3 text-left font-medium font-dm">{t("admin.analytics.campaign")}</th>
                <th className="pb-3 text-left font-medium font-dm">{t("common.status")}</th>
                <th className="pb-3 text-right font-medium font-dm">{t("common.budget")}</th>
                <th className="pb-3 text-right font-medium font-dm">{t("admin.dashboard.budgetSpent")}</th>
                <th className="pb-3 text-right font-medium font-dm">{t("admin.analytics.realVisitors")}</th>
                <th className="pb-3 text-right font-medium font-dm">{t("admin.dashboard.costPerClick")}</th>
                <th className="pb-3 text-right font-medium font-dm">{t("admin.dashboard.activeEchos")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const cpc = c.validClicks > 0 ? Math.round(c.spent / c.validClicks) : 0;
                const displayCPC = cpc > 0 ? formatFCFA(cpc) : c.spent > 0 ? formatFCFA(c.cpc) : "—";
                const isBest = bestCampaign && c.id === bestCampaign.id && campaigns.length > 1;
                const ss = getStatusStyle(c.status);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderTop: "0.5px solid rgba(255,255,255,0.04)",
                      background: c.id === selected.id ? "rgba(211,84,0,0.04)" : isBest ? "rgba(29,158,117,0.03)" : "transparent",
                    }}
                    onMouseEnter={e => { if (c.id !== selected.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c.id === selected.id ? "rgba(211,84,0,0.04)" : isBest ? "rgba(29,158,117,0.03)" : "transparent"; }}
                  >
                    <td className="py-2.5 font-semibold text-white">
                      {c.title}
                      {isBest && <span className="ml-2 text-[9px] font-bold px-1.5 py-px rounded-full" style={{ background: "rgba(29,158,117,0.12)", color: "#5DCAA5" }}>{t("admin.analytics.bestCPC")}</span>}
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                        <span className="w-1 h-1 rounded-full" style={{ background: ss.dot }} />
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{formatFCFA(c.budget)}</td>
                    <td className="py-2.5 text-right">
                      <span style={{ color: c.spent >= c.budget ? "#1D9E75" : "rgba(255,255,255,0.6)", fontWeight: c.spent >= c.budget ? 600 : 400 }}>
                        {formatFCFA(c.spent)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right" style={{ color: "#1D9E75" }}>{formatNumber(c.validClicks)}</td>
                    <td className="py-2.5 text-right font-semibold text-white">{displayCPC}</td>
                    <td className="py-2.5 text-right" style={{ color: "rgba(255,255,255,0.5)" }}>{c.echoCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
