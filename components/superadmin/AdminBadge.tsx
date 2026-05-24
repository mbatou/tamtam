"use client";

import React from "react";

interface AdminBadgeProps {
  status:
    | "active"
    | "verified"
    | "pending"
    | "finished"
    | "error"
    | "fraud"
    | "suspended"
    | "draft"
    | "paused"
    | "rejected";
  children?: React.ReactNode;
  size?: "sm" | "md";
}

const STATUS_STYLES: Record<
  string,
  { background: string; color: string }
> = {
  active: {
    background: "rgba(29,158,117,0.15)",
    color: "#5DCAA5",
  },
  verified: {
    background: "rgba(29,158,117,0.15)",
    color: "#5DCAA5",
  },
  pending: {
    background: "rgba(211,84,0,0.15)",
    color: "#F0997B",
  },
  finished: {
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.4)",
  },
  error: {
    background: "rgba(226,75,74,0.15)",
    color: "#F09595",
  },
  fraud: {
    background: "rgba(226,75,74,0.15)",
    color: "#F09595",
  },
  rejected: {
    background: "rgba(226,75,74,0.15)",
    color: "#F09595",
  },
  suspended: {
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.3)",
  },
  draft: {
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.4)",
  },
  paused: {
    background: "rgba(234,179,8,0.15)",
    color: "#EAB308",
  },
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

export default function AdminBadge({
  status,
  children,
  size = "sm",
}: AdminBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const sizeClass = SIZE_CLASSES[size];

  const label =
    children ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full font-dm font-semibold leading-none ${sizeClass}`}
      style={{
        background: style.background,
        color: style.color,
      }}
    >
      {label}
    </span>
  );
}
