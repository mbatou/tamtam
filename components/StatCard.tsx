import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  Icon?: LucideIcon;
  accent?: "orange" | "teal" | "purple" | "red";
  highlight?: boolean;
  benchmarkIcon?: React.ReactNode;
}

export default function StatCard({ label, value, sub, icon, Icon, accent = "orange", highlight = false, benchmarkIcon }: StatCardProps) {
  const bg = highlight ? "#160E08" : "#111128";
  const borderColor = highlight ? "rgba(211,84,0,0.3)" : "rgba(255,255,255,0.07)";
  const valueColor = highlight ? "#D35400" : "#FFFFFF";

  const subColors: Record<string, string> = {
    orange: "rgba(255,255,255,0.35)",
    teal: "#5DCAA5",
    purple: "rgba(255,255,255,0.35)",
    red: "rgba(255,255,255,0.35)",
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: bg,
        border: `0.5px solid ${borderColor}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={13} style={{ color: "rgba(255,255,255,0.35)" }} />}
        {icon}
        <span
          className="text-[11px] font-medium font-dm"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {label}
        </span>
      </div>

      <p
        className="text-2xl font-bold font-syne"
        style={{ color: valueColor }}
      >
        {value}
      </p>

      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {benchmarkIcon}
          <span
            className="text-xs font-dm"
            style={{ color: subColors[accent] || subColors.orange }}
          >
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}
