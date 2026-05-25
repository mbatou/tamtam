"use client";

import { useTranslation } from "@/lib/i18n";

const roleStyles: Record<string, { bg: string; color: string }> = {
  owner: { bg: "rgba(211,84,0,0.12)", color: "#F0997B" },
  admin: { bg: "rgba(211,84,0,0.12)", color: "#F0997B" },
  member: { bg: "rgba(29,158,117,0.12)", color: "#5DCAA5" },
  viewer: { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" },
};

const roleKeys: Record<string, string> = {
  owner: "workspace.roleOwner",
  admin: "workspace.roleAdmin",
  member: "workspace.roleMember",
  viewer: "workspace.roleViewer",
};

export default function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const style = roleStyles[role] || roleStyles.member;
  const labelKey = roleKeys[role] || roleKeys.member;
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {t(labelKey)}
    </span>
  );
}
