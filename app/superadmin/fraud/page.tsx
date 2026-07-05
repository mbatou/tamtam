"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import DateRangeSelector, { type DateRange } from "@/components/ui/DateRangeSelector";
import { ShieldAlert } from "lucide-react";
import {
  FraudData, IPDetails, IpSortKey, Section, REJECTION_LABELS,
} from "./_components/types";
import FraudSectionNav from "./_components/FraudSectionNav";
import FraudOverviewSection from "./_components/FraudOverviewSection";
import IPAnalysisSection from "./_components/IPAnalysisSection";
import EchoAnalysisSection from "./_components/EchoAnalysisSection";
import ClickLogSection from "./_components/ClickLogSection";
import FraudSettingsPanel from "./_components/FraudSettingsPanel";
import IPDetailDrawer from "./_components/IPDetailDrawer";
import CarrierBlockConfirmDrawer from "./_components/CarrierBlockConfirmDrawer";

export default function FraudPage() {
  const [data, setData] = useState<FraudData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ key: "week", from: null, to: null });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const { showToast, ToastComponent } = useToast();

  const [clickFilter, setClickFilter] = useState("all");
  const [clickPage, setClickPage] = useState(1);

  const [ipPage, setIpPage] = useState(1);
  const [ipSort, setIpSort] = useState<IpSortKey>("total_clicks");
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [ipDetails, setIPDetails] = useState<IPDetails | null>(null);
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
    } catch (err) {
      console.error("[superadmin/fraud] loadData failed:", err);
    }
    setLoading(false);
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
      <FraudSectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        counts={{
          ips: data.ipAnalysis.length,
          echos: data.echoAnalysis.length,
          clicks: data.recentClicks.length,
        }}
      />

      {/* ═══ OVERVIEW ═══ */}
      {activeSection === "overview" && (
        <FraudOverviewSection
          data={data}
          actualFraudRate={actualFraudRate}
          breakdownEntries={breakdownEntries}
          botIPs={botIPs}
          carrierIPs={carrierIPs}
          onUnblockIP={unblockIP}
        />
      )}

      {/* ═══ IP ANALYSIS ═══ */}
      {activeSection === "ips" && (
        <IPAnalysisSection
          sortedIPs={sortedIPs}
          totalIPs={data.ipAnalysis.length}
          botCount={botIPs.length}
          carrierCount={carrierIPs.length}
          blockedIPs={data.blockedIPs}
          sort={ipSort}
          onSortChange={setIpSort}
          page={ipPage}
          onPageChange={setIpPage}
          pageSize={PAGE_SIZE}
          actions={{
            onBulkBlockBots: bulkBlockBots,
            onViewDetails: loadIPDetails,
            onBlockIP: blockIP,
          }}
        />
      )}

      {/* ═══ ECHO ANALYSIS ═══ */}
      {activeSection === "echos" && (
        <EchoAnalysisSection
          echoAnalysis={data.echoAnalysis}
          page={echoPage}
          onPageChange={setEchoPage}
          pageSize={PAGE_SIZE}
          onFlagEcho={flagEcho}
        />
      )}

      {/* ═══ CLICK LOG ═══ */}
      {activeSection === "clicks" && (
        <ClickLogSection
          recentClicks={data.recentClicks}
          filteredClicks={filteredClicks}
          filter={clickFilter}
          onFilterChange={(f) => { setClickFilter(f); setClickPage(1); }}
          page={clickPage}
          onPageChange={setClickPage}
          pageSize={PAGE_SIZE}
          onToggleValidity={toggleClickValidity}
        />
      )}

      {/* ═══ SETTINGS ═══ */}
      {activeSection === "settings" && (
        <FraudSettingsPanel onSave={saveFraudSettings} saving={savingSettings} />
      )}

      {/* ═══ DRAWERS ═══ */}
      <IPDetailDrawer
        selectedIP={selectedIP}
        ipDetails={ipDetails}
        loading={ipDetailsLoading}
        onClose={() => { setSelectedIP(null); setIPDetails(null); }}
        onBlockIP={blockIP}
      />

      <CarrierBlockConfirmDrawer
        blockConfirm={blockConfirm}
        onClose={() => setBlockConfirm(null)}
        onConfirmBlock={(ip) => { blockIP(ip, true); }}
      />
    </div>
  );
}
