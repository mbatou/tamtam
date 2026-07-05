"use client";

import { Search } from "lucide-react";
import { cn } from "./helpers";
import type { FilterType } from "./types";

export default function PixelFilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="flex bg-white/[0.04] rounded-lg p-0.5 gap-0.5">
        {(["Tous", "Actifs", "Non testés", "Erreurs"] as FilterType[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={cn(
                "text-[12px] font-medium px-3 py-1.5 rounded-[7px] transition-all",
                filter === f
                  ? "bg-[#D35400] text-white"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {f}
            </button>
          )
        )}
      </div>

      <div className="relative flex-1 max-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <input
          type="text"
          placeholder="Rechercher une marque..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-[12px] text-white placeholder-white/20 outline-none focus:border-[rgba(211,84,0,0.4)]"
        />
      </div>
    </div>
  );
}
