"use client";

import { NotifyResult } from "./types";

export default function NotifyResultModal({
  result,
  onClose,
}: {
  result: NotifyResult | null;
  onClose: () => void;
}) {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col"
        style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-syne font-bold text-lg text-white">Résultat des notifications</h3>
          <button onClick={onClose} className="text-xl transition" style={{ color: "rgba(255,255,255,0.4)" }}>&times;</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { value: result.total, label: "Total Échos", bg: "rgba(255,255,255,0.04)", color: "#fff" },
            { value: result.emailSent, label: "Emails envoyés", bg: "rgba(29,158,117,0.1)", color: "#5DCAA5" },
            { value: result.whatsappReady, label: "WhatsApp prêts", bg: "rgba(29,158,117,0.1)", color: "#5DCAA5" },
            { value: result.unreachable, label: "Injoignables", bg: "rgba(226,75,74,0.1)", color: "#F09595" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
              <div className="font-syne font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="font-dm text-xs" style={{ color: `${s.color}80` }}>{s.label}</div>
            </div>
          ))}
        </div>

        {result.emailFailed > 0 && (
          <div className="rounded-lg px-3 py-2 mb-4 font-dm text-xs"
            style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.2)", color: "#EAB308" }}>
            {result.emailFailed} emails ont échoué
          </div>
        )}

        {result.whatsappLinks.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-dm text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                Liens WhatsApp ({result.whatsappLinks.length})
              </h4>
              <span className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Cliquez pour ouvrir</span>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {result.whatsappLinks.map((wa, i) => (
                <a
                  key={i}
                  href={wa.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg transition group"
                  style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(29,158,117,0.08)";
                    e.currentTarget.style.borderColor = "rgba(29,158,117,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(29,158,117,0.1)" }}>
                      <span className="font-dm text-xs font-bold" style={{ color: "#5DCAA5" }}>WA</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-dm text-sm font-medium text-white truncate">{wa.name}</div>
                      <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{wa.phone}</div>
                    </div>
                  </div>
                  <span className="font-dm text-xs opacity-0 group-hover:opacity-100 transition shrink-0 ml-2" style={{ color: "#5DCAA5" }}>
                    Ouvrir →
                  </span>
                </a>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-dm text-sm transition"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
