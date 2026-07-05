"use client";

import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "@/lib/i18n";

export default function PushNotificationSettings({
  pushEnabled,
  setPushEnabled,
  notifPrefs,
  setNotifPrefs,
  setSuccess,
}: {
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSuccess: (message: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{t("echo.push.notificationsLabel")}</h3>
          <p className="text-[10px] text-white/30 mt-0.5">
            {pushEnabled ? t("echo.push.statusEnabled") : t("echo.push.statusDisabled")}
          </p>
        </div>
        <button
          onClick={async () => {
            if (pushEnabled) {
              try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                  await sub.unsubscribe();
                  await fetch("/api/push-subscription", { method: "DELETE" });
                }
                setPushEnabled(false);
                setSuccess(t("echo.push.disabled"));
                setTimeout(() => setSuccess(""), 3000);
              } catch {}
            } else {
              try {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") return;
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: (() => {
                    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
                    const padding = "=".repeat((4 - (key.length % 4)) % 4);
                    const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
                    const raw = window.atob(base64);
                    const buf = new ArrayBuffer(raw.length);
                    const arr = new Uint8Array(buf);
                    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                    return arr;
                  })(),
                });
                await fetch("/api/push-subscription", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ subscription: sub }),
                });
                setPushEnabled(true);
                setSuccess(t("echo.push.enabled"));
                setTimeout(() => setSuccess(""), 3000);
              } catch {}
            }
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            pushEnabled ? "bg-[#1D9E75]" : "bg-white/10"
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            pushEnabled ? "translate-x-[22px]" : "translate-x-0.5"
          }`} />
        </button>
      </div>

      {/* Granular notification preferences */}
      {pushEnabled && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          <p className="text-[10px] text-white/30 mb-2">{t("echo.push.prefsTitle")}</p>
          {(["new_campaign", "share_reminder", "inactivity", "campaign_ending"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-xs text-white/60">{t(`echo.push.pref_${key}`)}</span>
              <button
                onClick={async () => {
                  const newVal = !notifPrefs[key];
                  setNotifPrefs((prev) => ({ ...prev, [key]: newVal }));
                  try {
                    await fetch("/api/echo/notification-prefs", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ [key]: newVal }),
                    });
                  } catch {
                    setNotifPrefs((prev) => ({ ...prev, [key]: !newVal }));
                  }
                }}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  notifPrefs[key] ? "bg-[#1D9E75]" : "bg-white/10"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  notifPrefs[key] ? "translate-x-[18px]" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
