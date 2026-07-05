"use client";

import { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "accent" | "info";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-red-500/15 text-red-400",
  neutral: "bg-white/10 text-white/40",
  accent: "bg-[#D35400]/15 text-[#D35400]",
  info: "bg-sky-500/15 text-sky-400",
};

/** Standard status chip. Map a status string to a variant at the call site. */
export default function Badge({
  variant = "neutral",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
