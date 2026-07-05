"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { NewCampaignForm } from "./types";

export default function CampaignFilterBar({
  filter,
  counts,
  onFilterChange,
  onTemplateSelect,
}: {
  filter: string;
  counts: { all: number; pending: number; approved: number; rejected: number };
  onFilterChange: (key: string) => void;
  onTemplateSelect: (preset: NewCampaignForm) => void;
}) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { key: "all", label: "Toutes", count: counts.all },
          { key: "pending", label: "En attente", count: counts.pending },
          { key: "approved", label: "Approuvées", count: counts.approved },
          { key: "rejected", label: "Rejetées", count: counts.rejected },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
            style={{
              background: filter === tab.key ? "rgba(211,84,0,0.12)" : "transparent",
              color: filter === tab.key ? "#D35400" : "rgba(255,255,255,0.4)",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 font-bold">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowTemplateMenu(!showTemplateMenu)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm font-bold transition"
          style={{ background: "#D35400", color: "#fff" }}
        >
          <Plus size={14} />
          Créer
          <ChevronDown size={12} className={`transition-transform ${showTemplateMenu ? "rotate-180" : ""}`} />
        </button>
        {showTemplateMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
            <div
              className="absolute right-0 mt-2 w-64 rounded-xl z-50 overflow-hidden"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}
            >
              {[
                {
                  label: "Recrutement Échos",
                  desc: "Campagne de recrutement",
                  preset: { batteur_id: "", title: "Echo Recruitment", description: "Campaign to recruit new Echos on Tamtam.", destination_url: "https://tamma.me/register", cpc: "15", budget: "", objective: "traffic" },
                },
                {
                  label: "Promo Marque",
                  desc: "Campagne standard pour marque",
                  preset: { batteur_id: "", title: "", description: "", destination_url: "", cpc: "25", budget: "", objective: "traffic" },
                },
                {
                  label: "Personnalisée",
                  desc: "Partir de zéro",
                  preset: { batteur_id: "", title: "", description: "", destination_url: "", cpc: "", budget: "", objective: "traffic" },
                },
              ].map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onTemplateSelect(tmpl.preset);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 transition"
                  style={{ borderTop: i > 0 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="font-dm text-sm font-semibold text-white/80">{tmpl.label}</div>
                  <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{tmpl.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
