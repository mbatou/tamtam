import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  Icon?: LucideIcon;
  accent?: "orange" | "teal" | "purple" | "blue" | "red";
}

const ACCENT_CONFIG: Record<string, { iconBg: string; iconColor: string; subColor: string }> = {
  orange: { iconBg: "rgba(211,84,0,0.12)", iconColor: "#D35400", subColor: "rgba(255,255,255,0.4)" },
  teal:   { iconBg: "rgba(29,158,117,0.12)", iconColor: "#1D9E75", subColor: "#5DCAA5" },
  purple: { iconBg: "rgba(139,92,246,0.12)", iconColor: "#8B5CF6", subColor: "rgba(255,255,255,0.4)" },
  blue:   { iconBg: "rgba(59,130,246,0.12)", iconColor: "#3B82F6", subColor: "rgba(255,255,255,0.4)" },
  red:    { iconBg: "rgba(239,68,68,0.12)", iconColor: "#EF4444", subColor: "rgba(255,255,255,0.4)" },
};

export default function StatCard({ label, value, sub, Icon, accent = "orange" }: StatCardProps) {
  const config = ACCENT_CONFIG[accent] || ACCENT_CONFIG.orange;

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.02] cursor-default"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      {Icon && (
        <div
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: config.iconBg }}
        >
          <Icon size={20} style={{ color: config.iconColor }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium font-dm mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {label}
        </p>
        <p className="text-xl font-bold font-syne text-white leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-[10px] font-dm mt-1" style={{ color: config.subColor }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
