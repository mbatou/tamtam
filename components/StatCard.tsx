interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "orange" | "teal" | "purple" | "red";
}

const accentColors = {
  orange: "from-primary to-primary-light",
  teal: "from-accent to-emerald-400",
  purple: "from-secondary to-purple-400",
  red: "from-red-500 to-red-400",
};

const borderColors = {
  orange: "border-l-primary",
  teal: "border-l-accent",
  purple: "border-l-secondary",
  red: "border-l-[#E74C3C]",
};

export default function StatCard({ label, value, sub, icon, accent = "orange" }: StatCardProps) {
  return (
    <div className={`glass-card p-5 flex flex-col gap-2 border-l-4 ${borderColors[accent]} animate-slide-up`} style={{ opacity: 0 }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentColors[accent]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      <span className="text-2xl font-black">{value}</span>
      {sub && <span className="text-xs text-white/40">{sub}</span>}
    </div>
  );
}
