"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import GoogleButton from "@/components/ui/GoogleButton";
import AuthLayout from "@/components/auth/AuthLayout";
import FormField from "@/components/auth/FormField";
import { useTranslation } from "@/lib/i18n";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const isVerified = searchParams.get("verified") === "true";
  const hasBonus = searchParams.get("bonus") === "true";
  const ambassadorNameParam = searchParams.get("ambassador");

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

    try {
      const userRes = await fetch("/api/echo/user", {
        headers: {
          Authorization: `Bearer ${loginData.session!.access_token}`,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.role === "superadmin") {
          window.location.href = "/superadmin";
          return;
        }
        if (userData.role === "admin" && userData.team_position) {
          window.location.href = "/superadmin";
          return;
        }
        if (userData.role === "batteur" || userData.role === "admin") {
          try {
            const wsRes = await fetch("/api/brand/workspaces", {
              headers: { Authorization: `Bearer ${loginData.session!.access_token}` },
            });
            if (wsRes.ok) {
              const wsData = await wsRes.json();
              if ((wsData.brands?.length || 0) > 1 || (wsData.pending?.length || 0) > 0) {
                window.location.href = "/brand-picker";
                return;
              }
            }
          } catch {}
          window.location.href = "/admin/dashboard";
          return;
        }
      }
    } catch {
      // Fall through to mode-based redirect
    }

    if (mode === "batteur") {
      window.location.href = "/admin/dashboard";
    } else {
      window.location.href = "/dashboard";
    }
  }

  const accentColor = mode === "batteur" ? "orange" : "teal";
  const ctaGradient =
    mode === "batteur"
      ? "bg-gradient-to-r from-[#D35400] to-[#F39C12]"
      : "bg-gradient-to-r from-[#1D9E75] to-[#1ABC9C]";

  const panel = (
    <div className="space-y-10 text-center">
      <div>
        <h2 className="text-3xl font-bold font-syne tracking-tight text-white mb-3">
          Le bouche-à-oreille,
          <br />
          <span className="gradient-text">digitalisé.</span>
        </h2>
        <p className="text-sm text-white/40 font-dm leading-relaxed max-w-xs mx-auto">
          Tamtam connecte les marques aux voix qui comptent. Chaque partage crée de la valeur.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-sm text-white/60 italic font-dm leading-relaxed">
            &ldquo;J&apos;ai gagné 45 000 FCFA en un mois juste en partageant des liens sur WhatsApp.&rdquo;
          </p>
          <p className="text-xs text-white/30 mt-3 font-dm">Awa D. &middot; Dakar</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-sm text-white/60 italic font-dm leading-relaxed">
            &ldquo;Notre campagne a touché 12 000 personnes en 48h. Impossible avec la pub classique.&rdquo;
          </p>
          <p className="text-xs text-white/30 mt-3 font-dm">Moussa K. &middot; Boutique MK</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <p className="text-2xl font-bold font-syne text-white">2 500+</p>
          <p className="text-xs text-white/30 font-dm">Échos actifs</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-2xl font-bold font-syne text-white">500+</p>
          <p className="text-xs text-white/30 font-dm">Campagnes</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-2xl font-bold font-syne text-white">75%</p>
          <p className="text-xs text-white/30 font-dm">Reversé</p>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout panel={panel} accentColor={accentColor}>
      {/* Success banners */}
      {isVerified && ambassadorNameParam && (
        <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-[#6C3483]/20 to-[#D35400]/20 border border-[#6C3483]/30 text-center">
          <p className="font-bold text-lg text-white">2 000 FCFA offerts !</p>
          <p className="text-sm text-white/50 mt-1">
            Vous avez été référé par <strong className="text-[#D35400]">{ambassadorNameParam}</strong>
          </p>
        </div>
      )}
      {isVerified && !ambassadorNameParam && hasBonus && (
        <div className="mb-5 p-3 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-center text-[#1ABC9C] text-sm">
          Compte créé avec succès ! Bonus de bienvenue crédité.
        </div>
      )}
      {isVerified && !ambassadorNameParam && !hasBonus && (
        <div className="mb-5 p-3 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-center text-[#1ABC9C] text-sm">
          Compte créé avec succès ! Connectez-vous.
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex mb-8 bg-[#111128] rounded-xl p-1">
        <button
          onClick={() => { setMode("echo"); setError(""); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all font-dm ${
            mode === "echo"
              ? "bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/20"
              : "text-white/35 hover:text-white/50"
          }`}
        >
          {t("auth.echo")}
        </button>
        <button
          onClick={() => { setMode("batteur"); setError(""); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all font-dm ${
            mode === "batteur"
              ? "bg-[#D35400] text-white shadow-lg shadow-[#D35400]/20"
              : "text-white/35 hover:text-white/50"
          }`}
        >
          {t("auth.batteur")}
        </button>
      </div>

      <h1 className="text-2xl font-bold font-syne tracking-tight text-white mb-1">
        {mode === "echo" ? t("auth.echoLogin") : t("auth.batteurLogin")}
      </h1>
      <p className="text-sm text-white/35 font-dm mb-7">
        {mode === "echo" ? t("auth.echoLoginDesc") : t("auth.batteurLoginDesc")}
      </p>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-dm">
          {error}
        </div>
      )}

      <GoogleButton
        role={mode}
        label={t("auth.loginButton") + " avec Google"}
        className="mb-5"
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-xs text-white/25 font-dm">ou par email</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      <div className="space-y-4">
        <FormField
          label={t("common.email")}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={mode === "batteur" ? "contact@marque.sn" : t("auth.emailPlaceholder")}
          accentColor={accentColor}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-white/50 font-dm">{t("common.password")}</label>
            <Link href="/forgot-password" className="text-xs text-white/35 hover:text-white/50 transition font-dm">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className={`w-full bg-[#141420] border border-white/[0.07] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 font-dm transition-all outline-none ${
                accentColor === "orange"
                  ? "focus:border-[#D35400]/50 focus:ring-1 focus:ring-[#D35400]/20"
                  : "focus:border-[#1D9E75]/50 focus:ring-1 focus:ring-[#1D9E75]/20"
              }`}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg font-dm ${ctaGradient}`}
        >
          {loading ? t("auth.loginLoading") : t("auth.loginButton")}
        </button>
      </div>

      <p className="text-center text-sm text-white/30 mt-8 font-dm">
        {mode === "echo" ? (
          <>
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-[#1D9E75] font-semibold hover:underline">
              {t("auth.becomeEcho")}
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte?{" "}
            <Link href="/signup/brand" className="text-[#D35400] font-semibold hover:underline">
              Créer un compte marque
            </Link>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
