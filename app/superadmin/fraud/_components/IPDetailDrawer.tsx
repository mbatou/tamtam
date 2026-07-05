"use client";

import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { AlertTriangle, Ban, Wifi } from "lucide-react";
import { IPDetails, REJECTION_LABELS } from "./types";

export default function IPDetailDrawer({
  selectedIP,
  ipDetails,
  loading,
  onClose,
  onBlockIP,
}: {
  selectedIP: string | null;
  ipDetails: IPDetails | null;
  loading: boolean;
  onClose: () => void;
  onBlockIP: (ip: string) => void;
}) {
  return (
    <AdminDrawer
      open={!!selectedIP}
      onClose={onClose}
      title={`IP: ${selectedIP || ""}`}
      subtitle="Détails et historique des clics"
      width="520px"
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      ) : ipDetails ? (
        <div className="space-y-4">
          {ipDetails.is_carrier_ip && (
            <div className="p-3 rounded-lg bg-[#D35400]/10 border border-[#D35400]/20">
              <p className="text-sm font-dm font-bold text-[#D35400] flex items-center gap-2">
                <Wifi size={14} /> Opérateur: {ipDetails.carrier}
              </p>
              {ipDetails.carrier_notes && (
                <p className="text-xs font-dm text-[#D35400]/70 mt-1">{ipDetails.carrier_notes}</p>
              )}
              <p className="text-xs font-dm text-[#D35400]/60 mt-2 flex items-center gap-1">
                <AlertTriangle size={12} /> IP partagée (CGNAT). Le blocage affectera tous les abonnés de cette antenne.
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-syne font-bold mb-3">Chronologie des clics ({ipDetails.clicks.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ipDetails.clicks.map((click) => {
                const link = Array.isArray(click.tracked_links) ? click.tracked_links[0] : click.tracked_links;
                return (
                  <div key={click.id} className="flex items-center gap-3 text-xs font-dm py-1.5 border-b border-white/[0.05]">
                    <span className={`w-1.5 h-1.5 rounded-full ${click.is_valid ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span className="text-white/40 w-28 shrink-0">
                      {new Date(click.created_at).toLocaleString("fr-FR", {
                        month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <span className="font-mono text-white/60">/r/{link?.short_code || "?"}</span>
                    <span className="text-white/30">({link?.users?.name || "?"})</span>
                    {click.rejection_reason && (
                      <span className="text-red-400/60 ml-auto">{REJECTION_LABELS[click.rejection_reason]?.label || click.rejection_reason}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {ipDetails.is_carrier_ip ? (
              <div className="flex-1 py-2 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400] text-xs font-dm font-bold text-center flex items-center justify-center gap-1.5">
                <Wifi size={12} /> IP protégée — opérateur {ipDetails.carrier}
              </div>
            ) : (
              <button
                onClick={() => { onBlockIP(selectedIP!); onClose(); }}
                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-dm font-bold flex items-center justify-center gap-1.5"
              >
                <Ban size={12} /> Bloquer cette IP
              </button>
            )}
          </div>
        </div>
      ) : null}
    </AdminDrawer>
  );
}
