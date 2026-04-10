"use client";

import { useState, useEffect } from "react";
import { LandingPageFormField } from "@/lib/types";

// ---------------------------------------------------------------------------
// LUP-113: Lead capture form (client component)
// Handles form submission, validation, honeypot timing, and success state.
// ---------------------------------------------------------------------------

interface LeadFormProps {
  landingPageId: string;
  formFields: LandingPageFormField[];
  ctaText: string;
  brandColor: string;
  ref: string | null;
}

export default function LeadForm({ landingPageId, formFields, ctaText, brandColor, ref }: LeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageLoadTs] = useState(() => Date.now());

  // Pre-fill custom field defaults
  useEffect(() => {
    const defaults: Record<string, string> = {};
    formFields.forEach((f) => {
      if (f.type !== "phone" && f.type !== "email") {
        defaults[f.label] = "";
      }
    });
    setCustomFields(defaults);
  }, [formFields]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Veuillez accepter les conditions pour continuer.");
      return;
    }

    // Basic phone validation
    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^(\+221)?(7[0-8])\d{7}$/.test(cleanPhone)) {
      setError("Numero de telephone senegalais invalide (ex: 77 123 45 67)");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landing_page_id: landingPageId,
          name: name.trim(),
          phone: cleanPhone.startsWith("+221") ? cleanPhone : `+221${cleanPhone}`,
          email: email.trim() || null,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
          consent_given: true,
          ref: ref || undefined,
          page_load_ts: pageLoadTs,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'envoi. Reessayez.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Erreur de connexion. Verifiez votre internet.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColor + "20" }}>
          <svg className="w-8 h-8" style={{ color: brandColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Merci!</h2>
        <p className="text-gray-300 text-sm">Votre demande a ete envoyee avec succes. Nous vous contacterons bientot.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name field (always required) */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5">Nom complet *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-opacity-100 transition-colors"
          style={{ focusBorderColor: brandColor } as React.CSSProperties}
          placeholder="Votre nom"
        />
      </div>

      {/* Phone field (always required) */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5">Telephone *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-opacity-100 transition-colors"
          placeholder="77 123 45 67"
        />
      </div>

      {/* Dynamic form fields */}
      {formFields.map((field) => {
        if (field.type === "phone") return null; // handled above
        if (field.type === "email") {
          return (
            <div key={field.label}>
              <label className="block text-gray-300 text-sm mb-1.5">
                {field.label} {field.required && "*"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={field.required}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-opacity-100 transition-colors"
                placeholder="email@exemple.com"
              />
            </div>
          );
        }
        if (field.type === "select" && field.options) {
          return (
            <div key={field.label}>
              <label className="block text-gray-300 text-sm mb-1.5">
                {field.label} {field.required && "*"}
              </label>
              <select
                value={customFields[field.label] || ""}
                onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))}
                required={field.required}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-opacity-100 transition-colors"
              >
                <option value="" className="bg-gray-800">Choisir...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt} className="bg-gray-800">{opt}</option>
                ))}
              </select>
            </div>
          );
        }
        // text field
        return (
          <div key={field.label}>
            <label className="block text-gray-300 text-sm mb-1.5">
              {field.label} {field.required && "*"}
            </label>
            <input
              type="text"
              value={customFields[field.label] || ""}
              onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))}
              required={field.required}
              maxLength={500}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-opacity-100 transition-colors"
            />
          </div>
        );
      })}

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-white/30 bg-white/10"
        />
        <span className="text-gray-400 text-xs leading-relaxed">
          J&apos;accepte que mes informations soient utilisees pour etre contacte au sujet de cette offre. *
        </span>
      </label>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50"
        style={{
          backgroundColor: brandColor,
          boxShadow: `0 4px 14px ${brandColor}40`,
        }}
      >
        {submitting ? "Envoi en cours..." : ctaText}
      </button>
    </form>
  );
}
