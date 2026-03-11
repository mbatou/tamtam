"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"echo" | "batteur">("echo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push(mode === "echo" ? "/dashboard" : "/admin/dashboard");
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

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "echo" ? "votre@email.com" : "contact@marque.sn"}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                  mode === "echo" ? "focus:border-primary" : "focus:border-secondary"
                }`}
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
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                  mode === "echo" ? "focus:border-primary" : "focus:border-secondary"
                }`}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition hover:opacity-90 ${
                mode === "echo" ? "bg-gradient-primary" : "bg-gradient-secondary"
              }`}
            >
              {loading ? "Chargement..." : "Se connecter"}
            </button>
          </div>
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
