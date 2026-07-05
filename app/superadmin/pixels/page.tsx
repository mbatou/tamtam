"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import PixelStatsCards from "./_components/PixelStatsCards";
import PixelFilterBar from "./_components/PixelFilterBar";
import PixelsTable from "./_components/PixelsTable";
import PixelDetailPanel from "./_components/PixelDetailPanel";
import { cn, getPixelHealth } from "./_components/helpers";
import type { FilterType, PixelRow, Stats } from "./_components/types";

export default function PixelsPage() {
  const [pixels, setPixels] = useState<PixelRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("Tous");
  const [search, setSearch] = useState("");
  const [selectedPixel, setSelectedPixel] = useState<PixelRow | null>(null);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [secondsSince, setSecondsSince] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/superadmin/pixels")
      .then((r) => r.json())
      .then((d) => {
        setPixels(d.pixels || []);
        setStats(d.stats || null);
        setLastRefresh(Date.now());
      })
      .catch((err) => console.error("[pixels] list", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      if (lastRefresh > 0) {
        setSecondsSince(Math.floor((Date.now() - lastRefresh) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  const filtered = pixels.filter((p) => {
    const health = getPixelHealth(p);
    if (filter === "Actifs" && health !== "active") return false;
    if (filter === "Non testés" && health !== "untested") return false;
    if (filter === "Erreurs" && health !== "error" && health !== "slow")
      return false;

    if (search) {
      const q = search.toLowerCase();
      const brandName = (
        p.brand?.company_name ||
        p.brand?.name ||
        ""
      ).toLowerCase();
      const pId = p.pixel_id.toLowerCase();
      const pName = p.name.toLowerCase();
      if (
        !brandName.includes(q) &&
        !pId.includes(q) &&
        !pName.includes(q)
      )
        return false;
    }

    return true;
  });

  if (!stats && loading) {
    return (
      <div className="p-6 text-white/40 text-sm">Chargement des pixels...</div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">Pixels</h1>
          <p className="text-[12px] text-white/35 mt-0.5">
            Suivi des intégrations Tamtam Pixel par marque
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/25">
          <RefreshCw
            className={cn("w-3.5 h-3.5", loading && "animate-spin")}
          />
          <span>Actualisé il y a {secondsSince}s</span>
          <button
            onClick={load}
            className="text-white/40 hover:text-white/70 transition"
          >
            Actualiser
          </button>
        </div>
      </div>

      {stats && <PixelStatsCards stats={stats} />}

      <PixelFilterBar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <PixelsTable
        filtered={filtered}
        totalCount={pixels.length}
        onSelect={setSelectedPixel}
      />

      {/* Detail panel overlay */}
      {selectedPixel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedPixel(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[#0D0D1F] border-l border-white/[0.07] z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
            <PixelDetailPanel
              pixel={selectedPixel}
              onClose={() => setSelectedPixel(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
