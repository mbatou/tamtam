"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SoundWave from "@/components/ui/SoundWave";
import ProgressBar from "@/components/ui/ProgressBar";
import CitySelect from "@/components/ui/CitySelect";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

export default function RegisterPage() {
  return <Suspense><RegisterPageContent /></Suspense>;
}

function RegisterPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+221");
  const [city, setCity] = useState("");
  const [provider, setProvider] = useState<"wave" | "orange_money" | "">("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleStep1() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError(t("auth.registerFillAll"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.registerPasswordMin"));
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
      // If user already exists in auth, try signing in instead
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
      // Use server-side API to create profile (bypasses RLS issues when session isn't ready)
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

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-mesh">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={180} height={48} priority className="h-12 w-auto" />
          <SoundWave bars={5} className="h-5 opacity-60" />
        </Link>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s
                      ? "bg-gradient-primary text-white shadow-lg"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
              </div>
            ))}
          </div>
          <ProgressBar value={step} max={2} />
        </div>

        <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
          <h1 className="text-2xl font-bold mb-2">{t("auth.registerTitle")}</h1>
          <p className="text-sm text-white/40 mb-6">
            {step === 1
              ? t("auth.registerStep1")
              : t("auth.registerStep2")}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  {t("auth.registerName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.registerNamePlaceholder")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  {t("auth.registerEmail")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.registerEmailPlaceholder")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  {t("auth.registerPassword")}
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
                  {t("auth.registerPhone")}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("auth.registerPhonePlaceholder")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  {t("auth.registerCity")}
                </label>
                <CitySelect
                  value={city}
                  onChange={setCity}
                  placeholder={t("auth.registerCityPlaceholder")}
                />
              </div>
              <button onClick={handleStep1} className="btn-primary w-full text-center">
                {t("auth.registerContinue")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-3">
                  {t("auth.registerPayment")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProvider("wave")}
                    className={`p-5 rounded-xl border-2 transition-all text-center ${
                      provider === "wave"
                        ? "border-[#1ABC9C] bg-[#1ABC9C]/10 shadow-lg"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <span className="text-3xl block mb-2">🌊</span>
                    <span className="text-sm font-bold">{t("common.wave")}</span>
                  </button>
                  <button
                    onClick={() => setProvider("orange_money")}
                    className={`p-5 rounded-xl border-2 transition-all text-center ${
                      provider === "orange_money"
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <span className="text-3xl block mb-2">🟠</span>
                    <span className="text-sm font-bold">{t("common.orangeMoney")}</span>
                  </button>
                </div>
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-primary shrink-0"
                />
                <span className="text-xs text-white/50">
                  {t("auth.registerTermsLabel")}{" "}
                  <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                    {t("auth.registerTermsLink")}
                  </Link>
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(""); }}
                  className="btn-outline flex-1 text-center"
                >
                  {t("auth.registerBack")}
                </button>
                <button
                  onClick={handleStep2}
                  disabled={loading}
                  className="btn-primary flex-1 text-center disabled:opacity-50"
                >
                  {loading ? "..." : t("auth.registerCreate")}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          {t("auth.registerHasAccount")}{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            {t("auth.registerLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
