"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SoundWave from "@/components/ui/SoundWave";

export default function VerifyOTPPage() {
  return (
    <Suspense>
      <VerifyOTPContent />
    </Suspense>
  );
}

function VerifyOTPContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5 && newDigits.every((d) => d)) {
      verifyCode(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      const newDigits = text.split("");
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      verifyCode(text);
    }
  }

  async function verifyCode(code: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code invalide.");
        setLoading(false);
        return;
      }

      // Account created successfully — redirect to login
      const bonusParam = data.welcomeBonusApplied ? "&bonus=true" : "";
      window.location.href = `/login?tab=batteur&verified=true${bonusParam}`;
    } catch {
      setError("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors du renvoi.");
      } else {
        setResendCooldown(60);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Erreur réseau.");
    }
    setResending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-mesh">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <span className="text-3xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={5} className="h-5 opacity-60" />
        </Link>

        <div className="glass-card p-8 text-center animate-slide-up" style={{ opacity: 0 }}>
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Vérifiez votre email</h1>
          <p className="text-sm text-white/40 mb-6">
            Un code à 6 chiffres a été envoyé à{" "}
            <span className="text-white font-semibold">{email}</span>
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 6-digit input */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-secondary transition"
                disabled={loading}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-white/40">
              <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              Vérification en cours...
            </div>
          )}

          {/* Resend button */}
          <div className="mt-4">
            {resendCooldown > 0 ? (
              <p className="text-xs text-white/30">
                Renvoyer le code dans {resendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-secondary font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? "Renvoi en cours..." : "Renvoyer le code"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center mt-4">
          <Link href="/signup/brand" className="text-xs text-white/30 hover:text-white/50 transition">
            ← Modifier mes informations
          </Link>
        </p>
      </div>
    </div>
  );
}
