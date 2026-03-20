"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SoundWave from "@/components/ui/SoundWave";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"echo" | "batteur">("echo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  // Read tab query param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "batteur") setMode("batteur");
  }, [searchParams]);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Query user role directly using the authenticated client
    // (avoids cookie sync race condition with server-side API routes)
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("role, team_position")
        .eq("id", loginData.user!.id)
        .single();

      if (userData) {
        if (userData.role === "superadmin") {
          window.location.href = "/superadmin";
          return;
        }
        if (userData.role === "admin" && userData.team_position) {
          window.location.href = "/superadmin";
          return;
        }
        if (userData.role === "batteur" || userData.role === "admin") {
          window.location.href = "/admin/dashboard";
          return;
        }
      }
    } catch {
      // Fall through to default redirect
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-mesh">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <span className="text-3xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={5} className="h-5 opacity-60" />
        </Link>

        {/* Mode toggle */}
        <div className="flex mb-8 glass-card p-1">
          <button
            onClick={() => { setMode("echo"); setError(""); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              mode === "echo" ? "bg-gradient-primary text-white shadow-lg" : "text-white/40"
            }`}
          >
            {t("auth.echo")}
          </button>
          <button
            onClick={() => { setMode("batteur"); setError(""); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              mode === "batteur" ? "bg-gradient-secondary text-white shadow-lg" : "text-white/40"
            }`}
          >
            {t("auth.batteur")}
          </button>
        </div>

        {/* ECHO LOGIN */}
        {mode === "echo" && (
          <>
            <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-2">{t("auth.echoLogin")}</h1>
              <p className="text-xs text-white/30 mb-6">
                {t("auth.echoLoginDesc")}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.email")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-white/40">{t("common.password")}</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-primary"
                >
                  {loading ? t("auth.loginLoading") : t("auth.loginButton")}
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-white/30 mt-6">
              {t("auth.noAccount")}{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                {t("auth.becomeEcho")}
              </Link>
            </p>
          </>
        )}

        {/* BATTEUR LOGIN */}
        {mode === "batteur" && (
          <>
            <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-2">{t("auth.batteurLogin")}</h1>
              <p className="text-xs text-white/30 mb-6">
                {t("auth.batteurLoginDesc")}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.email")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@marque.sn"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-white/40">{t("common.password")}</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-secondary"
                >
                  {loading ? t("auth.loginLoading") : t("auth.loginButton")}
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-white/30 mt-6">
              Pas encore de compte?{" "}
              <Link href="/signup/brand" className="text-secondary font-semibold hover:underline">
                Créer un compte marque
              </Link>
            </p>
          </>
        )}

        <p className="text-center mt-4">
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition">
            {t("auth.backToHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
