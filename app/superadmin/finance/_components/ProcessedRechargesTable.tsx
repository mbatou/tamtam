"use client";

import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import Pagination, { paginate } from "@/components/ui/Pagination";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { PaymentRow, PAGE_SIZE } from "./types";

export default function ProcessedRechargesTable({
  processedRecharges,
  paymentsPage,
  onPageChange,
}: {
  processedRecharges: PaymentRow[];
  paymentsPage: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      {processedRecharges.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { label: "Total paiements", value: String(processedRecharges.length) },
            { label: "Paiement moyen", value: formatFCFA(Math.round(processedRecharges.reduce((s, p) => s + p.amount, 0) / processedRecharges.length)) },
            { label: "Total encaissé", value: formatFCFA(processedRecharges.reduce((s, p) => s + p.amount, 0)) },
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
              {["Date", "Marque", "Montant", "Méthode", "Statut"].map((h, i) => (
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
            {paginate(processedRecharges, paymentsPage, PAGE_SIZE).map((payment) => (
              <tr key={payment.id} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                <td className="px-4 py-3 font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3 font-dm text-sm font-semibold text-white">
                  {payment.users ? getBrandDisplayName(payment.users) : "—"}
                </td>
                <td className="px-4 py-3 font-syne font-bold text-white">{formatFCFA(payment.amount)}</td>
                <td className="px-4 py-3 hidden md:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {payment.payment_method === "admin_topup" ? (
                    <span style={{ color: "#C084FC" }} className="font-bold">Admin Topup</span>
                  ) : (
                    payment.payment_method || payment.provider || "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge status={payment.status === "completed" ? "active" : payment.status === "rejected" ? "rejected" : "pending"}>
                    {payment.status === "completed" ? "Validé" : payment.status === "rejected" ? "Rejeté" : payment.status}
                  </AdminBadge>
                </td>
              </tr>
            ))}
            {processedRecharges.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Aucune recharge</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Pagination currentPage={paymentsPage} totalItems={processedRecharges.length} pageSize={PAGE_SIZE} onPageChange={onPageChange} />
      </div>
    </>
  );
}
