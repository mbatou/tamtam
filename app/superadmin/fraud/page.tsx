"use client";

import { useEffect, useState, useCallback } from "react";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import Pagination, { paginate } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import DateRangeSelector, { type DateRange } from "@/components/ui/DateRangeSelector";

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
  ip_cooldown_24h: { label: "IP cooldown (24h dedup)", isFraud: false },
  ip_daily_limit: { label: "IP daily limit", isFraud: false },
  link_rate_limit: { label: "Link rate limit/hour", isFraud: false },
  bot_useragent: { label: "Bot user-agent", isFraud: true },
  speed_bot: { label: "Speed (<3s)", isFraud: true },
  blocked_bot: { label: "IP blocked (bot)", isFraud: true },
  blocked_datacenter: { label: "IP datacenter", isFraud: true },
  blocked_manual: { label: "IP blocked (manual)", isFraud: true },
  missing_user_agent: { label: "Missing UA", isFraud: true },
  manual_invalidation: { label: "Manual invalidation", isFraud: true },
  // Legacy reasons from old system
  ip_duplicate_24h: { label: "IP cooldown (24h dedup)", isFraud: false },
  blocked_ip: { label: "IP blocked", isFraud: true },
  bot_detected: { label: "Bot detected", isFraud: true },
  ip_global_rate_limit: { label: "IP global limit", isFraud: false },
};

const RISK_COLORS: Record<string, string> = {
  bot: "text-red-400",
  targeted_abuse: "text-red-400",
  suspicious: "text-yellow-400",
  likely_carrier_ip: "text-blue-400",
  normal: "text-white/40",
};

const RISK_LABELS: Record<string, string> = {
  bot: "Bot",
  targeted_abuse: "Targeted abuse",
  suspicious: "Suspicious",
  likely_carrier_ip: "Carrier IP",
  normal: "Normal",
};

function formatTimeSpan(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)} days`;
}

function getCarrierDot(carrier: string | null): string {
  if (!carrier) return "";
  if (carrier.toLowerCase().includes("orange") || carrier.toLowerCase().includes("sonatel")) return "🟠";
  if (carrier.toLowerCase().includes("free")) return "🔵";
  if (carrier.toLowerCase().includes("expat")) return "🟢";
  if (carrier.toLowerCase().includes("wave")) return "🟣";
  return "⚪";
}

// ── Main Page ──

export default function FraudPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<FraudData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ key: "week", from: null, to: null });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const { showToast, ToastComponent } = useToast();

  // Click log state
  const [clickFilter, setClickFilter] = useState("all");
  const [clickPage, setClickPage] = useState(1);

  // IP analysis state
  const [ipPage, setIpPage] = useState(1);
  const [ipSort, setIpSort] = useState<"total_clicks" | "valid_clicks" | "active_days">("total_clicks");
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [ipDetails, setIPDetails] = useState<{ clicks: IPDetailClick[]; carrier: string | null; carrier_notes: string | null; is_carrier_ip: boolean } | null>(null);
  const [ipDetailsLoading, setIPDetailsLoading] = useState(false);

  // Echo analysis state
  const [echoPage, setEchoPage] = useState(1);

  // Block confirmation state
  const [blockConfirm, setBlockConfirm] = useState<{ ip: string; carrier: string } | null>(null);

  // Settings state
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
        showToast(t("superadmin.fraud.ipBlocked", { ip }), "success");
        setBlockConfirm(null);
        loadData();
      } else {
        showToast(result.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
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
        showToast(`IP ${ip} unblocked`, "success");
        loadData();
      }
    } catch {
      showToast(t("common.networkError"), "error");
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
        showToast(t("superadmin.fraud.statusUpdated"), "success");
        loadData();
      }
    } catch {
      showToast(t("common.networkError"), "error");
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
        showToast("Echo flagged", "success");
        loadData();
      }
    } catch {
      showToast(t("common.networkError"), "error");
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
      showToast(t("common.networkError"), "error");
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
        showToast(`${result.blocked} bot IPs blocked`, "success");
        loadData();
      }
    } catch {
      showToast(t("common.networkError"), "error");
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
        showToast("Settings saved", "success");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setSavingSettings(false);
  }

  // ── Loading state ──

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── Computed data ──

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
        <h1 className="text-2xl font-bold">{t("superadmin.fraud.title")}</h1>
        <DateRangeSelector value={dateRange.key} onChange={setDateRange} />
      </div>

      {/* Section Navigation */}
      <TabBar
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "ips", label: "IP Analysis", count: data.ipAnalysis.length },
          { key: "echos", label: "Echo Analysis", count: data.echoAnalysis.length },
          { key: "clicks", label: "Click Log", count: data.recentClicks.length },
          { key: "settings", label: "Settings" },
        ]}
        active={activeSection}
        onChange={setActiveSection}
        className="mb-6"
      />

      {/* ══════════════════════════════════════════════
          SECTION 1: Overview
          ══════════════════════════════════════════════ */}
      {activeSection === "overview" && (
        <div className="space-y-8">
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Valid clicks" value={formatNumber(data.validClicks)} accent="teal" />
            <StatCard label="Rejected" value={formatNumber(data.flaggedClicks)} accent="red" />
            <StatCard
              label="Rejection rate"
              value={`${data.rejectionRate}%`}
              sub={`Actual fraud: ~${actualFraudRate}%`}
              accent={data.rejectionRate > 30 ? "red" : "orange"}
            />
            <StatCard label="Revenue protected" value={formatNumber(data.revenueSaved) + " F"} accent="teal" />
          </div>

          {/* Rejection Breakdown */}
          {breakdownEntries.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Rejection breakdown</h2>
              <div className="space-y-3">
                {breakdownEntries.map(([reason, count]) => {
                  const info = REJECTION_LABELS[reason] || { label: reason, isFraud: false };
                  const pct = totalRejected > 0 ? ((count / totalRejected) * 100).toFixed(0) : "0";
                  return (
                    <div key={reason} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${info.isFraud ? "bg-red-400" : "bg-blue-400"}`} />
                            {info.label}
                            {info.isFraud && <span className="text-[10px] text-red-400 font-bold uppercase">fraud</span>}
                          </span>
                          <span className="text-xs text-white/50">{formatNumber(count)} ({pct}%)</span>
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
              <div className="mt-4 pt-4 border-t border-white/5 flex gap-6 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Dedup / throttling (legitimate)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> Actual fraud (bots)
                </span>
              </div>
            </div>
          )}

          {/* Real-time Alerts */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">Recent alerts</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {botIPs.length > 0 && botIPs.slice(0, 5).map((ip) => (
                <div key={ip.ip_address} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className="text-sm">🤖</span>
                  <div className="flex-1 text-sm">
                    <span className="font-mono text-xs">{ip.ip_address}</span>
                    {" — "}{ip.total_clicks} clicks in {formatTimeSpan(ip.time_span_seconds)}
                    <span className="text-red-400 text-xs ml-2">[Bot detected]</span>
                  </div>
                </div>
              ))}
              {data.echoAnalysis
                .filter((e) => e.risk_level === "high_fraud_risk")
                .slice(0, 3)
                .map((echo) => (
                  <div key={echo.echo_id} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <span className="text-sm">📊</span>
                    <div className="flex-1 text-sm">
                      Echo <span className="font-bold">{echo.name}</span> — valid rate: {echo.valid_rate_pct}%
                      <span className="text-yellow-400 text-xs ml-2">[Verification recommended]</span>
                    </div>
                  </div>
                ))}
              {carrierIPs.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <span className="text-sm">📡</span>
                  <div className="flex-1 text-sm">
                    {carrierIPs.length} carrier IPs detected — protected from blocking
                    <span className="text-blue-400 text-xs ml-2">[CGNAT Sénégal]</span>
                  </div>
                </div>
              )}
              {botIPs.length === 0 && data.echoAnalysis.filter((e) => e.risk_level === "high_fraud_risk").length === 0 && (
                <p className="text-sm text-white/30">No active alerts</p>
              )}
            </div>
          </div>

          {/* Blocked IPs */}
          {data.blockedIPs.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">{t("superadmin.fraud.blockedIps", { count: data.blockedIPs.length })}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-white/30 border-b border-white/5">
                      <th className="pb-3 font-semibold">IP</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold">Reason</th>
                      <th className="pb-3 font-semibold">Expires</th>
                      <th className="pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blockedIPs.map((ip) => (
                      <tr key={ip.id} className="border-b border-white/5">
                        <td className="py-2 font-mono text-xs">
                          {ip.ip_address}
                          {ip.carrier_ip && <span className="ml-1 text-yellow-400">⚠️</span>}
                        </td>
                        <td className="py-2 text-xs">
                          <Badge
                            status={ip.block_type === "bot" || ip.block_type === "datacenter" ? "flagged" : "active"}
                            label={ip.block_type}
                          />
                        </td>
                        <td className="py-2 text-xs text-white/50">{ip.reason}</td>
                        <td className="py-2 text-xs text-white/50">
                          {ip.expires_at ? new Date(ip.expires_at).toLocaleDateString("en-US") : "Permanent"}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => unblockIP(ip.ip_address)}
                            className="text-xs text-accent hover:text-accent/80 font-bold"
                          >
                            Unblock
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

      {/* ══════════════════════════════════════════════
          SECTION 2: IP Analysis
          ══════════════════════════════════════════════ */}
      {activeSection === "ips" && (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-white/50">{data.ipAnalysis.length} IPs analyzed</span>
            <span className="text-sm text-red-400">{botIPs.length} bots</span>
            <span className="text-sm text-blue-400">{carrierIPs.length} carrier IPs</span>
            {botIPs.length > 0 && (
              <button
                onClick={bulkBlockBots}
                className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/30 transition"
              >
                Block all bots ({botIPs.length})
              </button>
            )}
          </div>

          {/* Sort controls */}
          <div className="flex gap-2">
            {(["total_clicks", "valid_clicks", "active_days"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setIpSort(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ipSort === key ? "bg-accent/20 text-accent border border-accent/30" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
              >
                {key === "total_clicks" ? "Clicks" : key === "valid_clicks" ? "Valid" : "Active days"}
              </button>
            ))}
          </div>

          {/* IP Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/30 border-b border-white/5">
                  <th className="pb-3 font-semibold">IP Address</th>
                  <th className="pb-3 font-semibold">Clicks</th>
                  <th className="pb-3 font-semibold">Valid</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Carrier</th>
                  <th className="pb-3 font-semibold">Risk</th>
                  <th className="pb-3 font-semibold hidden lg:table-cell">Duration</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginate(sortedIPs, ipPage, PAGE_SIZE).map((ip) => (
                  <tr key={ip.ip_address} className="border-b border-white/5 hover:bg-white/3 transition">
                    <td className="py-3 font-mono text-xs">{ip.ip_address}</td>
                    <td className="py-3 text-xs">{ip.total_clicks}</td>
                    <td className="py-3 text-xs">{ip.valid_clicks}</td>
                    <td className="py-3 text-xs hidden md:table-cell">
                      {ip.is_carrier_ip ? (
                        <span>{getCarrierDot(ip.carrier)} {ip.carrier}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-bold ${RISK_COLORS[ip.risk_assessment] || "text-white/40"}`}>
                        {RISK_LABELS[ip.risk_assessment] || ip.risk_assessment}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-white/40 hidden lg:table-cell">
                      {formatTimeSpan(ip.time_span_seconds)}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadIPDetails(ip.ip_address)}
                          className="text-xs text-accent hover:text-accent/80 font-semibold"
                        >
                          Details
                        </button>
                        {ip.is_carrier_ip ? (
                          <span className="text-xs text-orange-400/70 font-semibold">Protected</span>
                        ) : (
                          !data.blockedIPs.some((b) => b.ip_address === ip.ip_address) && (
                            <button
                              onClick={() => blockIP(ip.ip_address)}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold"
                            >
                              Block
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

      {/* ══════════════════════════════════════════════
          SECTION 3: Echo Fraud Analysis
          ══════════════════════════════════════════════ */}
      {activeSection === "echos" && (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/30 border-b border-white/5">
                  <th className="pb-3 font-semibold">Echo</th>
                  <th className="pb-3 font-semibold">Clicks</th>
                  <th className="pb-3 font-semibold">Valid</th>
                  <th className="pb-3 font-semibold">Valid rate</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Suspicious IPs</th>
                  <th className="pb-3 font-semibold">Risk</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginate(data.echoAnalysis, echoPage, PAGE_SIZE).map((echo) => (
                  <tr key={echo.echo_id} className="border-b border-white/5 hover:bg-white/3 transition">
                    <td className="py-3">
                      <div>
                        <span className="text-sm font-semibold">{echo.name}</span>
                        {echo.phone && <span className="text-xs text-white/30 ml-2">{echo.phone}</span>}
                      </div>
                      <span className="text-xs text-white/30">{echo.links_created} links</span>
                    </td>
                    <td className="py-3 text-xs">{echo.total_clicks}</td>
                    <td className="py-3 text-xs">{echo.valid_clicks}</td>
                    <td className="py-3">
                      <span className={`text-sm font-bold ${
                        echo.valid_rate_pct < 30 ? "text-red-400" :
                        echo.valid_rate_pct < 50 ? "text-yellow-400" :
                        "text-emerald-400"
                      }`}>
                        {echo.valid_rate_pct}%
                      </span>
                    </td>
                    <td className="py-3 text-xs hidden md:table-cell">
                      {echo.suspicious_repeat_ips > 0 ? (
                        <span className="text-yellow-400">{echo.suspicious_repeat_ips}</span>
                      ) : (
                        <span className="text-white/20">0</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge
                        status={
                          echo.risk_level === "high_fraud_risk" ? "flagged" :
                          echo.risk_level === "moderate_risk" ? "suspended" :
                          "active"
                        }
                        label={
                          echo.risk_level === "high_fraud_risk" ? "High risk" :
                          echo.risk_level === "moderate_risk" ? "Moderate" :
                          "Clean"
                        }
                      />
                    </td>
                    <td className="py-3">
                      {echo.risk_level !== "clean" && (
                        <button
                          onClick={() => flagEcho(echo.echo_id, "high")}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold"
                        >
                          Flag
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

      {/* ══════════════════════════════════════════════
          SECTION 4: Click Log
          ══════════════════════════════════════════════ */}
      {activeSection === "clicks" && (
        <div className="space-y-4">
          <TabBar
            tabs={[
              { key: "all", label: t("superadmin.fraud.allTab"), count: data.recentClicks.length },
              { key: "suspects", label: t("superadmin.fraud.suspectTab"), count: data.recentClicks.filter((c) => !c.is_valid).length },
              { key: "valid", label: t("superadmin.fraud.validTab"), count: data.recentClicks.filter((c) => c.is_valid).length },
            ]}
            active={clickFilter}
            onChange={(f) => { setClickFilter(f); setClickPage(1); }}
            className="mb-4"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/30 border-b border-white/5">
                  <th className="pb-3 font-semibold">{t("common.date")}</th>
                  <th className="pb-3 font-semibold">{t("superadmin.fraud.ip")}</th>
                  <th className="pb-3 font-semibold hidden lg:table-cell">Reason</th>
                  <th className="pb-3 font-semibold">{t("superadmin.fraud.echoLabel")}</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">{t("superadmin.fraud.campaign")}</th>
                  <th className="pb-3 font-semibold">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredClicks, clickPage, PAGE_SIZE).map((click) => (
                  <tr key={click.id} className="border-b border-white/5 hover:bg-white/3 transition">
                    <td className="py-3 text-xs text-white/50">
                      {new Date(click.created_at).toLocaleDateString("en-US", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-mono text-xs">{click.ip_address || "—"}</td>
                    <td className="py-3 text-xs text-white/40 hidden lg:table-cell">
                      {click.rejection_reason ? (REJECTION_LABELS[click.rejection_reason]?.label || click.rejection_reason) : "—"}
                    </td>
                    <td className="py-3 text-xs">{click.tracked_links?.users?.name || "—"}</td>
                    <td className="py-3 text-xs hidden md:table-cell">{click.tracked_links?.campaigns?.title || "—"}</td>
                    <td className="py-3">
                      <button onClick={() => toggleClickValidity(click.id)}>
                        <Badge status={click.is_valid ? "active" : "flagged"} label={click.is_valid ? t("common.valid") : "Rejected"} />
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

      {/* ══════════════════════════════════════════════
          SECTION 5: Fraud Settings
          ══════════════════════════════════════════════ */}
      {activeSection === "settings" && (
        <FraudSettings onSave={saveFraudSettings} saving={savingSettings} />
      )}

      {/* ══════════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════════ */}

      {/* IP Detail Slide-out */}
      <Modal
        open={!!selectedIP}
        onClose={() => { setSelectedIP(null); setIPDetails(null); }}
        title={`IP: ${selectedIP || ""}`}
      >
        {ipDetailsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : ipDetails ? (
          <div className="space-y-4">
            {/* Carrier info */}
            {ipDetails.is_carrier_ip && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm font-bold text-orange-400">
                  {getCarrierDot(ipDetails.carrier)} Carrier: {ipDetails.carrier}
                </p>
                {ipDetails.carrier_notes && (
                  <p className="text-xs text-orange-400/70 mt-1">{ipDetails.carrier_notes}</p>
                )}
                <p className="text-xs text-orange-400/60 mt-2">
                  ⚠️ Shared IP (CGNAT). Blocking will affect all subscribers on this tower.
                </p>
              </div>
            )}

            {/* Click timeline */}
            <div>
              <h3 className="text-sm font-bold mb-3">Click timeline ({ipDetails.clicks.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ipDetails.clicks.map((click) => {
                  const link = Array.isArray(click.tracked_links) ? click.tracked_links[0] : click.tracked_links;
                  return (
                    <div key={click.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5">
                      <span className={`w-1.5 h-1.5 rounded-full ${click.is_valid ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-white/40 w-28 shrink-0">
                        {new Date(click.created_at).toLocaleString("en-US", {
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

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {ipDetails.is_carrier_ip ? (
                <div className="flex-1 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold text-center">
                  Protected IP — carrier {ipDetails.carrier}
                </div>
              ) : (
                <button
                  onClick={() => { blockIP(selectedIP!); setSelectedIP(null); setIPDetails(null); }}
                  className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
                >
                  Block this IP
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Carrier Block Confirmation */}
      <Modal
        open={!!blockConfirm}
        onClose={() => setBlockConfirm(null)}
        title="⚠️ Carrier IP detected"
      >
        {blockConfirm && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm text-orange-400">
                This IP belongs to the <strong>{blockConfirm.carrier}</strong> network.
                Blocking will reject clicks from <strong>all subscribers</strong> on this tower — potentially thousands of people.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBlockConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => { blockIP(blockConfirm.ip, true); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold"
              >
                Block anyway
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Fraud Settings Component ──

function FraudSettings({ onSave, saving }: { onSave: (s: Record<string, string>) => void; saving: boolean }) {
  const [cooldownHours, setCooldownHours] = useState("24");
  const [linkHourlyLimit, setLinkHourlyLimit] = useState("30");
  const [ipDailyLimit, setIpDailyLimit] = useState("8");
  const [speedSeconds, setSpeedSeconds] = useState("3");
  const [autoBlockDatacenter, setAutoBlockDatacenter] = useState(true);
  const [carrierProtection, setCarrierProtection] = useState(true);

  return (
    <div className="glass-card p-6 max-w-xl space-y-6">
      <h2 className="text-lg font-bold">Anti-fraud settings</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">IP cooldown per link (hours)</label>
          <input
            type="number"
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
          />
          <p className="text-xs text-white/30 mt-1">Same IP + same link = 1 valid click per period</p>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">Click limit per link / hour</label>
          <input
            type="number"
            value={linkHourlyLimit}
            onChange={(e) => setLinkHourlyLimit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">Valid click limit per IP / day</label>
          <input
            type="number"
            value={ipDailyLimit}
            onChange={(e) => setIpDailyLimit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
          />
          <p className="text-xs text-white/30 mt-1">Maximum valid clicks per IP per day (all links combined)</p>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">Minimum interval between clicks (seconds)</label>
          <input
            type="number"
            value={speedSeconds}
            onChange={(e) => setSpeedSeconds(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
          />
          <p className="text-xs text-white/30 mt-1">Faster clicks = automated bot</p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm">Auto-block datacenter IPs</span>
            <p className="text-xs text-white/30">Automatically block IPs identified as datacenter</p>
          </div>
          <button
            onClick={() => setAutoBlockDatacenter(!autoBlockDatacenter)}
            className={`w-12 h-6 rounded-full transition-colors ${autoBlockDatacenter ? "bg-accent" : "bg-white/10"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoBlockDatacenter ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm">Carrier IP protection</span>
            <p className="text-xs text-white/30">Prevent blocking CGNAT IPs from Senegalese carriers (recommended)</p>
          </div>
          <button
            onClick={() => setCarrierProtection(!carrierProtection)}
            className={`w-12 h-6 rounded-full transition-colors ${carrierProtection ? "bg-accent" : "bg-white/10"}`}
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
        className="w-full py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/30 transition disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}
