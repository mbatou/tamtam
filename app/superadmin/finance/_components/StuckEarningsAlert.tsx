"use client";

import { formatFCFA } from "@/lib/utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { AlertTriangle } from "lucide-react";
import { StuckEarningsData } from "./types";

export default function StuckEarningsAlert({
  stuckData,
  onRequestFix,
}: {
  stuckData: StuckEarningsData;
  onRequestFix: () => void;
}) {
  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={{ background: "rgba(226,75,74,0.05)", border: "0.5px solid rgba(226,75,74,0.2)" }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(226,75,74,0.1)" }}>
              <AlertTriangle size={18} style={{ color: "#F09595" }} />
            </div>
            <div>
              <h3 className="font-syne font-bold" style={{ color: "#F09595" }}>Gains échos bloqués</h3>
              <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                {stuckData.stuck} écho(s) n&apos;ont pas reçu leurs gains
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-syne font-extrabold text-xl" style={{ color: "#F09595" }}>{formatFCFA(stuckData.total_fcfa)}</div>
            <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>à débloquer</div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {stuckData.campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <AdminBadge status={c.status === "active" ? "active" : c.status === "completed" ? "finished" : "pending"}>{c.status}</AdminBadge>
                <span className="font-dm text-sm font-semibold truncate text-white">{c.title}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{c.echos} écho(s)</span>
                <span className="font-syne font-bold text-sm" style={{ color: "#F09595" }}>{formatFCFA(c.total_fcfa)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onRequestFix}
            className="px-5 py-2.5 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "rgba(29,158,117,0.15)", color: "#5DCAA5", border: "0.5px solid rgba(29,158,117,0.3)" }}
          >
            Débloquer tous les gains
          </button>
          <p className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Transfère vers le solde disponible et notifie chaque écho.
          </p>
        </div>
      </div>
    </div>
  );
}
