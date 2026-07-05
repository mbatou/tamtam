"use client";

import { formatFCFA, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { C, type Payment, type WalletTransaction } from "./types";

export default function TransactionsTab({
  txs,
  payments,
  txLoading,
  expandedTx,
  setExpandedTx,
  txPage,
  txPages,
  onPageChange,
}: {
  txs: WalletTransaction[];
  payments: Payment[];
  txLoading: boolean;
  expandedTx: string | null;
  setExpandedTx: (id: string | null) => void;
  txPage: number;
  txPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl overflow-hidden" style={C}>
      {txLoading ? (
        <div className="p-10 text-center space-y-3">
          <div className="h-5 w-32 rounded-lg animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      ) : txs.length === 0 && payments.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(211,84,0,0.1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </div>
          <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.noTransactions")}</p>
        </div>
      ) : (
        <>
          {/* Wallet transactions */}
          {txs.map((tx) => {
            const isCredit = tx.amount >= 0;
            const txIcon = getTxIcon(tx.type);
            return (
              <div key={tx.id}>
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                >
                  {/* Category icon */}
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isCredit ? "rgba(29,158,117,0.08)" : "rgba(211,84,0,0.08)" }}>
                    {txIcon}
                  </div>

                  {/* Title + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white font-dm truncate">
                      {tx.description || tx.type_label}
                    </p>
                    <p className="text-[10px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {new Date(tx.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}, {new Date(tx.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-bold font-syne shrink-0" style={{ color: isCredit ? "#1D9E75" : "rgba(255,255,255,0.8)" }}>
                    {isCredit ? "+" : ""}{formatFCFA(tx.amount)}
                  </p>

                  {/* Expand chevron */}
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 transition-transform"
                    style={{ transform: expandedTx === tx.id ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {expandedTx === tx.id && (
                  <div className="px-5 pb-4 pt-2 ml-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-dm">
                      <div>
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.type")}</span>
                        <p className="text-white/60 mt-0.5">{tx.type_label}</p>
                      </div>
                      <div>
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.status")}</span>
                        <p className="mt-0.5" style={{ color: tx.status === "completed" ? "#1D9E75" : tx.status === "failed" ? "#EF4444" : "#EAB308" }}>{t(`admin.wallet.${tx.status}`)}</p>
                      </div>
                      <div>
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.transactionId")}</span>
                        <p className="font-mono text-white/50 mt-0.5">{tx.id.slice(0, 12)}...</p>
                      </div>
                      {tx.source_id && (
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.reference")}</span>
                          <p className="font-mono text-white/50 mt-0.5">{tx.source_id.slice(0, 12)}...</p>
                        </div>
                      )}
                    </div>
                    {(tx.type === "wallet_recharge" || tx.status === "completed") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(`/api/brand/wallet/transactions/${tx.id}/receipt`, "_blank"); }}
                        className="flex items-center gap-1.5 mt-3 text-[10px] font-dm font-semibold transition hover:opacity-70"
                        style={{ color: "#D35400" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {t("admin.wallet.downloadReceipt")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Payment recharges */}
          {txs.length === 0 && payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(29,158,117,0.08)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white font-dm">{t("admin.wallet.recharge")} — {p.payment_method || "Wave"}</p>
                <p className="text-[10px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(p.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-syne" style={{ color: "#1D9E75" }}>+{formatFCFA(p.amount)}</p>
                <PaymentDot status={p.status} />
              </div>
            </div>
          ))}
        </>
      )}

      {/* Pagination */}
      {txPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button onClick={() => onPageChange(txPage - 1)} disabled={txPage <= 1} className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>←</button>
          <span className="text-[11px] font-dm" style={{ color: "rgba(255,255,255,0.4)" }}>Page {txPage} / {txPages}</span>
          <button onClick={() => onPageChange(txPage + 1)} disabled={txPage >= txPages} className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>→</button>
        </div>
      )}
    </div>
  );
}

function getTxIcon(type: string) {
  const s = { strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (type) {
    case "wallet_recharge":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#1D9E75"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "campaign_budget_debit":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#D35400"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>;
    case "campaign_budget_refund":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#3B82F6"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case "manual_credit":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#1D9E75"><polyline points="20 6 9 17 4 12"/></svg>;
    case "manual_debit":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#EF4444"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    default:
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="rgba(255,255,255,0.4)"><circle cx="12" cy="12" r="10"/></svg>;
  }
}

function PaymentDot({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { dot: string; color: string; label: string }> = {
    completed: { dot: "#1D9E75", color: "#1D9E75", label: t("admin.wallet.validated") },
    pending: { dot: "#EAB308", color: "#EAB308", label: t("admin.wallet.pendingValidation") },
    cancelled: { dot: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)", label: t("admin.wallet.cancelled") },
    failed: { dot: "#EF4444", color: "#EF4444", label: t("admin.wallet.refused") },
  };
  const s = map[status] || map.completed;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-dm mt-0.5">
      <span className="w-1 h-1 rounded-full" style={{ background: s.dot }} />
      <span style={{ color: s.color }}>{s.label}</span>
    </span>
  );
}
