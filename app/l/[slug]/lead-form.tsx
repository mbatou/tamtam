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
  accentColor: string;
  ref: string | null;
}

export default function LeadForm({ landingPageId, formFields, ctaText, brandColor, accentColor, ref }: LeadFormProps) {
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

  const inputClasses = "w-full px-4 py-3 rounded-xl text-white placeholder-white/30 focus:outline-none transition-all duration-200";

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: `${brandColor}20`, border: `2px solid ${brandColor}40` }}
        >
          <svg className="w-10 h-10" style={{ color: brandColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Merci!</h2>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
          Votre demande a ete envoyee avec succes.<br />Nous vous contacterons bientot.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name field (always required) */}
      <div>
        <label className="block text-sm mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Nom complet *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          className={inputClasses}
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: `1.5px solid rgba(255,255,255,0.12)`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = `${brandColor}80`; e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColor}15`; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
          placeholder="Votre nom"
        />
      </div>

      {/* Phone field (always required) */}
      <div>
        <label className="block text-sm mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Telephone *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className={inputClasses}
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: `1.5px solid rgba(255,255,255,0.12)`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = `${brandColor}80`; e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColor}15`; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
          placeholder="77 123 45 67"
        />
      </div>

      {/* Dynamic form fields */}
      {formFields.map((field) => {
        if (field.type === "phone") return null; // handled above
        if (field.type === "email") {
          return (
            <div key={field.label}>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                {field.label} {field.required && "*"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={field.required}
                className={inputClasses}
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: `1.5px solid rgba(255,255,255,0.12)`,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = `${brandColor}80`; e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColor}15`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
                placeholder="email@exemple.com"
              />
            </div>
          );
        }
        if (field.type === "select" && field.options) {
          return (
            <div key={field.label}>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                {field.label} {field.required && "*"}
              </label>
              <select
                value={customFields[field.label] || ""}
                onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))}
                required={field.required}
                className={inputClasses}
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: `1.5px solid rgba(255,255,255,0.12)`,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = `${brandColor}80`; e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColor}15`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <option value="" style={{ backgroundColor: accentColor }}>Choisir...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt} style={{ backgroundColor: accentColor }}>{opt}</option>
                ))}
              </select>
            </div>
          );
        }
        // text field
        return (
          <div key={field.label}>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              {field.label} {field.required && "*"}
            </label>
            <input
              type="text"
              value={customFields[field.label] || ""}
              onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))}
              required={field.required}
              maxLength={500}
              className={inputClasses}
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: `1.5px solid rgba(255,255,255,0.12)`,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${brandColor}80`; e.currentTarget.style.boxShadow = `0 0 0 3px ${brandColor}15`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
        );
      })}

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer group pt-1">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="sr-only"
          />
          <div
            className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
            style={{
              borderColor: consent ? brandColor : "rgba(255,255,255,0.2)",
              backgroundColor: consent ? brandColor : "transparent",
            }}
          >
            {consent && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          J&apos;accepte que mes informations soient utilisees pour etre contacte au sujet de cette offre. *
        </span>
      </label>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
          boxShadow: `0 6px 20px ${brandColor}30`,
        }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Envoi en cours...
          </span>
        ) : ctaText}
      </button>
    </form>
  );
}
