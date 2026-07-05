"use client";

import { Download, Mail, Trash2 } from "lucide-react";

export default function BulkActionBar({
  selectedCount,
  onEmail,
  onDelete,
  onExport,
}: {
  selectedCount: number;
  onEmail: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{selectedCount} sélectionnés</span>
      <button onClick={onEmail} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-bold transition"
        style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}><Mail size={12} /> Email</button>
      <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-bold transition"
        style={{ background: "rgba(226,75,74,0.12)", color: "#F09595" }}><Trash2 size={12} /> Supprimer</button>
      <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-bold transition"
        style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}><Download size={12} /> CSV</button>
    </div>
  );
}
