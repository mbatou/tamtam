"use client";

const roleConfig: Record<string, { label: string; bg: string; color: string }> = {
  owner: { label: "Propriétaire", bg: "rgba(211,84,0,0.12)", color: "#F0997B" },
  admin: { label: "Admin", bg: "rgba(211,84,0,0.12)", color: "#F0997B" },
  member: { label: "Membre", bg: "rgba(29,158,117,0.12)", color: "#5DCAA5" },
  viewer: { label: "Lecteur", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" },
};

export default function RoleBadge({ role }: { role: string }) {
  const config = roleConfig[role] || roleConfig.member;
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
