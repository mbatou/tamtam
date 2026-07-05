"use client";

import { formatFCFA } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { FixResult } from "./types";

export default function FixResultCard({
  fixResult,
  onDismiss,
}: {
  fixResult: FixResult;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 rounded-xl p-5" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.2)" }}>
      <div className="flex items-center gap-3 mb-3">
        <CheckCircle2 size={18} style={{ color: "#5DCAA5" }} />
        <div>
          <h3 className="font-syne font-bold" style={{ color: "#5DCAA5" }}>Gains débloqués</h3>
          <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{fixResult.fixed} écho(s) — {formatFCFA(fixResult.total_fcfa)}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {fixResult.campaigns.map((c) => (
          <div key={c.campaign_id} className="flex items-center justify-between font-dm text-sm py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>{c.title}</span>
            <span className="font-semibold" style={{ color: "#5DCAA5" }}>{c.echos_unlocked} débloqué(s)</span>
          </div>
        ))}
      </div>
      <button onClick={onDismiss} className="mt-3 font-dm text-xs transition" style={{ color: "rgba(255,255,255,0.25)" }}>
        Masquer
      </button>
    </div>
  );
}
