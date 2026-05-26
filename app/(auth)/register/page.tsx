"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CitySelect from "@/components/ui/CitySelect";
import GoogleButton from "@/components/ui/GoogleButton";
import AuthLayout from "@/components/auth/AuthLayout";
import FormField from "@/components/auth/FormField";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { validateEmailDomain, type EmailValidationResult } from "@/lib/email-validation";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  return <Suspense><RegisterPageContent /></Suspense>;
}

function RegisterPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const tmRef = searchParams.get("tm_ref") || "";
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("+221");
  const [city, setCity] = useState("");
  const [provider, setProvider] = useState<"wave" | "orange_money" | "">("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailCheck, setEmailCheck] = useState<EmailValidationResult | null>(null);
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    const atIdx = email.indexOf("@");
    if (atIdx === -1 || email.length - atIdx < 4) {
      setEmailCheck(null);
      return;
    }
    emailDebounceRef.current = setTimeout(() => {
      setEmailCheck(validateEmailDomain(email));
    }, 300);
    return () => { if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current); };
  }, [email]);

  async function handleStep1() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError(t("auth.registerFillAll"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.registerPasswordMin"));
      return;
    }
    const check = validateEmailDomain(email);
    if (!check.valid) {
      setError(check.error || "Adresse email invalide.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleStep2() {
    if (!provider) {
      setError(t("auth.registerChoosePayment"));
      return;
    }
    if (!termsAccepted) {
      setError(t("auth.registerAcceptTerms"));
      return;
    }
    setError("");
    setLoading(true);

    let userId: string | null = null;

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already been registered")) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(t("auth.registerExists"));
          setLoading(false);
          return;
        }
        userId = signInData.user?.id || null;
      } else {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    } else {
      userId = data.user?.id || null;
    }

    if (userId) {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name,
          phone: phone.length > 4 ? phone : null,
          city: city || null,
          mobile_money_provider: provider,
          referral_code: referralCode || undefined,
          tm_ref: tmRef || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("auth.registerProfileError"));
      } else {
        trackEvent.echoSignup(city || undefined);
        window.location.href = "/dashboard";
      }
    }
    setLoading(false);
  }

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ["", "bg-red-500", "bg-yellow-500", "bg-[#1D9E75]"];
  const strengthLabels = ["", "Faible", "Moyen", "Fort"];

  const panel = (
    <div className="space-y-10 text-center">
      <div>
        <h2 className="text-3xl font-bold font-syne tracking-tight text-white mb-3">
          Gagne de l&apos;argent
          <br />
          <span className="gradient-text-teal">en partageant.</span>
        </h2>
        <p className="text-sm text-white/40 font-dm leading-relaxed max-w-xs mx-auto">
          Rejoins les 2 500+ Échos qui monétisent leur réseau social chaque jour.
        </p>
      </div>

      {/* Earnings preview */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
        <p className="text-xs text-white/30 font-dm mb-4">Simulation de gains</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50 font-dm">10 partages / jour</span>
            <span className="text-sm font-bold text-[#1ABC9C] font-dm">~15 000 FCFA / mois</span>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50 font-dm">25 partages / jour</span>
            <span className="text-sm font-bold text-[#1ABC9C] font-dm">~45 000 FCFA / mois</span>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50 font-dm">50 partages / jour</span>
            <span className="text-sm font-bold text-[#1ABC9C] font-dm">~90 000 FCFA / mois</span>
          </div>
        </div>
        <p className="text-[10px] text-white/20 font-dm mt-4">
          Estimations basées sur un CPC moyen de 20 FCFA et un taux de clic de 15%
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-xl font-bold font-syne text-white">75%</p>
          <p className="text-xs text-white/30 font-dm">Reversé aux Échos</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-xl font-bold font-syne text-white">500 FCFA</p>
          <p className="text-xs text-white/30 font-dm">Retrait minimum</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-xl font-bold font-syne text-white">Instant</p>
          <p className="text-xs text-white/30 font-dm">Via Wave</p>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout panel={panel} accentColor="teal">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-3 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all font-dm ${
                step >= s
                  ? "bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/20"
                  : "bg-[#111128] text-white/30"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 2 && (
              <div className={`flex-1 h-0.5 rounded transition-all ${step > 1 ? "bg-[#1D9E75]" : "bg-white/[0.07]"}`} />
            )}
          </div>
        ))}
      </div>

      <h1 className="text-2xl font-bold font-syne tracking-tight text-white mb-1">
        {t("auth.registerTitle")}
      </h1>
      <p className="text-sm text-white/35 font-dm mb-7">
        {step === 1 ? t("auth.registerStep1") : t("auth.registerStep2")}
      </p>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-dm">
          {error}
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <GoogleButton role="echo" label="S'inscrire avec Google" className="mb-1" tmRef={tmRef || undefined} />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/25 font-dm">ou par email</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <FormField
            label={t("auth.registerName")}
            type="text"
            value={name}
            onChange={setName}
            placeholder={t("auth.registerNamePlaceholder")}
            accentColor="teal"
          />

          <div>
            <FormField
              label={t("auth.registerEmail")}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder={t("auth.registerEmailPlaceholder")}
              accentColor="teal"
              error={emailCheck && !emailCheck.valid ? emailCheck.error : undefined}
            />
            {emailCheck?.valid && (
              <p className="mt-1.5 text-xs text-[#1D9E75] font-dm">{"✓"}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 font-dm mb-2 block">{t("auth.registerPassword")}</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="w-full bg-[#141420] border border-white/[0.07] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 font-dm transition-all outline-none focus:border-[#1D9E75]/50 focus:ring-1 focus:ring-[#1D9E75]/20"
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
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= passwordStrength ? strengthColors[passwordStrength] : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/30 font-dm">{strengthLabels[passwordStrength]}</span>
              </div>
            )}
          </div>

          <FormField
            label={t("auth.registerPhone")}
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder={t("auth.registerPhonePlaceholder")}
            accentColor="teal"
          />

          <div>
            <label className="text-xs font-medium text-white/50 font-dm mb-2 block">{t("auth.registerCity")}</label>
            <CitySelect
              value={city}
              onChange={setCity}
              placeholder={t("auth.registerCityPlaceholder")}
            />
          </div>

          <button
            onClick={handleStep1}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg font-dm bg-gradient-to-r from-[#1D9E75] to-[#1ABC9C]"
          >
            {t("auth.registerContinue")}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-white/50 font-dm mb-3 block">{t("auth.registerPayment")}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProvider("wave")}
                className={`p-5 rounded-xl border-2 transition-all text-center ${
                  provider === "wave"
                    ? "border-[#1D9E75] bg-[#1D9E75]/10 shadow-lg shadow-[#1D9E75]/10"
                    : "border-white/[0.07] bg-[#111128] hover:border-white/15"
                }`}
              >
                <span className="text-2xl block mb-2">🌊</span>
                <span className="text-sm font-bold font-dm text-white">{t("common.wave")}</span>
              </button>
              <button
                onClick={() => setProvider("orange_money")}
                className={`p-5 rounded-xl border-2 transition-all text-center ${
                  provider === "orange_money"
                    ? "border-[#D35400] bg-[#D35400]/10 shadow-lg shadow-[#D35400]/10"
                    : "border-white/[0.07] bg-[#111128] hover:border-white/15"
                }`}
              >
                <span className="text-2xl block mb-2">🟠</span>
                <span className="text-sm font-bold font-dm text-white">{t("common.orangeMoney")}</span>
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#141420] accent-[#1D9E75] shrink-0"
            />
            <span className="text-xs text-white/40 font-dm leading-relaxed">
              {t("auth.registerTermsLabel")}{" "}
              <Link href="/terms" target="_blank" className="text-[#1D9E75] font-semibold hover:underline">
                {t("auth.registerTermsLink")}
              </Link>
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep(1); setError(""); }}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white/60 bg-[#111128] border border-white/[0.07] hover:bg-white/[0.05] transition-all font-dm"
            >
              {t("auth.registerBack")}
            </button>
            <button
              onClick={handleStep2}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg font-dm bg-gradient-to-r from-[#1D9E75] to-[#1ABC9C]"
            >
              {loading ? "..." : t("auth.registerCreate")}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-white/30 mt-8 font-dm">
        {t("auth.registerHasAccount")}{" "}
        <Link href="/login" className="text-[#1D9E75] font-semibold hover:underline">
          {t("auth.registerLogin")}
        </Link>
      </p>
    </AuthLayout>
  );
}
