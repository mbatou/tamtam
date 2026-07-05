"use client";

import { formatFCFA } from "@/lib/utils";
import Pagination, { paginate } from "@/components/ui/Pagination";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { PayoutRow, PAGE_SIZE } from "./types";

export default function PayoutHistoryTable({
  completedPayouts,
  historyPage,
  onPageChange,
}: {
  completedPayouts: PayoutRow[];
  historyPage: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      {completedPayouts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { label: "Nombre de retraits", value: String(completedPayouts.length) },
            { label: "Retrait moyen", value: formatFCFA(Math.round(completedPayouts.reduce((s, p) => s + p.amount, 0) / completedPayouts.length)) },
            { label: "Total retraits", value: formatFCFA(completedPayouts.reduce((s, p) => s + p.amount, 0)) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              <span className="font-dm text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
              <div className="font-syne font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#111128" }}>
              {["Date", "Écho", "Montant", "Fournisseur", "Statut"].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${i === 3 ? "hidden md:table-cell" : ""}`}
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginate(completedPayouts, historyPage, PAGE_SIZE).map((payout) => (
              <tr key={payout.id} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                <td className="px-4 py-3 font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <div className="font-dm text-sm font-semibold text-white">{payout.users?.name || "—"}</div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{payout.users?.phone || ""}</div>
                </td>
                <td className="px-4 py-3 font-syne font-bold text-white">{formatFCFA(payout.amount)}</td>
                <td className="px-4 py-3 hidden md:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {payout.provider === "wave" ? "Wave" : "Orange Money"}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge status={payout.status === "sent" ? "active" : payout.status === "rejected" ? "rejected" : "pending"}>
                    {payout.status === "sent" ? "Envoyé" : payout.status === "rejected" ? "Rejeté" : payout.status}
                  </AdminBadge>
                </td>
              </tr>
            ))}
            {completedPayouts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Aucun historique</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Pagination currentPage={historyPage} totalItems={completedPayouts.length} pageSize={PAGE_SIZE} onPageChange={onPageChange} />
      </div>
    </>
  );
}
