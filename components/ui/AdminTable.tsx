"use client";

import { ReactNode } from "react";

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Hide this column below the md breakpoint. */
  hideOnMobile?: boolean;
  align?: "left" | "right";
}

/**
 * Standard admin/superadmin data table (dark header row, hairline dividers).
 * Config-driven so pages stop hand-rolling <table> markup.
 *
 * <AdminTable
 *   columns={[
 *     { key: "date", label: "Date", render: (r) => fmt(r.created_at) },
 *     { key: "amount", label: "Montant", align: "right", render: (r) => `${r.amount} F` },
 *   ]}
 *   rows={payouts}
 *   rowKey={(r) => r.id}
 * />
 */
export default function AdminTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyText = "Aucune donnée",
  onRowClick,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full">
        <thead>
          <tr className="bg-[#111128]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`font-dm font-medium uppercase tracking-wider px-4 py-3 text-[11px] text-white/30 ${
                  col.align === "right" ? "text-right" : "text-left"
                } ${col.hideOnMobile ? "hidden md:table-cell" : ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-white/30">
                Chargement...
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-white/20">
                {emptyText}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-white/[0.05] last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-white/[0.02]" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-xs ${col.align === "right" ? "text-right" : "text-left"} ${
                      col.hideOnMobile ? "hidden md:table-cell" : ""
                    }`}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
