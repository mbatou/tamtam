"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";

interface BriefingData {
  daysSinceLaunch: number;
  date: string;
  actionRequired: {
    newLeads: number;
    oldestLeadAge: number;
    activeCampaigns: number;
    fraudRate: number;
    fraudRateToday: number;
    ipsToBlock: number;
    pendingPayouts: number;
    pendingPayoutAmount: number;
  };
  today: {
    signups: number;
    clicks: number;
    revenue: number;
  };
  totals: {
    echos: number;
    clicks: number;
    paid: number;
  };
  trends: {
    signupsDelta: number;
    clicksDelta: number;
  };
  financial: {
    commission: number;
    grossRevenue: number;
    pendingPayouts: number;
  };
  suggestedActions: { label: string; href: string; priority: "high" | "medium" | "low" }[];
}

export default function BriefingPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/briefing")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-10 w-96 rounded-xl" />
        <div className="skeleton h-6 w-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-32 rounded-xl mt-4" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-white/40">
        {t("common.error")}
      </div>
    );
  }

  const now = new Date(data.date);
  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = now.getHours();
  const greetingKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  // Build action required items
  const actionItems: { text: string; href: string; severity: "red" | "orange" }[] = [];

  if (data.actionRequired.newLeads > 0) {
    actionItems.push({
      text: t("superadmin.briefing.leadsAction", {
        count: String(data.actionRequired.newLeads),
        age: String(data.actionRequired.oldestLeadAge),
      }),
      href: "/superadmin/leads",
      severity: data.actionRequired.oldestLeadAge > 24 ? "red" : "orange",
    });
  }

  if (data.actionRequired.pendingPayouts > 0) {
    actionItems.push({
      text: t("superadmin.briefing.payoutsAction", {
        count: String(data.actionRequired.pendingPayouts),
        amount: formatFCFA(data.actionRequired.pendingPayoutAmount),
      }),
      href: "/superadmin/finance",
      severity: "orange",
    });
  }

  if (data.actionRequired.fraudRate > 15) {
    actionItems.push({
      text: t("superadmin.briefing.fraudAction", { rate: String(data.actionRequired.fraudRate) }),
      href: "/superadmin/fraud",
      severity: "red",
    });
  }

  if (data.actionRequired.activeCampaigns === 0) {
    actionItems.push({
      text: t("superadmin.briefing.noCampaignsAction"),
      href: "/superadmin/campaigns",
      severity: "red",
    });
  }

  if (data.actionRequired.ipsToBlock > 0) {
    actionItems.push({
      text: t("superadmin.briefing.ipsAction", { count: String(data.actionRequired.ipsToBlock) }),
      href: "/superadmin/fraud",
      severity: "orange",
    });
  }

  function TrendArrow({ delta }: { delta: number }) {
    if (delta > 0) return <span className="text-green-400 font-bold">+{delta} &#9650;</span>;
    if (delta < 0) return <span className="text-red-400 font-bold">{delta} &#9660;</span>;
    return <span className="text-white/30 font-bold">= 0</span>;
  }

  const actionLabelMap: Record<string, { label: string; emoji: string }> = {
    process_leads: { label: t("superadmin.briefing.suggestLeads"), emoji: "&#128233;" },
    process_payouts: { label: t("superadmin.briefing.suggestPayouts"), emoji: "&#128176;" },
    review_fraud: { label: t("superadmin.briefing.suggestFraud"), emoji: "&#128721;" },
    no_campaigns: { label: t("superadmin.briefing.suggestCampaigns"), emoji: "&#128226;" },
    block_ips: { label: t("superadmin.briefing.suggestBlockIps"), emoji: "&#128737;" },
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black mb-1">
          {t(`superadmin.briefing.greeting_${greetingKey}`)} — {t("superadmin.briefing.dayCount", { count: String(data.daysSinceLaunch) })}
        </h1>
        <p className="text-sm text-white/40 capitalize">{dateStr}</p>
      </div>

      {/* Action Required */}
      {actionItems.length > 0 && (
        <div className="mb-8 glass-card border border-red-500/20 bg-red-500/5 p-5 rounded-xl">
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">
            {t("superadmin.briefing.actionRequired")}
          </h2>
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition group"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  item.severity === "red" ? "bg-red-400 animate-pulse" : "bg-orange-400"
                }`} />
                <span className="text-sm text-white/80 flex-1">{item.text}</span>
                <span className="text-white/20 group-hover:text-white/50 transition">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {actionItems.length === 0 && (
        <div className="mb-8 glass-card border border-green-500/20 bg-green-500/5 p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#10003;</span>
            <div>
              <h2 className="text-sm font-bold text-green-400">{t("superadmin.briefing.allClear")}</h2>
              <p className="text-xs text-white/40">{t("superadmin.briefing.allClearDesc")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Numbers */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
          {t("superadmin.briefing.todayNumbers")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label={t("superadmin.briefing.signupsToday")}
            value={formatNumber(data.today.signups)}
            accent="purple"
          />
          <StatCard
            label={t("superadmin.briefing.clicksToday")}
            value={formatNumber(data.today.clicks)}
            accent="teal"
          />
          <StatCard
            label={t("superadmin.briefing.activeCampaigns")}
            value={formatNumber(data.actionRequired.activeCampaigns)}
            accent="orange"
          />
        </div>

        {/* Totals below */}
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-white/30 mb-1">{t("superadmin.briefing.totalEchos")}</p>
            <p className="text-lg font-bold">{formatNumber(data.totals.echos)}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-white/30 mb-1">{t("superadmin.briefing.totalValidClicks")}</p>
            <p className="text-lg font-bold">{formatNumber(data.totals.clicks)}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-white/30 mb-1">{t("superadmin.briefing.totalPaid")}</p>
            <p className="text-lg font-bold">{formatFCFA(data.totals.paid)}</p>
          </div>
        </div>
      </div>

      {/* Trends vs Yesterday */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
          {t("superadmin.briefing.trendsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-white/30 mb-2">{t("superadmin.briefing.signupsToday")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{data.today.signups}</span>
              <TrendArrow delta={data.trends.signupsDelta} />
            </div>
            <p className="text-[10px] text-white/20 mt-1">{t("superadmin.briefing.vsYesterday")}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/30 mb-2">{t("superadmin.briefing.clicksToday")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{data.today.clicks}</span>
              <TrendArrow delta={data.trends.clicksDelta} />
            </div>
            <p className="text-[10px] text-white/20 mt-1">{t("superadmin.briefing.vsYesterday")}</p>
          </div>
        </div>
      </div>

      {/* Financial Snapshot */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
          {t("superadmin.briefing.financialSnapshot")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label={t("superadmin.briefing.commissionEarned")}
            value={formatFCFA(data.financial.commission)}
            accent="teal"
          />
          <StatCard
            label={t("superadmin.briefing.pendingPayoutsLabel")}
            value={formatFCFA(data.financial.pendingPayouts)}
            accent={data.financial.pendingPayouts > 0 ? "red" : "purple"}
          />
          <StatCard
            label={t("superadmin.briefing.grossRevenue")}
            value={formatFCFA(data.financial.grossRevenue)}
            accent="orange"
          />
        </div>
      </div>

      {/* Suggested Actions */}
      {data.suggestedActions.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
            {t("superadmin.briefing.suggestedActions")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.suggestedActions.slice(0, 3).map((action, i) => {
              const info = actionLabelMap[action.label] || { label: action.label, emoji: "&#128279;" };
              return (
                <Link
                  key={i}
                  href={action.href}
                  className={`glass-card p-4 hover:bg-white/10 transition group rounded-xl border ${
                    action.priority === "high"
                      ? "border-red-500/20"
                      : "border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" dangerouslySetInnerHTML={{ __html: info.emoji }} />
                    <span className="text-sm font-semibold text-white/70 group-hover:text-white/90 transition">
                      {info.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* WhatsApp Broadcast */}
      <WhatsAppBroadcast echoCount={data.totals.echos} />
    </div>
  );
}

function WhatsAppBroadcast({ echoCount }: { echoCount: number }) {
  const [audience, setAudience] = useState("all_echos");
  const [message, setMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [result, setResult] = useState<{ totalRecipients: number; status: string } | null>(null);

  const handleBroadcast = useCallback(async () => {
    if (!message.trim() || broadcasting) return;
    setBroadcasting(true);
    setResult(null);
    try {
      const res = await fetch("/api/superadmin/whatsapp-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, audience }),
      });
      const data = await res.json();
      setResult(data);
      if (data.status === "sending") {
        setMessage("");
      }
    } catch {
      setResult({ totalRecipients: 0, status: "error" });
    } finally {
      setBroadcasting(false);
    }
  }, [message, audience, broadcasting]);

  const audienceLabels: Record<string, string> = {
    all_echos: `Tous les Échos (~${echoCount})`,
    active_echos: "Échos actifs (7j)",
    all_brands: "Toutes les marques",
  };

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
        Broadcast WhatsApp
      </h2>
      <div className="glass-card rounded-xl p-6 border border-white/5">
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-3 text-sm"
        >
          {Object.entries(audienceLabels).map(([key, label]) => (
            <option key={key} value={key} className="bg-[#1a1a2e]">
              {label}
            </option>
          ))}
        </select>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Votre message... Utilisez {name} pour personnaliser"
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-3 h-28 text-sm resize-none placeholder:text-white/20"
        />
        <div className="flex items-center justify-between">
          {result ? (
            <span className="text-sm text-green-400">
              {result.status === "sending"
                ? `Envoi vers ${result.totalRecipients} destinataires...`
                : result.status === "error"
                  ? "Erreur lors de l'envoi"
                  : `${result.totalRecipients} messages envoyés`}
            </span>
          ) : (
            <span className="text-white/30 text-sm">
              {audienceLabels[audience]}
            </span>
          )}
          <button
            onClick={handleBroadcast}
            disabled={broadcasting || !message.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition"
          >
            {broadcasting ? "Envoi..." : "💬 Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
