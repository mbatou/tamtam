interface StatusBadgeProps {
  status: "active" | "completed" | "paused" | "pending" | "new";
}

const statusConfig = {
  active: { label: "Actif", className: "bg-[#1D9E75]/15 text-[#1D9E75] border-[#1D9E75]/20" },
  completed: { label: "Terminé", className: "bg-white/5 text-white/40 border-white/10" },
  paused: { label: "Pause", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  pending: { label: "En attente", className: "bg-[#D35400]/15 text-[#D35400] border-[#D35400]/20" },
  new: { label: "Nouveau", className: "bg-[#D35400]/15 text-[#D35400] border-[#D35400]/20" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.className}`}>
      {config.label}
    </span>
  );
}
