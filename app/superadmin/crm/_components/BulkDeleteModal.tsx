"use client";

import { useState } from "react";

export default function BulkDeleteModal({ count, onDelete, onClose }: { count: number; onDelete: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(226,75,74,0.2)" }} onClick={e => e.stopPropagation()}>
        <h3 className="font-syne font-bold mb-2" style={{ color: "#F09595" }}>Supprimer {count} compte(s)</h3>
        <p className="font-dm text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Action irréversible. Les données seront anonymisées.</p>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison de la suppression..."
          className="w-full rounded-xl px-4 py-2.5 font-dm text-sm mb-4 focus:outline-none transition"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
          <button onClick={async () => { setDeleting(true); await onDelete(reason); }} disabled={deleting || !reason}
            className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "rgba(226,75,74,0.15)", color: "#F09595" }}>
            {deleting ? "Suppression..." : `Supprimer ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
