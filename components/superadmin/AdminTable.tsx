"use client";

import React from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div
            className="h-3 rounded animate-pulse"
            style={{
              background: "rgba(255,255,255,0.06)",
              width: `${60 + Math.random() * 30}%`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function AdminTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  loading = false,
  emptyIcon,
  emptyTitle = "No data",
  emptyMessage = "There are no records to display.",
  stickyHeader = false,
}: AdminTableProps<T>) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr
            style={{ background: "#111128" }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={`font-dm font-medium text-[11px] uppercase tracking-wider py-3 px-4 text-left ${
                  stickyHeader ? "sticky top-0 z-10" : ""
                }`}
                style={{
                  color: "rgba(255,255,255,0.4)",
                  width: col.width,
                  textAlign: col.align || "left",
                  background: stickyHeader ? "#111128" : undefined,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Loading state */}
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))}

          {/* Data rows */}
          {!loading &&
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                style={{
                  borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                }}
                onClick={() => onRowClick?.(row)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="font-dm text-[13px] text-white py-3 px-4"
                    style={{
                      textAlign: col.align || "left",
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : (row[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16">
          {emptyIcon && (
            <div
              className="mb-3"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              {emptyIcon}
            </div>
          )}
          <p className="font-dm text-sm font-medium text-white/50">
            {emptyTitle}
          </p>
          <p
            className="font-dm text-xs mt-1"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {emptyMessage}
          </p>
        </div>
      )}
    </div>
  );
}
