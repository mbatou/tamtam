"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SoundWave from "@/components/ui/SoundWave";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleReset() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-mesh">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <span className="text-3xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={5} className="h-5 opacity-60" />
        </Link>

        <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
          {sent ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-center">Email envoyé !</h1>
              <p className="text-sm text-white/40 text-center mb-6">
                Un lien de réinitialisation a été envoyé à <strong className="text-white/60">{email}</strong>.
                Vérifie ta boîte de réception (et les spams).
              </p>
              <Link
                href="/login"
                className="block w-full py-3 rounded-btn font-bold text-white text-center bg-gradient-primary hover:opacity-90 transition"
              >
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Mot de passe oublié ?</h1>
              <p className="text-xs text-white/30 mb-6">
                Entre ton adresse email et nous t&apos;enverrons un lien pour réinitialiser ton mot de passe.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                    onKeyDown={(e) => e.key === "Enter" && !loading && email && handleReset()}
                  />
                </div>
                <button
                  onClick={handleReset}
                  disabled={loading || !email}
                  className="w-full py-3 rounded-btn font-bold text-white bg-gradient-primary disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          <Link href="/login" className="text-primary font-semibold hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
