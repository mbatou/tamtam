"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"echo" | "batteur">("echo");
  const [echoEmail, setEchoEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleEchoLogin() {
    setLoading(true);
    setError("");

    if (!otpSent) {
      const { error } = await supabase.auth.signInWithOtp({ email: echoEmail });
      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
      }
    } else {
      const { error } = await supabase.auth.verifyOtp({
        email: echoEmail,
        token: otp,
        type: "email",
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  }

  async function handleBatteurLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/admin/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-10">
          <span className="text-3xl font-black gradient-text">Tamtam</span>
        </Link>

        {/* Mode toggle */}
        <div className="flex mb-8 glass-card p-1">
          <button
            onClick={() => { setMode("echo"); setError(""); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
              mode === "echo" ? "bg-gradient-primary text-white" : "text-white/40"
            }`}
          >
            Écho
          </button>
          <button
            onClick={() => { setMode("batteur"); setError(""); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
              mode === "batteur" ? "bg-gradient-secondary text-white" : "text-white/40"
            }`}
          >
            Batteur
          </button>
        </div>

        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">
            {mode === "echo" ? "Connexion Écho" : "Connexion Batteur"}
          </h1>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {mode === "echo" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={echoEmail}
                  onChange={(e) => setEchoEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  disabled={otpSent}
                />
              </div>

              {otpSent && (
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">
                    Code OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] focus:outline-none focus:border-primary transition"
                  />
                </div>
              )}

              <button
                onClick={handleEchoLogin}
                disabled={loading}
                className="btn-primary w-full text-center disabled:opacity-50"
              >
                {loading
                  ? "Chargement..."
                  : otpSent
                  ? "Vérifier le code"
                  : "Envoyer le code"}
              </button>

              {otpSent && (
                <button
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-white/30 hover:text-white/50 transition w-full text-center"
                >
                  Renvoyer le code
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@marque.sn"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                />
              </div>
              <button
                onClick={handleBatteurLogin}
                disabled={loading}
                className="w-full py-3 rounded-btn font-bold text-white bg-gradient-secondary disabled:opacity-50 transition hover:opacity-90"
              >
                {loading ? "Chargement..." : "Se connecter"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          {mode === "echo" ? (
            <>
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Deviens un Écho
              </Link>
            </>
          ) : (
            <>
              Contactez-nous pour créer un compte Batteur
            </>
          )}
        </p>
      </div>
    </div>
  );
}
