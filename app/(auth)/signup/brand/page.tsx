"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SoundWave from "@/components/ui/SoundWave";
import GoogleButton from "@/components/ui/GoogleButton";
import { trackEvent } from "@/lib/analytics";
import { validateEmailDomain, type EmailValidationResult } from "@/lib/email-validation";

export default function BrandSignupPage() {
  return (
    <Suspense>
      <BrandSignupContent />
    </Suspense>
  );
}

function BrandSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    companyName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refCode, setRefCode] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [teamInviteId, setTeamInviteId] = useState<string | null>(null);
  const [emailCheck, setEmailCheck] = useState<EmailValidationResult | null>(null);
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    const atIdx = form.email.indexOf("@");
    if (atIdx === -1 || form.email.length - atIdx < 4) {
      setEmailCheck(null);
      return;
    }
    emailDebounceRef.current = setTimeout(() => {
      setEmailCheck(validateEmailDomain(form.email));
    }, 300);
    return () => { if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current); };
  }, [form.email]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("tamtam_ref", ref);
      setRefCode(ref);
    } else {
      const stored = localStorage.getItem("tamtam_ref");
      if (stored) setRefCode(stored);
    }

    const teamInvite = searchParams.get("team_invite");
    if (teamInvite) {
      localStorage.setItem("tamtam_team_invite", teamInvite);
      setTeamInviteId(teamInvite);
    } else {
      const stored = localStorage.getItem("tamtam_team_invite");
      if (stored) setTeamInviteId(stored);
    }
  }, [searchParams]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.companyName || !form.name || !form.email || !form.phone || !form.password) {
      setError("Tous les champs sont requis.");
      return;
    }
    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    const domainCheck = validateEmailDomain(form.email);
    if (!domainCheck.valid) {
      setError(domainCheck.error || "Adresse email invalide.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, referralCode: refCode, termsAcceptedAt: new Date().toISOString() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi du code.");
        setLoading(false);
        return;
      }

      trackEvent.brandSignup(refCode || undefined);
      const inviteParam = teamInviteId ? `&team_invite=${teamInviteId}` : "";
      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}${inviteParam}`);
    } catch {
      setError("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-mesh">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={180} height={48} priority className="h-12 w-auto" />
          <SoundWave bars={5} className="h-5 opacity-60" />
        </Link>

        <div className="glass-card p-8 animate-slide-up" style={{ opacity: 0 }}>
          <h1 className="text-2xl font-bold mb-2">Créer votre compte Marque</h1>
          <p className="text-xs text-white/30 mb-6">
            Lancez votre première campagne en quelques minutes.
          </p>

          {teamInviteId && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4 text-center">
              <span className="text-orange-400 font-bold">Vous avez été invité à rejoindre une équipe!</span>
              <span className="text-gray-400 text-sm block mt-1">
                Créez votre compte pour accéder au tableau de bord de l&apos;équipe.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <GoogleButton role="batteur" label="S'inscrire avec Google" className="mb-4" />

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Nom de l&apos;entreprise</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Ex: Boutique Dakar"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Nom du contact</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Votre nom complet"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="contact@entreprise.sn"
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                  emailCheck === null ? "border-white/10 focus:border-secondary" :
                  emailCheck.valid ? "border-green-500/30" :
                  emailCheck.suggestion ? "border-orange-500/30" : "border-red-500/30"
                }`}
              />
              {emailCheck && !emailCheck.valid && emailCheck.suggestion && (
                <button
                  type="button"
                  onClick={() => {
                    const localPart = form.email.split("@")[0];
                    update("email", `${localPart}@${emailCheck.suggestion}`);
                    setEmailCheck({ valid: true });
                  }}
                  className="mt-1.5 text-xs text-orange-400 hover:text-orange-300 transition"
                >
                  Vouliez-vous dire <span className="font-bold underline">@{emailCheck.suggestion}</span> ?
                </button>
              )}
              {emailCheck && !emailCheck.valid && !emailCheck.suggestion && (
                <p className="mt-1.5 text-xs text-red-400">{emailCheck.error}</p>
              )}
              {emailCheck?.valid && (
                <p className="mt-1.5 text-xs text-green-400">✓</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Téléphone / WhatsApp</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+221 7X XXX XX XX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Minimum 6 caractères"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Confirmer le mot de passe</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-secondary shrink-0"
              />
              <span className="text-xs text-white/40 leading-relaxed">
                J&apos;accepte les{" "}
                <Link href="/terms" target="_blank" className="text-secondary/70 hover:text-secondary underline">
                  conditions d&apos;utilisation
                </Link>{" "}
                et la{" "}
                <Link href="/privacy" target="_blank" className="text-secondary/70 hover:text-secondary underline">
                  politique de confidentialité
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full py-3 rounded-btn font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-secondary"
            >
              {loading ? "Envoi du code..." : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-xs text-white/20 mt-4">
            Déjà inscrit?{" "}
            <Link href="/login?tab=batteur" className="text-secondary/60 hover:text-secondary transition">
              Se connecter →
            </Link>
          </p>
        </div>

        <p className="text-center mt-4">
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
