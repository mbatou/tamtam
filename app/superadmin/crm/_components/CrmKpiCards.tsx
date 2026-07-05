"use client";

import AdminStatCard from "@/components/superadmin/AdminStatCard";
import { Building2, CreditCard, Megaphone, Wallet } from "lucide-react";
import { StageCounts } from "./types";

export default function CrmKpiCards({
  total,
  stageCounts,
}: {
  total: number;
  stageCounts: StageCounts;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <AdminStatCard label="Total marques" value={total} icon={<Building2 size={16} />} />
      <AdminStatCard label="Rechargées" value={stageCounts.recharged + stageCounts.first_campaign + stageCounts.repeat + stageCounts.vip} icon={<CreditCard size={16} />} accent="teal" />
      <AdminStatCard label="Actives" value={stageCounts.first_campaign + stageCounts.repeat + stageCounts.vip} icon={<Megaphone size={16} />} accent="teal" />
      <AdminStatCard label="VIP" value={stageCounts.vip} icon={<Wallet size={16} />} accent="orange" />
    </div>
  );
}
