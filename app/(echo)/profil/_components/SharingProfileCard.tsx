"use client";

import { useTranslation } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { PLATFORM_LABELS, AUDIENCE_LABELS } from "@/lib/onboarding";

export default function SharingProfileCard({ user }: { user: User }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">{t("echo.profile.sharingProfile")}</h3>
        <a
          href="/onboarding"
          className="text-xs text-[#1D9E75] font-semibold hover:underline"
        >
          {t("echo.profile.modify")}
        </a>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">{t("echo.profile.platforms")}</p>
          <div className="flex flex-wrap gap-1.5">
            {user.platforms?.map((p) => (
              <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-xs font-semibold">
                {PLATFORM_LABELS[p] || p}
              </span>
            ))}
          </div>
        </div>
        {user.audience_size_range && (
          <div>
            <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">{t("echo.profile.audience")}</p>
            <p className="text-xs font-semibold">{AUDIENCE_LABELS[user.audience_size_range] || user.audience_size_range} {t("echo.profile.contacts")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
