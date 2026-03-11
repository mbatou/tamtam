"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SoundWave from "@/components/ui/SoundWave";

export default function LoginPage() {
  const [mode, setMode] = useState<"echo" | "batteur">("echo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      setLoading(false);
      return;
    }

    // Verify session is actually set
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Connexion réussie mais la session n'a pas été créée. Vérifiez la configuration Supabase.");
      setLoading(false);
      return;
    }

    // Verify user exists in users table
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (dbError || !dbUser) {
      setError(`Compte auth OK mais profil introuvable dans la base. (${dbError?.message || "Aucun enregistrement"})`);
      setLoading(false);
      return;
    }

    // Check role matches the selected mode
    if (mode === "batteur" && !["admin", "superadmin"].includes(dbUser.role)) {
      setError(`Votre rôle est "${dbUser.role}", pas admin/superadmin. Essayez le mode Écho.`);
      setLoading(false);
      return;
    }
    if (mode === "echo" && dbUser.role !== "echo") {
      setError(`Votre rôle est "${dbUser.role}", pas écho. Essayez le mode Batteur.`);
      setLoading(false);
      return;
    }

    window.location.href = mode === "echo" ? "/dashboard" : "/admin/dashboard";
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
            Écho
          </button>
          <button
            onClick={() => { setMode("batteur"); setError(""); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              mode === "batteur" ? "bg-gradient-secondary text-white shadow-lg" : "text-white/40"
            }`}
          >
            Batteur
          </button>
        </div>

        <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
          <h1 className="text-2xl font-bold mb-2">
            {mode === "echo" ? "Connexion Écho" : "Connexion Batteur"}
          </h1>
          <p className="text-xs text-white/30 mb-6">
            {mode === "echo"
              ? "Utilise ton email pour te connecter"
              : "Accède à ton espace marque"
            }
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
              className={`w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg ${
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
