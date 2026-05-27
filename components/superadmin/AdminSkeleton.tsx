"use client";

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="h-3 bg-white/[0.06] rounded w-24 mb-3" />
      <div className="h-7 bg-white/[0.06] rounded w-32" />
    </div>
  );
}

export function StatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="h-4 bg-white/[0.06] rounded w-32 mb-4" />
      <div className="h-64 bg-white/[0.04] rounded-lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="h-4 bg-white/[0.06] rounded w-40 animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.05] last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 bg-white/[0.06] rounded animate-pulse"
              style={{ width: `${[120, 80, 60, 100, 60][c % 5]}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="h-8 bg-white/[0.06] rounded w-72 animate-pulse" />
      <StatGridSkeleton />
      <ChartSkeleton />
    </div>
  );
}
