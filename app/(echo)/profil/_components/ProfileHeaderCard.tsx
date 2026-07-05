"use client";

import { useTranslation } from "@/lib/i18n";
import type { User } from "@/lib/types";

export default function ProfileHeaderCard({
  user,
  editing,
  onEdit,
}: {
  user: User | null;
  editing: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();

  const memberSinceDate = user?.created_at ? new Date(user.created_at) : null;
  const daysSinceJoined = memberSinceDate
    ? Math.floor((Date.now() - memberSinceDate.getTime()) / 86400000)
    : 0;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/30 flex items-center justify-center text-xl font-black text-[#1D9E75] shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              {user?.is_founding_echo && (
                <span className="text-sm" title={t("echo.profile.foundingEchoTitle")}>&#129351;</span>
              )}
            </div>
            <p className="text-xs text-white/40">{user?.phone}</p>
            {user?.city && <p className="text-xs text-white/30">{user.city}</p>}
          </div>
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            className="text-xs text-[#1D9E75] font-semibold hover:underline shrink-0"
          >
            {t("echo.profile.edit")}
          </button>
        )}
      </div>
      {memberSinceDate && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-white/30">
            {t("echo.profile.memberSince")} {memberSinceDate.toLocaleDateString("fr-FR")} — {daysSinceJoined} {t("echo.profile.days")}
          </p>
          {daysSinceJoined <= 30 && (
            <span className="text-[10px] text-[#1D9E75] font-bold">🌟 {t("echo.profile.earlyMember")}</span>
          )}
        </div>
      )}
    </div>
  );
}
