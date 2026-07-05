"use client";

import { useTranslation } from "@/lib/i18n";
import type { User } from "@/lib/types";

export default function ReferralCard({
  referralEnabled,
  user,
  setSuccess,
}: {
  referralEnabled: boolean;
  user: User | null;
  setSuccess: (message: string) => void;
}) {
  const { t } = useTranslation();

  function copyReferralLink() {
    const code = user?.referral_code || (user?.name?.split(" ")[0]?.toUpperCase() + "-TT");
    navigator.clipboard.writeText(`https://tamma.me/register?ref=${code}`);
    setSuccess(t("echo.profile.referralCopied"));
    setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className={`rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5 ${!referralEnabled ? "opacity-50" : ""}`}>
      <h3 className="text-sm font-bold mb-2">🤝 {t("echo.profile.inviteFriends")}</h3>
      {!referralEnabled && (
        <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-yellow-400 text-sm">⏸</span>
          <p className="text-xs text-yellow-300/80">{t("echo.profile.referralPaused")}</p>
        </div>
      )}
      {referralEnabled && <p className="text-xs text-white/40 mb-3">{t("echo.profile.inviteDesc")}</p>}
      <div className="flex gap-2">
        <button
          disabled={!referralEnabled}
          onClick={() => {
            const code = user?.referral_code || (user?.name?.split(" ")[0]?.toUpperCase() + "-TT");
            const text = t("echo.profile.inviteWhatsappText", { code });
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${referralEnabled ? "bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366]" : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"}`}
        >
          {t("echo.profile.shareWhatsApp")}
        </button>
        <button
          disabled={!referralEnabled}
          onClick={copyReferralLink}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold ${referralEnabled ? "bg-white/5 border border-white/10" : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"}`}
        >
          {t("echo.profile.copyLink")}
        </button>
      </div>
    </div>
  );
}
