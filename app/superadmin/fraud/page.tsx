"use client";

import { useEffect, useState, useCallback } from "react";
import { formatNumber } from "@/lib/utils";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import Pagination, { paginate } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import DateRangeSelector, { type DateRange } from "@/components/ui/DateRangeSelector";
import {
  ShieldAlert, CheckCircle2, XCircle, TrendingDown, DollarSign,
  Eye, Ban, RotateCcw, MousePointerClick, Users, Settings, AlertTriangle,
  Wifi, Bot, Globe, Zap,
} from "lucide-react";

// ── Types ──

interface ClickRow {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_valid: boolean;
  country: string | null;
  created_at: string;
  link_id: string;
  rejection_reason: string | null;
  tracked_links: {
    short_code: string;
    echo_id: string;
    campaign_id: string;
    users: { name: string } | null;
    campaigns: { title: string } | null;
  } | null;
}

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  block_type: string;
  expires_at: string | null;
  carrier_ip: boolean;
  created_at: string;
}

interface CarrierRange {
  id: string;
  carrier: string;
  ip_prefix: string;
  country: string;
}

interface IPAnalysis {
  ip_address: string;
  total_clicks: number;
  valid_clicks: number;
  invalid_clicks: number;
  unique_links: number;
  active_days: number;
  first_click: string;
  last_click: string;
  time_span_seconds: number;
  risk_assessment: string;
  is_carrier_ip: boolean;
  carrier: string | null;
}

interface EchoAnalysis {
  echo_id: string;
  name: string;
  phone: string | null;
  links_created: number;
  total_clicks: number;
  valid_clicks: number;
  invalid_clicks: number;
  valid_rate_pct: number;
  suspicious_repeat_ips: number;
  risk_level: string;
}

interface IPDetailClick {
  id: string;
  ip_address: string;
  is_valid: boolean;
  created_at: string;
  rejection_reason: string | null;
  tracked_links: { short_code: string; users: { name: string } | null } | null;
}

interface FraudData {
  totalClicks: number;
  validClicks: number;
  flaggedClicks: number;
  rejectionRate: number;
  rejectionBreakdown: Record<string, number>;
  revenueSaved: number;
  recentClicks: ClickRow[];
  blockedIPs: BlockedIP[];
  carrierRanges: CarrierRange[];
  ipAnalysis: IPAnalysis[];
  echoAnalysis: EchoAnalysis[];
}

// ── Helpers ──

const REJECTION_LABELS: Record<string, { label: string; isFraud: boolean }> = {
  ip_cooldown_24h: { label: "Cooldown IP (24h dédup)", isFraud: false },
  ip_daily_limit: { label: "Limite IP journalière", isFraud: false },
  link_rate_limit: { label: "Limite lien/heure", isFraud: false },
  bot_useragent: { label: "User-agent bot", isFraud: true },
  speed_bot: { label: "Vitesse (<3s)", isFraud: true },
  blocked_bot: { label: "IP bloquée (bot)", isFraud: true },
  blocked_datacenter: { label: "IP datacenter", isFraud: true },
  blocked_manual: { label: "IP bloquée (manuel)", isFraud: true },
  missing_user_agent: { label: "UA manquant", isFraud: true },
  manual_invalidation: { label: "Invalidation manuelle", isFraud: true },
  ip_duplicate_24h: { label: "Cooldown IP (24h dédup)", isFraud: false },
  blocked_ip: { label: "IP bloquée", isFraud: true },
  bot_detected: { label: "Bot détecté", isFraud: true },
  ip_global_rate_limit: { label: "Limite IP globale", isFraud: false },
};

const RISK_STYLES: Record<string, { color: string; label: string }> = {
  bot: { color: "text-red-400", label: "Bot" },
  targeted_abuse: { color: "text-red-400", label: "Abus ciblé" },
  suspicious: { color: "text-yellow-400", label: "Suspect" },
  likely_carrier_ip: { color: "text-blue-400", label: "IP Opérateur" },
  normal: { color: "text-white/40", label: "Normal" },
};

function formatTimeSpan(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)} jours`;
}

type Section = "overview" | "ips" | "echos" | "clicks" | "settings";

const SECTION_TABS: { key: Section; label: string; icon: typeof ShieldAlert }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: ShieldAlert },
  { key: "ips", label: "Analyse IP", icon: Globe },
  { key: "echos", label: "Analyse Échos", icon: Users },
  { key: "clicks", label: "Journal clics", icon: MousePointerClick },
  { key: "settings", label: "Paramètres", icon: Settings },
];

// ── Main Page ──

export default function FraudPage() {
  const [data, setData] = useState<FraudData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ key: "week", from: null, to: null });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const { showToast, ToastComponent } = useToast();

  const [clickFilter, setClickFilter] = useState("all");
  const [clickPage, setClickPage] = useState(1);

  const [ipPage, setIpPage] = useState(1);
  const [ipSort, setIpSort] = useState<"total_clicks" | "valid_clicks" | "active_days">("total_clicks");
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [ipDetails, setIPDetails] = useState<{ clicks: IPDetailClick[]; carrier: string | null; carrier_notes: string | null; is_carrier_ip: boolean } | null>(null);
  const [ipDetailsLoading, setIPDetailsLoading] = useState(false);

  const [echoPage, setEchoPage] = useState(1);
  const [blockConfirm, setBlockConfirm] = useState<{ ip: string; carrier: string } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.set("from", dateRange.from);
        if (dateRange.to) params.set("to", dateRange.to);
      } else {
        params.set("period", dateRange.key);
      }
      const res = await fetch(`/api/superadmin/fraud?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // handled below
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Actions ──

  async function blockIP(ip: string, force = false) {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block_ip", ip, force }),
      });
      const result = await res.json();
      if (res.status === 409 && result.requires_confirmation) {
        setBlockConfirm({ ip, carrier: result.carrier });
        return;
      }
      if (res.ok) {
        showToast(`IP ${ip} bloquée`, "success");
        setBlockConfirm(null);
        loadData();
      } else {
        showToast(result.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function unblockIP(ip: string) {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock_ip", ip }),
      });
      if (res.ok) {
        showToast(`IP ${ip} débloquée`, "success");
        loadData();
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function toggleClickValidity(clickId: string) {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_validity", click_id: clickId }),
      });
      if (res.ok) {
        showToast("Statut mis à jour", "success");
        loadData();
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function flagEcho(echoId: string, riskLevel: string) {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flag_echo", echo_id: echoId, risk_level: riskLevel }),
      });
      if (res.ok) {
        showToast("Écho signalé", "success");
        loadData();
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function loadIPDetails(ip: string) {
    setSelectedIP(ip);
    setIPDetailsLoading(true);
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ip_details", ip }),
      });
      const result = await res.json();
      setIPDetails(result);
    } catch {
      showToast("Erreur réseau", "error");
    }
    setIPDetailsLoading(false);
  }

  async function bulkBlockBots() {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_block_ips" }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(`${result.blocked} IPs bot bloquées`, "success");
        loadData();
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function saveFraudSettings(settings: Record<string, string>) {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_fraud_settings", settings }),
      });
      if (res.ok) {
        showToast("Paramètres sauvegardés", "success");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setSavingSettings(false);
  }

  // ── Loading ──

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ── Computed ──

  const totalRejected = data.flaggedClicks;
  const breakdownEntries = Object.entries(data.rejectionBreakdown).sort((a, b) => b[1] - a[1]);
  const actualFraud = breakdownEntries
    .filter(([key]) => REJECTION_LABELS[key]?.isFraud)
    .reduce((sum, [, count]) => sum + count, 0);
  const actualFraudRate = data.totalClicks > 0 ? ((actualFraud / data.totalClicks) * 100).toFixed(1) : "0";

  const filteredClicks = data.recentClicks.filter((c) => {
    if (clickFilter === "suspects") return !c.is_valid;
    if (clickFilter === "valid") return c.is_valid;
    return true;
  });

  const sortedIPs = [...data.ipAnalysis].sort((a, b) => {
    if (ipSort === "active_days") return b.active_days - a.active_days;
    if (ipSort === "valid_clicks") return b.valid_clicks - a.valid_clicks;
    return b.total_clicks - a.total_clicks;
  });

  const botIPs = data.ipAnalysis.filter((ip) => ip.risk_assessment === "bot" || ip.risk_assessment === "targeted_abuse");
  const carrierIPs = data.ipAnalysis.filter((ip) => ip.is_carrier_ip);

  // ── Render ──

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-syne font-bold flex items-center gap-3">
          <ShieldAlert size={24} className="text-[#D35400]" />
          Anti-Fraude
        </h1>
        <DateRangeSelector value={dateRange.key} onChange={setDateRange} />
      </div>

      {/* Section Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {SECTION_TABS.map((st) => {
          const Icon = st.icon;
          const countMap: Record<string, number | undefined> = {
            ips: data.ipAnalysis.length,
            echos: data.echoAnalysis.length,
            clicks: data.recentClicks.length,
          };
          const count = countMap[st.key];
          return (
            <button
              key={st.key}
              onClick={() => setActiveSection(st.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-dm font-medium transition whitespace-nowrap ${
                activeSection === st.key
                  ? "bg-[#D35400] text-white"
                  : "bg-[#111128] border border-white/[0.07] text-white/40 hover:bg-[#141420]"
              }`}
            >
              <Icon size={14} />
              {st.label}
              {count !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  activeSection === st.key ? "bg-white/20" : "bg-white/10 text-white/50"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {activeSection === "overview" && (
        <div className="space-y-8">
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard label="Clics valides" value={formatNumber(data.validClicks)} icon={<CheckCircle2 size={18} />} accent="teal" />
            <AdminStatCard label="Rejetés" value={formatNumber(data.flaggedClicks)} icon={<XCircle size={18} />} accent="red" />
            <AdminStatCard
              label="Taux de rejet"
              value={`${data.rejectionRate}%`}
              sub={`Fraude réelle: ~${actualFraudRate}%`}
              icon={<TrendingDown size={18} />}
              accent={data.rejectionRate > 30 ? "red" : "orange"}
            />
            <AdminStatCard label="Revenus protégés" value={formatNumber(data.revenueSaved) + " F"} icon={<DollarSign size={18} />} accent="teal" />
          </div>

          {/* Rejection Breakdown */}
          {breakdownEntries.length > 0 && (
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
              <h2 className="text-lg font-syne font-bold mb-4">Répartition des rejets</h2>
              <div className="space-y-3">
                {breakdownEntries.map(([reason, count]) => {
                  const info = REJECTION_LABELS[reason] || { label: reason, isFraud: false };
                  const pct = totalRejected > 0 ? ((count / totalRejected) * 100).toFixed(0) : "0";
                  return (
                    <div key={reason} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-dm flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${info.isFraud ? "bg-red-400" : "bg-blue-400"}`} />
                            {info.label}
                            {info.isFraud && <span className="text-[10px] text-red-400 font-dm font-bold uppercase">fraude</span>}
                          </span>
                          <span className="text-xs font-dm text-white/50">{formatNumber(count)} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${info.isFraud ? "bg-red-400/60" : "bg-blue-400/40"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.05] flex gap-6 text-xs font-dm text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Dédup / throttling (légitime)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> Fraude réelle (bots)
                </span>
              </div>
            </div>
          )}

          {/* Alerts */}
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h2 className="text-lg font-syne font-bold mb-4">Alertes récentes</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {botIPs.length > 0 && botIPs.slice(0, 5).map((ip) => (
                <div key={ip.ip_address} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <Bot size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm font-dm">
                    <span className="font-mono text-xs">{ip.ip_address}</span>
                    {" — "}{ip.total_clicks} clics en {formatTimeSpan(ip.time_span_seconds)}
                    <span className="text-red-400 text-xs ml-2">[Bot détecté]</span>
                  </div>
                </div>
              ))}
              {data.echoAnalysis
                .filter((e) => e.risk_level === "high_fraud_risk")
                .slice(0, 3)
                .map((echo) => (
                  <div key={echo.echo_id} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm font-dm">
                      Écho <span className="font-bold">{echo.name}</span> — taux valide: {echo.valid_rate_pct}%
                      <span className="text-yellow-400 text-xs ml-2">[Vérification recommandée]</span>
                    </div>
                  </div>
                ))}
              {carrierIPs.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <Wifi size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm font-dm">
                    {carrierIPs.length} IPs opérateur détectées — protégées contre le blocage
                    <span className="text-blue-400 text-xs ml-2">[CGNAT Sénégal]</span>
                  </div>
                </div>
              )}
              {botIPs.length === 0 && data.echoAnalysis.filter((e) => e.risk_level === "high_fraud_risk").length === 0 && (
                <p className="text-sm font-dm text-white/30">Aucune alerte active</p>
              )}
            </div>
          </div>

          {/* Blocked IPs */}
          {data.blockedIPs.length > 0 && (
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
              <h2 className="text-lg font-syne font-bold mb-4">IPs bloquées ({data.blockedIPs.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
                      <th className="pb-3 font-semibold">IP</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold">Raison</th>
                      <th className="pb-3 font-semibold">Expiration</th>
                      <th className="pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blockedIPs.map((ip) => (
                      <tr key={ip.id} className="border-b border-white/[0.03]">
                        <td className="py-2 font-mono text-xs">
                          {ip.ip_address}
                          {ip.carrier_ip && <AlertTriangle size={12} className="inline ml-1 text-yellow-400" />}
                        </td>
                        <td className="py-2">
                          <AdminBadge
                            status={ip.block_type === "bot" || ip.block_type === "datacenter" ? "fraud" : "active"}
                            label={ip.block_type}
                            size="sm"
                          />
                        </td>
                        <td className="py-2 text-xs font-dm text-white/50">{ip.reason}</td>
                        <td className="py-2 text-xs font-dm text-white/50">
                          {ip.expires_at ? new Date(ip.expires_at).toLocaleDateString("fr-FR") : "Permanent"}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => unblockIP(ip.ip_address)}
                            className="text-xs font-dm text-[#1D9E75] hover:text-[#1D9E75]/80 font-bold flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            Débloquer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ IP ANALYSIS ═══ */}
      {activeSection === "ips" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-dm text-white/50">{data.ipAnalysis.length} IPs analysées</span>
            <span className="text-sm font-dm text-red-400">{botIPs.length} bots</span>
            <span className="text-sm font-dm text-blue-400">{carrierIPs.length} IPs opérateur</span>
            {botIPs.length > 0 && (
              <button
                onClick={bulkBlockBots}
                className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-dm font-bold hover:bg-red-500/30 transition flex items-center gap-1.5"
              >
                <Ban size={12} />
                Bloquer tous les bots ({botIPs.length})
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {([
              { key: "total_clicks" as const, label: "Clics" },
              { key: "valid_clicks" as const, label: "Valides" },
              { key: "active_days" as const, label: "Jours actifs" },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => setIpSort(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold transition ${
                  ipSort === s.key ? "bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/30" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
                  <th className="pb-3 font-semibold">Adresse IP</th>
                  <th className="pb-3 font-semibold">Clics</th>
                  <th className="pb-3 font-semibold">Valides</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Opérateur</th>
                  <th className="pb-3 font-semibold">Risque</th>
                  <th className="pb-3 font-semibold hidden lg:table-cell">Durée</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginate(sortedIPs, ipPage, PAGE_SIZE).map((ip) => (
                  <tr key={ip.ip_address} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                    <td className="py-3 font-mono text-xs">{ip.ip_address}</td>
                    <td className="py-3 text-xs font-dm">{ip.total_clicks}</td>
                    <td className="py-3 text-xs font-dm">{ip.valid_clicks}</td>
                    <td className="py-3 text-xs font-dm hidden md:table-cell">
                      {ip.is_carrier_ip ? (
                        <span className="flex items-center gap-1"><Wifi size={12} className="text-blue-400" /> {ip.carrier}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-dm font-bold ${RISK_STYLES[ip.risk_assessment]?.color || "text-white/40"}`}>
                        {RISK_STYLES[ip.risk_assessment]?.label || ip.risk_assessment}
                      </span>
                    </td>
                    <td className="py-3 text-xs font-dm text-white/40 hidden lg:table-cell">
                      {formatTimeSpan(ip.time_span_seconds)}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadIPDetails(ip.ip_address)}
                          className="text-xs font-dm text-[#1D9E75] hover:text-[#1D9E75]/80 font-semibold flex items-center gap-1"
                        >
                          <Eye size={12} />
                          Détails
                        </button>
                        {ip.is_carrier_ip ? (
                          <span className="text-xs font-dm text-[#D35400]/70 font-semibold">Protégé</span>
                        ) : (
                          !data.blockedIPs.some((b) => b.ip_address === ip.ip_address) && (
                            <button
                              onClick={() => blockIP(ip.ip_address)}
                              className="text-xs font-dm text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                            >
                              <Ban size={12} />
                              Bloquer
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={ipPage} totalItems={sortedIPs.length} pageSize={PAGE_SIZE} onPageChange={setIpPage} />
        </div>
      )}

      {/* ═══ ECHO ANALYSIS ═══ */}
      {activeSection === "echos" && (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
                  <th className="pb-3 font-semibold">Écho</th>
                  <th className="pb-3 font-semibold">Clics</th>
                  <th className="pb-3 font-semibold">Valides</th>
                  <th className="pb-3 font-semibold">Taux valide</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">IPs suspectes</th>
                  <th className="pb-3 font-semibold">Risque</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginate(data.echoAnalysis, echoPage, PAGE_SIZE).map((echo) => (
                  <tr key={echo.echo_id} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                    <td className="py-3">
                      <div>
                        <span className="text-sm font-dm font-semibold">{echo.name}</span>
                        {echo.phone && <span className="text-xs font-dm text-white/30 ml-2">{echo.phone}</span>}
                      </div>
                      <span className="text-xs font-dm text-white/30">{echo.links_created} liens</span>
                    </td>
                    <td className="py-3 text-xs font-dm">{echo.total_clicks}</td>
                    <td className="py-3 text-xs font-dm">{echo.valid_clicks}</td>
                    <td className="py-3">
                      <span className={`text-sm font-syne font-bold ${
                        echo.valid_rate_pct < 30 ? "text-red-400" :
                        echo.valid_rate_pct < 50 ? "text-yellow-400" :
                        "text-emerald-400"
                      }`}>
                        {echo.valid_rate_pct}%
                      </span>
                    </td>
                    <td className="py-3 text-xs font-dm hidden md:table-cell">
                      {echo.suspicious_repeat_ips > 0 ? (
                        <span className="text-yellow-400">{echo.suspicious_repeat_ips}</span>
                      ) : (
                        <span className="text-white/20">0</span>
                      )}
                    </td>
                    <td className="py-3">
                      <AdminBadge
                        status={
                          echo.risk_level === "high_fraud_risk" ? "fraud" :
                          echo.risk_level === "moderate_risk" ? "suspended" :
                          "active"
                        }
                        label={
                          echo.risk_level === "high_fraud_risk" ? "Risque élevé" :
                          echo.risk_level === "moderate_risk" ? "Modéré" :
                          "OK"
                        }
                        size="sm"
                      />
                    </td>
                    <td className="py-3">
                      {echo.risk_level !== "clean" && (
                        <button
                          onClick={() => flagEcho(echo.echo_id, "high")}
                          className="text-xs font-dm text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                        >
                          <AlertTriangle size={12} />
                          Signaler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={echoPage} totalItems={data.echoAnalysis.length} pageSize={PAGE_SIZE} onPageChange={setEchoPage} />
        </div>
      )}

      {/* ═══ CLICK LOG ═══ */}
      {activeSection === "clicks" && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            {([
              { key: "all", label: "Tous", count: data.recentClicks.length },
              { key: "suspects", label: "Suspects", count: data.recentClicks.filter((c) => !c.is_valid).length },
              { key: "valid", label: "Valides", count: data.recentClicks.filter((c) => c.is_valid).length },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => { setClickFilter(f.key); setClickPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-dm font-semibold transition flex items-center gap-1.5 ${
                  clickFilter === f.key
                    ? "bg-[#D35400] text-white"
                    : "bg-[#111128] border border-white/[0.07] text-white/40 hover:bg-[#141420]"
                }`}
              >
                {f.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  clickFilter === f.key ? "bg-white/20" : "bg-white/10"
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">IP</th>
                  <th className="pb-3 font-semibold hidden lg:table-cell">Raison</th>
                  <th className="pb-3 font-semibold">Écho</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Campagne</th>
                  <th className="pb-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredClicks, clickPage, PAGE_SIZE).map((click) => (
                  <tr key={click.id} className="border-b border-white/[0.03] hover:bg-[#141420] transition">
                    <td className="py-3 text-xs font-dm text-white/50">
                      {new Date(click.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-mono text-xs">{click.ip_address || "—"}</td>
                    <td className="py-3 text-xs font-dm text-white/40 hidden lg:table-cell">
                      {click.rejection_reason ? (REJECTION_LABELS[click.rejection_reason]?.label || click.rejection_reason) : "—"}
                    </td>
                    <td className="py-3 text-xs font-dm">{click.tracked_links?.users?.name || "—"}</td>
                    <td className="py-3 text-xs font-dm hidden md:table-cell">{click.tracked_links?.campaigns?.title || "—"}</td>
                    <td className="py-3">
                      <button onClick={() => toggleClickValidity(click.id)}>
                        <AdminBadge
                          status={click.is_valid ? "active" : "fraud"}
                          label={click.is_valid ? "Valide" : "Rejeté"}
                          size="sm"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={clickPage} totalItems={filteredClicks.length} pageSize={PAGE_SIZE} onPageChange={setClickPage} />
        </div>
      )}

      {/* ═══ SETTINGS ═══ */}
      {activeSection === "settings" && (
        <FraudSettingsPanel onSave={saveFraudSettings} saving={savingSettings} />
      )}

      {/* ═══ DRAWERS ═══ */}

      {/* IP Detail Drawer */}
      <AdminDrawer
        open={!!selectedIP}
        onClose={() => { setSelectedIP(null); setIPDetails(null); }}
        title={`IP: ${selectedIP || ""}`}
        subtitle="Détails et historique des clics"
        width="520px"
      >
        {ipDetailsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
          </div>
        ) : ipDetails ? (
          <div className="space-y-4">
            {ipDetails.is_carrier_ip && (
              <div className="p-3 rounded-lg bg-[#D35400]/10 border border-[#D35400]/20">
                <p className="text-sm font-dm font-bold text-[#D35400] flex items-center gap-2">
                  <Wifi size={14} /> Opérateur: {ipDetails.carrier}
                </p>
                {ipDetails.carrier_notes && (
                  <p className="text-xs font-dm text-[#D35400]/70 mt-1">{ipDetails.carrier_notes}</p>
                )}
                <p className="text-xs font-dm text-[#D35400]/60 mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> IP partagée (CGNAT). Le blocage affectera tous les abonnés de cette antenne.
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-syne font-bold mb-3">Chronologie des clics ({ipDetails.clicks.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ipDetails.clicks.map((click) => {
                  const link = Array.isArray(click.tracked_links) ? click.tracked_links[0] : click.tracked_links;
                  return (
                    <div key={click.id} className="flex items-center gap-3 text-xs font-dm py-1.5 border-b border-white/[0.05]">
                      <span className={`w-1.5 h-1.5 rounded-full ${click.is_valid ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-white/40 w-28 shrink-0">
                        {new Date(click.created_at).toLocaleString("fr-FR", {
                          month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className="font-mono text-white/60">/r/{link?.short_code || "?"}</span>
                      <span className="text-white/30">({link?.users?.name || "?"})</span>
                      {click.rejection_reason && (
                        <span className="text-red-400/60 ml-auto">{REJECTION_LABELS[click.rejection_reason]?.label || click.rejection_reason}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {ipDetails.is_carrier_ip ? (
                <div className="flex-1 py-2 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400] text-xs font-dm font-bold text-center flex items-center justify-center gap-1.5">
                  <Wifi size={12} /> IP protégée — opérateur {ipDetails.carrier}
                </div>
              ) : (
                <button
                  onClick={() => { blockIP(selectedIP!); setSelectedIP(null); setIPDetails(null); }}
                  className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-dm font-bold flex items-center justify-center gap-1.5"
                >
                  <Ban size={12} /> Bloquer cette IP
                </button>
              )}
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      {/* Carrier Block Confirmation Drawer */}
      <AdminDrawer
        open={!!blockConfirm}
        onClose={() => setBlockConfirm(null)}
        title="IP opérateur détectée"
        subtitle="Confirmation requise"
        width="480px"
      >
        {blockConfirm && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20">
              <p className="text-sm font-dm text-[#D35400] flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Cette IP appartient au réseau <strong>{blockConfirm.carrier}</strong>.
                  Le blocage rejettera les clics de <strong>tous les abonnés</strong> sur cette antenne — potentiellement des milliers de personnes.
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBlockConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-dm font-bold hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => { blockIP(blockConfirm.ip, true); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-dm font-bold hover:bg-red-500/20 transition"
              >
                Bloquer quand même
              </button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}

// ── Fraud Settings Component ──

function FraudSettingsPanel({ onSave, saving }: { onSave: (s: Record<string, string>) => void; saving: boolean }) {
  const [cooldownHours, setCooldownHours] = useState("24");
  const [linkHourlyLimit, setLinkHourlyLimit] = useState("30");
  const [ipDailyLimit, setIpDailyLimit] = useState("8");
  const [speedSeconds, setSpeedSeconds] = useState("3");
  const [autoBlockDatacenter, setAutoBlockDatacenter] = useState(true);
  const [carrierProtection, setCarrierProtection] = useState(true);

  return (
    <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 max-w-xl space-y-6">
      <h2 className="text-lg font-syne font-bold flex items-center gap-2">
        <Zap size={18} className="text-[#D35400]" />
        Paramètres anti-fraude
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Cooldown IP par lien (heures)</label>
          <input
            type="number"
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
          <p className="text-xs font-dm text-white/30 mt-1">Même IP + même lien = 1 clic valide par période</p>
        </div>

        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Limite de clics par lien / heure</label>
          <input
            type="number"
            value={linkHourlyLimit}
            onChange={(e) => setLinkHourlyLimit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
        </div>

        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Limite clics valides par IP / jour</label>
          <input
            type="number"
            value={ipDailyLimit}
            onChange={(e) => setIpDailyLimit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
          <p className="text-xs font-dm text-white/30 mt-1">Maximum de clics valides par IP par jour (tous liens confondus)</p>
        </div>

        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Intervalle minimum entre clics (secondes)</label>
          <input
            type="number"
            value={speedSeconds}
            onChange={(e) => setSpeedSeconds(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
          <p className="text-xs font-dm text-white/30 mt-1">Clics plus rapides = bot automatisé</p>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-white/[0.05]">
          <div>
            <span className="text-sm font-dm">Blocage auto des IPs datacenter</span>
            <p className="text-xs font-dm text-white/30">Bloquer automatiquement les IPs identifiées comme datacenter</p>
          </div>
          <button
            onClick={() => setAutoBlockDatacenter(!autoBlockDatacenter)}
            className={`w-12 h-6 rounded-full transition-colors ${autoBlockDatacenter ? "bg-[#1D9E75]" : "bg-white/10"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoBlockDatacenter ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-white/[0.05]">
          <div>
            <span className="text-sm font-dm">Protection IPs opérateur</span>
            <p className="text-xs font-dm text-white/30">Empêcher le blocage des IPs CGNAT des opérateurs sénégalais (recommandé)</p>
          </div>
          <button
            onClick={() => setCarrierProtection(!carrierProtection)}
            className={`w-12 h-6 rounded-full transition-colors ${carrierProtection ? "bg-[#1D9E75]" : "bg-white/10"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${carrierProtection ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <button
        onClick={() => onSave({
          fraud_ip_cooldown_hours: cooldownHours,
          fraud_link_hourly_limit: linkHourlyLimit,
          fraud_ip_daily_valid_limit: ipDailyLimit,
          fraud_speed_check_seconds: speedSeconds,
          fraud_auto_block_datacenter: String(autoBlockDatacenter),
          fraud_carrier_ip_protection: String(carrierProtection),
        })}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-[#1D9E75]/20 border border-[#1D9E75]/30 text-[#1D9E75] text-sm font-dm font-bold hover:bg-[#1D9E75]/30 transition disabled:opacity-40"
      >
        {saving ? "Sauvegarde..." : "Enregistrer les paramètres"}
      </button>
    </div>
  );
}
