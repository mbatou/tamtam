export default function ProgressBar({
  value,
  max,
  variant = "primary",
  className = "",
}: {
  value: number;
  max: number;
  variant?: "primary" | "teal" | "purple";
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const gradients = {
    primary: "bg-gradient-primary",
    teal: "bg-gradient-teal",
    purple: "bg-gradient-secondary",
  };

  return (
    <div className={`w-full h-2 bg-white/5 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${gradients[variant]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
