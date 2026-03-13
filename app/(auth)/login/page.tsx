"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SoundWave from "@/components/ui/SoundWave";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"echo" | "batteur">("echo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  // Lead form state
  const [leadForm, setLeadForm] = useState({
    business_name: "", contact_name: "", email: "", whatsapp: "", message: "",
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Read tab query param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "batteur") setMode("batteur");
  }, [searchParams]);

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

    window.location.href = mode === "echo" ? "/dashboard" : "/admin/dashboard";
  }

  async function handleLeadSubmit() {
    setLeadSubmitting(true);
    setLeadError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || "Erreur";
        if (data.details) {
          const fields = Object.entries(data.details)
            .map(([, v]) => (v as string[]).join(", "))
            .join("; ");
          if (fields) msg = fields;
        }
        setLeadError(msg);
      } else {
        setLeadSuccess(true);
      }
    } catch {
      setLeadError("Erreur réseau. Réessaie.");
    }
    setLeadSubmitting(false);
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

        {/* ECHO LOGIN */}
        {mode === "echo" && (
          <>
            <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-2">Connexion Écho</h1>
              <p className="text-xs text-white/30 mb-6">
                Utilise ton email pour te connecter
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-white/40">Mot de passe</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-primary"
                >
                  {loading ? "Chargement..." : "Se connecter"}
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-white/30 mt-6">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Deviens un Écho
              </Link>
            </p>
          </>
        )}

        {/* BATTEUR — EXISTING ACCOUNT LOGIN */}
        {mode === "batteur" && !leadSuccess && (
          <>
            <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-2">Connexion Batteur</h1>
              <p className="text-xs text-white/30 mb-6">
                Accède à ton espace marque
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2">Email</label>
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
                    <label className="text-xs font-semibold text-white/40">Mot de passe</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-secondary"
                >
                  {loading ? "Chargement..." : "Se connecter"}
                </button>
              </div>
            </div>

            {/* LEAD CAPTURE FORM */}
            <div className="glass-card p-8 mt-6">
              <div className="text-center mb-6">
                <p className="text-2xl mb-2">🥁</p>
                <h2 className="text-lg font-bold mb-2">Tu es une marque ?</h2>
                <p className="text-xs text-white/40 leading-relaxed">
                  Tamtam connecte ta marque avec des centaines d&apos;ambassadeurs qui partagent ton message. Tu ne paies que pour les vrais clics.
                </p>
              </div>

              {leadError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {leadError}
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  value={leadForm.business_name}
                  onChange={(e) => setLeadForm({ ...leadForm, business_name: e.target.value })}
                  placeholder="Nom de l'entreprise ou marque"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                />
                <input
                  type="text"
                  value={leadForm.contact_name}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                  placeholder="Ton nom complet"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                />
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  placeholder="Email professionnel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                />
                <input
                  type="tel"
                  value={leadForm.whatsapp}
                  onChange={(e) => setLeadForm({ ...leadForm, whatsapp: e.target.value })}
                  placeholder="Numéro WhatsApp (ex: 77 123 45 67)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
                />
                <textarea
                  value={leadForm.message}
                  onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                  placeholder="Dis-nous en plus sur ta marque et ce que tu veux promouvoir..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition resize-none"
                />
                <button
                  onClick={handleLeadSubmit}
                  disabled={leadSubmitting || !leadForm.business_name || !leadForm.contact_name || !leadForm.email}
                  className="w-full py-3 rounded-btn font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-secondary"
                >
                  {leadSubmitting ? "Envoi en cours..." : "🥁 Devenir un Batteur"}
                </button>
              </div>
              <p className="text-center text-xs text-white/20 mt-3">
                On te recontacte sous 24h.
              </p>
            </div>
          </>
        )}

        {/* BATTEUR — LEAD SUCCESS STATE */}
        {mode === "batteur" && leadSuccess && (
          <div className="glass-card p-8 animate-slide-up text-center" style={{ opacity: 0 }}>
            <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Merci {leadForm.contact_name} !</h2>
            <p className="text-sm text-white/40 mb-4">
              On a bien reçu ta demande pour <span className="text-white/70 font-semibold">{leadForm.business_name}</span>.
              Notre équipe te recontacte sous 24h par email ou WhatsApp.
            </p>
            <Link href="/#pour-les-marques" className="text-sm text-secondary font-semibold hover:underline">
              Découvre comment Tamtam fonctionne →
            </Link>
          </div>
        )}

        <p className="text-center mt-4">
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
