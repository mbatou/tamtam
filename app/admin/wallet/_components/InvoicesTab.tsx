"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { C, type Invoice } from "./types";

export default function InvoicesTab({
  invoices,
  invoicesLoading,
}: {
  invoices: Invoice[];
  invoicesLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl overflow-hidden" style={C}>
      {invoicesLoading ? (
        <div className="p-10 text-center space-y-3">
          <div className="h-5 w-32 rounded-lg animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-14 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(211,84,0,0.1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.noInvoices")}</p>
        </div>
      ) : invoices.map((inv) => {
        const isFinal = inv.status === "final";
        return (
          <div key={inv.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isFinal ? "rgba(29,158,117,0.08)" : "rgba(211,84,0,0.08)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFinal ? "#1D9E75" : "#D35400"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold font-dm" style={{ color: "#D35400" }}>{inv.invoice_number}</p>
              <p className="text-[10px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                {new Date(inv.period_start).toLocaleDateString(undefined, { day: "numeric", month: "short" })} — {new Date(inv.period_end).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                <span className="mx-1">·</span>{inv.campaign_count} {t("admin.wallet.campaigns").toLowerCase()}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-bold font-syne text-white">{formatFCFA(inv.total_spend_fcfa)}</p>
                <span className="inline-flex items-center gap-1 text-[9px] font-dm mt-0.5">
                  <span className="w-1 h-1 rounded-full" style={{ background: isFinal ? "#1D9E75" : "#D35400" }} />
                  <span style={{ color: isFinal ? "#1D9E75" : "#D35400" }}>{isFinal ? t("admin.wallet.finalized") : t("admin.wallet.draftInvoice")}</span>
                </span>
              </div>
              <button
                onClick={() => window.open(`/api/brand/wallet/invoices/${inv.id}/pdf`, "_blank")}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                title={t("admin.wallet.downloadInvoice")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
