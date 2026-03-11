"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+221");
  const [city, setCity] = useState("");
  const [provider, setProvider] = useState<"wave" | "orange_money" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleStep1() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Remplis tous les champs obligatoires.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleStep2() {
    if (!provider) {
      setError("Choisis un moyen de paiement.");
      return;
    }
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        role: "echo",
        name,
        phone: phone.length > 4 ? phone : null,
        city: city || null,
        mobile_money_provider: provider,
      });
      if (insertError) {
        setError(insertError.message);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-10">
          <span className="text-3xl font-black gradient-text">Tamtam</span>
        </Link>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s
                    ? "bg-gradient-primary text-white"
                    : "bg-white/5 text-white/30"
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div className={`w-12 h-0.5 ${step > 1 ? "bg-primary" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-2">Deviens un Écho</h1>
          <p className="text-sm text-white/40 mb-6">
            {step === 1
              ? "Dis-nous qui tu es"
              : "Comment veux-tu recevoir tes gains ?"}
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
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Moussa Diallo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="moussa@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 77 123 45 67"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Dakar"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <button onClick={handleStep1} className="btn-primary w-full text-center">
                Continuer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-3">
                  Moyen de paiement *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProvider("wave")}
                    className={`p-4 rounded-xl border-2 transition text-center ${
                      provider === "wave"
                        ? "border-primary bg-primary/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl block mb-1">🌊</span>
                    <span className="text-sm font-bold">Wave</span>
                  </button>
                  <button
                    onClick={() => setProvider("orange_money")}
                    className={`p-4 rounded-xl border-2 transition text-center ${
                      provider === "orange_money"
                        ? "border-primary bg-primary/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl block mb-1">🟠</span>
                    <span className="text-sm font-bold">Orange Money</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(""); }}
                  className="btn-outline flex-1 text-center"
                >
                  Retour
                </button>
                <button
                  onClick={handleStep2}
                  disabled={loading}
                  className="btn-primary flex-1 text-center disabled:opacity-50"
                >
                  {loading ? "..." : "Créer mon compte"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
