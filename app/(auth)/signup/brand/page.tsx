"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GoogleButton from "@/components/ui/GoogleButton";
import AuthLayout from "@/components/auth/AuthLayout";
import FormField from "@/components/auth/FormField";
import { trackEvent } from "@/lib/analytics";
import { validateEmailDomain, type EmailValidationResult } from "@/lib/email-validation";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPw, setShowPw] = useState(false);
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

  const passwordStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ["", "bg-red-500", "bg-yellow-500", "bg-[#1D9E75]"];
  const strengthLabels = ["", "Faible", "Moyen", "Fort"];

  const panel = (
    <div className="space-y-10 text-center">
      <div>
        <h2 className="text-3xl font-bold font-syne tracking-tight text-white mb-3">
          Votre audience,
          <br />
          <span className="gradient-text">amplifiée.</span>
        </h2>
        <p className="text-sm text-white/40 font-dm leading-relaxed max-w-xs mx-auto">
          Lancez des campagnes de bouche-à-oreille et ne payez que pour les vrais clics.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
        <p className="text-xs text-white/30 font-dm mb-4">Pourquoi les marques choisissent Tamtam</p>
        <div className="space-y-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D35400]/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-[#D35400]">1</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-dm">Pay-per-click</p>
              <p className="text-xs text-white/35 font-dm">Ne payez que pour les vrais clics. Pas d&apos;impressions vides.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D35400]/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-[#D35400]">2</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-dm">Réseau social</p>
              <p className="text-xs text-white/35 font-dm">Touchez votre audience via les réseaux sociaux les plus populaires.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D35400]/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-[#D35400]">3</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-dm">Tableau de bord</p>
              <p className="text-xs text-white/35 font-dm">Suivez clics, conversions et ROI en temps réel.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <p className="text-2xl font-bold font-syne text-white">500+</p>
          <p className="text-xs text-white/30 font-dm">Campagnes</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-2xl font-bold font-syne text-white">2 500+</p>
          <p className="text-xs text-white/30 font-dm">Échos actifs</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-2xl font-bold font-syne text-white">50 FCFA</p>
          <p className="text-xs text-white/30 font-dm">CPC moyen</p>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout panel={panel} accentColor="orange">
      {teamInviteId && (
        <div className="bg-[#D35400]/10 border border-[#D35400]/30 rounded-xl p-4 mb-5 text-center">
          <span className="text-[#D35400] font-bold font-dm text-sm">Vous avez été invité à rejoindre une équipe!</span>
          <span className="text-white/40 text-xs block mt-1 font-dm">
            Créez votre compte pour accéder au tableau de bord de l&apos;équipe.
          </span>
        </div>
      )}

      <h1 className="text-2xl font-bold font-syne tracking-tight text-white mb-1">
        Créer votre compte Marque
      </h1>
      <p className="text-sm text-white/35 font-dm mb-7">
        Lancez votre première campagne en quelques minutes.
      </p>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-dm">
          {error}
        </div>
      )}

      <GoogleButton role="batteur" label="S'inscrire avec Google" className="mb-5" />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-xs text-white/25 font-dm">ou par email</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nom de l'entreprise"
          type="text"
          value={form.companyName}
          onChange={(v) => update("companyName", v)}
          placeholder="Ex: Boutique Dakar"
          accentColor="orange"
        />

        <FormField
          label="Nom du contact"
          type="text"
          value={form.name}
          onChange={(v) => update("name", v)}
          placeholder="Votre nom complet"
          accentColor="orange"
        />

        <div>
          <FormField
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            placeholder="contact@entreprise.sn"
            accentColor="orange"
            error={emailCheck && !emailCheck.valid ? emailCheck.error : undefined}
          />
          {emailCheck?.valid && (
            <p className="mt-1.5 text-xs text-[#1D9E75] font-dm">{"✓"}</p>
          )}
        </div>

        <FormField
          label="Téléphone / WhatsApp"
          type="tel"
          value={form.phone}
          onChange={(v) => update("phone", v)}
          placeholder="+221 7X XXX XX XX"
          accentColor="orange"
        />

        <div>
          <label className="text-xs font-medium text-white/50 font-dm mb-2 block">Mot de passe</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full bg-[#141420] border border-white/[0.07] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 font-dm transition-all outline-none focus:border-[#D35400]/50 focus:ring-1 focus:ring-[#D35400]/20"
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
          {form.password.length > 0 && (
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
          label="Confirmer le mot de passe"
          type="password"
          value={form.confirmPassword}
          onChange={(v) => update("confirmPassword", v)}
          placeholder="Confirmez votre mot de passe"
          accentColor="orange"
        />

        <label className="flex items-start gap-3 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#141420] accent-[#D35400] shrink-0"
          />
          <span className="text-xs text-white/40 leading-relaxed font-dm">
            J&apos;accepte les{" "}
            <Link href="/terms" target="_blank" className="text-[#D35400] hover:text-[#F39C12] underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/privacy" target="_blank" className="text-[#D35400] hover:text-[#F39C12] underline">
              politique de confidentialité
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !acceptedTerms}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg font-dm bg-gradient-to-r from-[#D35400] to-[#F39C12]"
        >
          {loading ? "Envoi du code..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-sm text-white/30 mt-8 font-dm">
        Déjà inscrit?{" "}
        <Link href="/login?tab=batteur" className="text-[#D35400] font-semibold hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
