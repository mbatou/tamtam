"use client";

import { useTranslation } from "@/lib/i18n";

interface StatusBadgeProps {
  status: "active" | "completed" | "paused" | "pending" | "new";
}

const statusStyles = {
  active: "bg-[#1D9E75]/15 text-[#1D9E75] border-[#1D9E75]/20",
  completed: "bg-white/5 text-white/40 border-white/10",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  pending: "bg-[#D35400]/15 text-[#D35400] border-[#D35400]/20",
  new: "bg-[#D35400]/15 text-[#D35400] border-[#D35400]/20",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const style = statusStyles[status] || statusStyles.active;
  const label = t(`echo.status.${status}`);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${style}`}>
      {label}
    </span>
  );
}
