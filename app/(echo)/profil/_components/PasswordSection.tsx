"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function PasswordSection({
  setError,
  setSuccess,
}: {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const { t } = useTranslation();

  async function handleChangePassword() {
    setError("");
    setSuccess("");

    if (passwords.new_password.length < 6) {
      setError(t("common.passwordMin"));
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      setError(t("common.passwordMismatch"));
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: passwords.new_password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
      } else {
        setSuccess(t("common.passwordUpdated"));
        setPasswords({ new_password: "", confirm: "" });
        setShowPassword(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setPwSaving(false);
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold">{t("common.password")}</h3>
        {!showPassword && (
          <button
            onClick={() => { setShowPassword(true); setError(""); setSuccess(""); }}
            className="text-xs text-[#1D9E75] font-semibold hover:underline"
          >
            {t("echo.profile.changePassword")}
          </button>
        )}
      </div>
      {showPassword ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.newPassword")}</label>
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              placeholder={t("common.minChars")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.confirmPassword")}</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder={t("common.repeatPassword")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
              onKeyDown={(e) => e.key === "Enter" && !pwSaving && passwords.new_password && passwords.confirm && handleChangePassword()}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !passwords.new_password || !passwords.confirm}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] transition disabled:opacity-50"
            >
              {pwSaving ? t("common.updating") : t("common.update")}
            </button>
            <button
              onClick={() => { setShowPassword(false); setPasswords({ new_password: "", confirm: "" }); }}
              className="px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/30">{t("common.passwordStrong")}</p>
      )}
    </div>
  );
}
