"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import SoundWave from "@/components/ui/SoundWave";
import { useTranslation } from "@/lib/i18n";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleUpdate() {
    setError("");

    if (password.length < 6) {
      setError(t("common.passwordMin"));
      return;
    }

    if (password !== confirm) {
      setError(t("common.passwordMismatch"));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-mesh">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={180} height={48} priority className="h-12 w-auto" />
          <SoundWave bars={5} className="h-5 opacity-60" />
        </Link>

        <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
          {done ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-center">{t("auth.resetSuccess")}</h1>
              <p className="text-sm text-white/40 text-center mb-6">
                {t("auth.resetSuccessDesc")}
              </p>
              <Link
                href="/login"
                className="block w-full py-3 rounded-btn font-bold text-white text-center bg-gradient-primary hover:opacity-90 transition"
              >
                {t("auth.resetLogin")}
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">{t("auth.resetTitle")}</h1>
              <p className="text-xs text-white/30 mb-6">
                {t("auth.resetDesc")}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">
                    {t("common.newPassword")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">
                    {t("common.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                    onKeyDown={(e) => e.key === "Enter" && !loading && password && confirm && handleUpdate()}
                  />
                </div>
                <button
                  onClick={handleUpdate}
                  disabled={loading || !password || !confirm}
                  className="w-full py-3 rounded-btn font-bold text-white bg-gradient-primary disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {loading ? t("common.updating") : t("auth.resetButton")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
