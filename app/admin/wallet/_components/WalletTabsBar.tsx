"use client";

import { useTranslation } from "@/lib/i18n";
import { INP, type Tab } from "./types";

export default function WalletTabsBar({
  tab,
  setTab,
  txFilter,
  onTxFilterChange,
  txFrom,
  txTo,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  txFilter: string;
  onTxFilterChange: (value: string) => void;
  txFrom: string;
  txTo: string;
}) {
  const { t } = useTranslation();
  return (
    <div data-tour="transactions" className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1">
        {([
          { key: "recent" as Tab, label: t("admin.wallet.rechargeHistory") },
          { key: "spending" as Tab, label: t("admin.wallet.spendByCampaign") },
          { key: "invoices" as Tab, label: t("admin.wallet.invoiceNumber").replace(/N°\s?/, "") },
        ]).map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-4 py-2 rounded-xl text-[11px] font-bold font-dm transition-all"
            style={{
              background: tab === tb.key ? "#D35400" : "transparent",
              color: tab === tb.key ? "#fff" : "rgba(255,255,255,0.35)",
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Sort / filter (visible on transactions tab) */}
      {tab === "recent" && (
        <div className="flex items-center gap-2">
          <select value={txFilter} onChange={(e) => onTxFilterChange(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-[10px] text-white font-dm focus:outline-none cursor-pointer" style={INP}>
            <option value="" style={{ background: "#111128" }}>{t("admin.wallet.allTransactions")}</option>
            <option value="wallet_recharge" style={{ background: "#111128" }}>{t("admin.wallet.recharges")}</option>
            <option value="campaign_budget_debit" style={{ background: "#111128" }}>{t("admin.wallet.campaignSpending")}</option>
            <option value="campaign_budget_refund" style={{ background: "#111128" }}>{t("admin.wallet.refunds")}</option>
          </select>
          <button
            onClick={() => { const p = new URLSearchParams(); if (txFilter) p.set("type", txFilter); if (txFrom) p.set("from", txFrom); if (txTo) p.set("to", txTo); window.open(`/api/brand/wallet/transactions/export?${p}`, "_blank"); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-dm transition hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
