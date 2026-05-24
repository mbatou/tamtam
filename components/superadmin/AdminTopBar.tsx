"use client";

import React from "react";

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminTopBar({
  title,
  subtitle,
  actions,
}: AdminTopBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-syne font-bold text-xl text-white">
          {title}
        </h1>
        {subtitle && (
          <p
            className="font-dm text-xs mt-0.5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
