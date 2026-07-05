"use client";

import { getPixelHealth, STATUS_CONFIG } from "./helpers";
import type { PixelRow } from "./types";

export default function PixelStatusBadge({ pixel }: { pixel: PixelRow }) {
  const status = getPixelHealth(pixel);
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}
