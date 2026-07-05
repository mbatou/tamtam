"use client";

import { formatFCFA } from "@/lib/utils";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import { Megaphone, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function CampaignStatsCards({
  totalCount,
  approvedCount,
  pendingCount,
  rejectedCount,
  totalBudget,
  totalSpent,
}: {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalBudget: number;
  totalSpent: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <AdminStatCard
        label="Total campagnes"
        value={totalCount}
        icon={<Megaphone size={16} />}
        sub={`Budget total : ${formatFCFA(totalBudget)}`}
      />
      <AdminStatCard
        label="Approuvées"
        value={approvedCount}
        icon={<CheckCircle2 size={16} />}
        accent="teal"
        sub={`${formatFCFA(totalSpent)} dépensés`}
      />
      <AdminStatCard
        label="En attente"
        value={pendingCount}
        icon={<Clock size={16} />}
        accent={pendingCount > 0 ? "orange" : "white"}
      />
      <AdminStatCard
        label="Rejetées"
        value={rejectedCount}
        icon={<XCircle size={16} />}
        accent={rejectedCount > 0 ? "red" : "white"}
      />
    </div>
  );
}
