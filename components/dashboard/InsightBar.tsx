"use client";

import { Lightbulb } from "lucide-react";

interface InsightBarProps {
  insight: React.ReactNode;
  ctaLabel: string;
  onCta?: () => void;
  ctaHref?: string;
}

export default function InsightBar({ insight, ctaLabel, onCta, ctaHref }: InsightBarProps) {
  const ActionTag = ctaHref ? "a" : "button";
  const actionProps = ctaHref
    ? { href: ctaHref }
    : { onClick: onCta };

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-[10px]"
      style={{
        background: "#0F1A13",
        border: "0.5px solid rgba(29,158,117,0.3)",
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(29,158,117,0.15)" }}
      >
        <Lightbulb size={16} className="text-[#1D9E75]" />
      </div>

      <p className="flex-1 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
        {insight}
      </p>

      <ActionTag
        {...actionProps as Record<string, unknown>}
        className="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:bg-[rgba(29,158,117,0.1)]"
        style={{
          color: "#5DCAA5",
          border: "0.5px solid rgba(29,158,117,0.4)",
        }}
      >
        {ctaLabel}
      </ActionTag>
    </div>
  );
}
