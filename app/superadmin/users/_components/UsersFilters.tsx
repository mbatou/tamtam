"use client";

import { Search, Plus } from "lucide-react";
import type { ApiTabs } from "./types";

export interface UsersFilterValues {
  filter: string;
  roleFilter: string;
  activityFilter: "all" | "active" | "inactive";
  platformFilter: string;
  search: string;
}

export interface UsersFilterHandlers {
  setFilter: (v: string) => void;
  setRoleFilter: (v: string) => void;
  setActivityFilter: (v: "all" | "active" | "inactive") => void;
  setPlatformFilter: (v: string) => void;
  setSearch: (v: string) => void;
  setPage: (v: number) => void;
  onCreateBrand: () => void;
}

export default function UsersFilters({
  values,
  handlers,
  tabs,
  dualRoleCount,
}: {
  values: UsersFilterValues;
  handlers: UsersFilterHandlers;
  tabs: ApiTabs;
  dualRoleCount: number;
}) {
  const { filter, roleFilter, activityFilter, platformFilter, search } = values;
  return (
    <>
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Role filter */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          {[
            { key: "all", label: "Tous" },
            { key: "echo", label: "Échos" },
            { key: "batteur", label: "Marques" },
            ...(dualRoleCount > 0 ? [{ key: "dual", label: `Double rôle (${dualRoleCount})` }] : []),
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => { handlers.setRoleFilter(r.key); handlers.setPage(1); }}
              className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
              style={{
                background: roleFilter === r.key ? (r.key === "dual" ? "rgba(192,132,252,0.12)" : "rgba(211,84,0,0.12)") : "transparent",
                color: roleFilter === r.key ? (r.key === "dual" ? "#C084FC" : "#D35400") : "rgba(255,255,255,0.4)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Activity filter */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          {([
            { key: "all" as const, label: "Tous" },
            { key: "active" as const, label: "Actifs" },
            { key: "inactive" as const, label: "Inactifs" },
          ]).map((a) => (
            <button
              key={a.key}
              onClick={() => { handlers.setActivityFilter(a.key); handlers.setPage(1); }}
              className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
              style={{
                background: activityFilter === a.key ? "rgba(29,158,117,0.12)" : "transparent",
                color: activityFilter === a.key ? "#5DCAA5" : "rgba(255,255,255,0.4)",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Platform filter */}
        <select
          value={platformFilter}
          onChange={(e) => { handlers.setPlatformFilter(e.target.value); handlers.setPage(1); }}
          className="px-3 py-2 rounded-xl font-dm text-xs font-medium transition-all focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: platformFilter === "all" ? "rgba(255,255,255,0.4)" : "#5DCAA5" }}
        >
          <option value="all">Plateforme</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
          <option value="snapchat">Snapchat</option>
          <option value="other">Autre</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { handlers.setSearch(e.target.value); handlers.setPage(1); }}
            placeholder="Rechercher par nom, téléphone, ville..."
            className="w-full pl-9 pr-4 py-2 rounded-xl font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>

        {/* Create brand button */}
        <button
          onClick={handlers.onCreateBrand}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm font-bold transition ml-auto"
          style={{ background: "#D35400", color: "#fff" }}
        >
          <Plus size={14} />
          Créer Marque
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { key: "all", label: "Tous", count: tabs.all },
          { key: "verified", label: "Vérifiés", count: tabs.verified },
          { key: "flagged", label: "Signalés", count: tabs.flagged },
          { key: "suspended", label: "Suspendus", count: tabs.suspended },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { handlers.setFilter(t.key); handlers.setPage(1); }}
            className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
            style={{
              background: filter === t.key ? "rgba(211,84,0,0.12)" : "transparent",
              color: filter === t.key ? "#D35400" : "rgba(255,255,255,0.4)",
            }}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 font-bold">{t.count}</span>}
          </button>
        ))}
      </div>
    </>
  );
}
