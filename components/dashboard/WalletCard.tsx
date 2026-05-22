"use client";

import Link from "next/link";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Wallet, ArrowUpRight, Plus } from "lucide-react";

interface WalletCardProps {
  balance: number;
  totalSpent: number;
  totalBudget: number;
}

export default function WalletCard({ balance, totalSpent, totalBudget }: WalletCardProps) {
  const { t } = useTranslation();
  const remaining = Math.max(0, totalBudget - totalSpent);

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #D35400 0%, #B84700 50%, #8B3500 100%)",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Wallet size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-medium text-white/60">{t("admin.dashboard.walletBalance")}</span>
          </div>
          <Link
            href="/admin/wallet"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <ArrowUpRight size={14} className="text-white" />
          </Link>
        </div>

        <p className="text-2xl font-bold font-syne text-white mb-4">{formatFCFA(balance)}</p>

        <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div>
            <p className="text-[10px] text-white/40">{t("admin.dashboard.totalSpentLabel")}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{formatFCFA(totalSpent)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/40">{t("admin.dashboard.campaignBudgetLeft")}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{formatFCFA(remaining)}</p>
          </div>
        </div>

        <Link
          href="/admin/wallet"
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white/90 transition-colors"
          style={{ background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.15)" }}
        >
          <Plus size={13} />
          {t("admin.dashboard.addFunds")}
        </Link>
      </div>
    </div>
  );
}
