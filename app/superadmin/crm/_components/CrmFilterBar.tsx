"use client";

import { Search } from "lucide-react";

export default function CrmFilterBar({
  search,
  cityFilter,
  onSearchChange,
  onCityChange,
}: {
  search: string;
  cityFilter: string;
  onSearchChange: (value: string) => void;
  onCityChange: (value: string) => void;
}) {
  return (
    <>
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
        <input
          type="text" value={search} onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher par nom, email, entreprise..."
          className="w-full pl-9 pr-4 py-2 rounded-xl font-dm text-sm focus:outline-none transition"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
        />
      </div>

      <select value={cityFilter} onChange={e => onCityChange(e.target.value)}
        className="rounded-xl px-3 py-2 font-dm text-sm focus:outline-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
        <option value="">Toutes villes</option>
        <option value="Dakar">Dakar</option>
        <option value="Rufisque">Rufisque</option>
        <option value="Thiès">Thiès</option>
        <option value="Pikine">Pikine</option>
        <option value="Saint-Louis">Saint-Louis</option>
      </select>
    </>
  );
}
