const badgeStyles: Record<string, string> = {
  active: "bg-[rgba(26,188,156,0.15)] text-[#1ABC9C]",
  paused: "bg-[rgba(243,156,18,0.15)] text-[#F39C12]",
  completed: "bg-[rgba(255,255,255,0.08)] text-white/50",
  draft: "bg-[rgba(108,52,131,0.2)] text-[#8E44AD]",
  pending: "bg-[rgba(243,156,18,0.15)] text-[#F39C12]",
  sent: "bg-[rgba(26,188,156,0.15)] text-[#1ABC9C]",
  failed: "bg-[rgba(231,76,60,0.15)] text-[#E74C3C]",
  flagged: "bg-[rgba(231,76,60,0.15)] text-[#E74C3C]",
  approved: "bg-[rgba(26,188,156,0.15)] text-[#1ABC9C]",
  rejected: "bg-[rgba(231,76,60,0.15)] text-[#E74C3C]",
  suspended: "bg-[rgba(231,76,60,0.15)] text-[#E74C3C]",
  verified: "bg-[rgba(26,188,156,0.15)] text-[#1ABC9C]",
  low: "bg-[rgba(26,188,156,0.15)] text-[#1ABC9C]",
  medium: "bg-[rgba(243,156,18,0.15)] text-[#F39C12]",
  high: "bg-[rgba(231,76,60,0.15)] text-[#E74C3C]",
};

const labels: Record<string, string> = {
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  draft: "Brouillon",
  pending: "En attente",
  sent: "Envoyé",
  failed: "Échoué",
  flagged: "Signalé",
  approved: "Approuvé",
  rejected: "Rejeté",
  suspended: "Suspendu",
  verified: "Vérifié",
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
};

export default function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeStyles[status] || "bg-white/5 text-white/50"}`}>
      {label || labels[status] || status}
    </span>
  );
}
