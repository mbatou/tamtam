"use client";

import { formatFCFA, formatNumber } from "@/lib/utils";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import { Wallet, TrendingUp, ArrowDownToLine, Clock } from "lucide-react";

export default function FinanceKpiCards({
  grossRevenue,
  platformCut,
  feePercent,
  sentTotal,
  pendingTotal,
  validClicks,
}: {
  grossRevenue: number;
  platformCut: number;
  feePercent: number;
  sentTotal: number;
  pendingTotal: number;
  validClicks: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <AdminStatCard
        label="Revenu brut"
        value={formatFCFA(grossRevenue)}
        icon={<Wallet size={16} />}
        sub={`${formatNumber(validClicks)} clics valides`}
      />
      <AdminStatCard
        label="Commission plateforme"
        value={formatFCFA(platformCut)}
        icon={<TrendingUp size={16} />}
        accent="teal"
        sub={`${feePercent}% de commission`}
      />
      <AdminStatCard
        label="Versé aux Échos"
        value={formatFCFA(sentTotal)}
        icon={<ArrowDownToLine size={16} />}
        accent="white"
      />
      <AdminStatCard
        label="En attente"
        value={formatFCFA(pendingTotal)}
        icon={<Clock size={16} />}
        accent={pendingTotal > 0 ? "orange" : "white"}
      />
    </div>
  );
}
