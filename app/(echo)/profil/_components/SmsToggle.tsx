"use client";

import { useTranslation } from "@/lib/i18n";

export default function SmsToggle({
  smsEnabled,
  setSmsEnabled,
}: {
  smsEnabled: boolean;
  setSmsEnabled: (enabled: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{t("echo.sms.label")}</h3>
          <p className="text-[10px] text-white/30 mt-0.5">
            {smsEnabled ? t("echo.sms.enabled") : t("echo.sms.disabled")}
          </p>
        </div>
        <button
          onClick={async () => {
            const newVal = !smsEnabled;
            setSmsEnabled(newVal);
            try {
              await fetch("/api/echo/notification-prefs", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sms_optout: !newVal,
                  sms_optout_at: !newVal ? new Date().toISOString() : null,
                }),
              });
            } catch {
              setSmsEnabled(!newVal);
            }
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            smsEnabled ? "bg-[#1D9E75]" : "bg-white/10"
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            smsEnabled ? "translate-x-[22px]" : "translate-x-0.5"
          }`} />
        </button>
      </div>
      <p className="text-[10px] text-white/20 mt-2">{t("echo.sms.description")}</p>
    </div>
  );
}
