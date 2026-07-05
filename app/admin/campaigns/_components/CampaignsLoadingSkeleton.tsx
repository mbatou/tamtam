"use client";

export default function CampaignsLoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-5" style={{ maxWidth: "100%" }}>
      <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-3 w-32 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <div className="h-24" style={{ background: "rgba(255,255,255,0.03)" }} />
            <div className="p-2.5 space-y-2">
              <div className="h-3 w-3/4 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-2 w-1/2 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="h-[3px] w-full rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="h-2 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
