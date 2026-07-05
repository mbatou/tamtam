"use client";

import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { AlertTriangle } from "lucide-react";

export default function CarrierBlockConfirmDrawer({
  blockConfirm,
  onClose,
  onConfirmBlock,
}: {
  blockConfirm: { ip: string; carrier: string } | null;
  onClose: () => void;
  onConfirmBlock: (ip: string) => void;
}) {
  return (
    <AdminDrawer
      open={!!blockConfirm}
      onClose={onClose}
      title="IP opérateur détectée"
      subtitle="Confirmation requise"
      width="480px"
    >
      {blockConfirm && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20">
            <p className="text-sm font-dm text-[#D35400] flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                Cette IP appartient au réseau <strong>{blockConfirm.carrier}</strong>.
                Le blocage rejettera les clics de <strong>tous les abonnés</strong> sur cette antenne — potentiellement des milliers de personnes.
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-dm font-bold hover:bg-white/10 transition"
            >
              Annuler
            </button>
            <button
              onClick={() => { onConfirmBlock(blockConfirm.ip); }}
              className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-dm font-bold hover:bg-red-500/20 transition"
            >
              Bloquer quand même
            </button>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}
