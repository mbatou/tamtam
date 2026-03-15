"use client";

import { useTranslation } from "@/lib/i18n";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers to show
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/5">
      <span className="text-xs text-white/30">
        {t("pagination.showing")} {start}–{end} {t("pagination.of")} {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-20 bg-white/5 text-white/60 hover:bg-white/10 disabled:hover:bg-white/5"
        >
          &lsaquo;
        </button>
        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`e${i}`} className="px-1.5 text-xs text-white/20">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                page === currentPage
                  ? "bg-gradient-primary text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-20 bg-white/5 text-white/60 hover:bg-white/10 disabled:hover:bg-white/5"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}

/** Paginate an array client-side */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
