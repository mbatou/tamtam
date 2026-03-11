"use client";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

export default function TabBar({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 glass-card p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
            active === tab.key
              ? "bg-gradient-primary text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-xs ${active === tab.key ? "text-white/80" : "text-white/30"}`}>
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
