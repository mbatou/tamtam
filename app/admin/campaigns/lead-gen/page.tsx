"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BRAND_INDUSTRIES } from "@/lib/validations";
import { LEAD_GEN_SETUP_FEE_FCFA, LEAD_GEN_MIN_BUDGET_FCFA } from "@/lib/constants";
import { formatFCFA } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import type { LandingPageFormField } from "@/lib/types";

// ---------------------------------------------------------------------------
// LUP-113: Lead Generation Campaign Creation Form
// Multi-step: Brand info → Form config → Budget → Confirmation
// ---------------------------------------------------------------------------

type Step = "brand" | "form" | "budget" | "confirm";

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: "Restaurant / Alimentation",
  mode_beaute: "Mode & Beaute",
  immobilier: "Immobilier",
  education: "Education / Formation",
  sante: "Sante",
  technologie: "Technologie",
  transport: "Transport / Logistique",
  commerce: "Commerce",
  services: "Services",
  evenementiel: "Evenementiel",
  autre: "Autre",
};

export default function LeadGenCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("brand");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brand info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandIndustry, setBrandIndustry] = useState<string>("commerce");
  const [brandColor, setBrandColor] = useState("#D35400");
  const [brandAccentColor, setBrandAccentColor] = useState("#1a1a2e");
  const [logoUrl, setLogoUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [campaignDescForAi, setCampaignDescForAi] = useState("");

  // Creative uploads (campaign banner)
  const [creativeUrls, setCreativeUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [formFields, setFormFields] = useState<LandingPageFormField[]>([
    { label: "Email", type: "email", required: false },
  ]);

  // Budget
  const [cpc, setCpc] = useState("25");
  const [cpl, setCpl] = useState("500");
  const [budget, setBudget] = useState("15000");

  // Notifications
  const [notifPhone, setNotifPhone] = useState("");
  const [notifEmail, setNotifEmail] = useState("");

  // Save as draft flag
  const [asDraft, setAsDraft] = useState(false);

  function addField() {
    if (formFields.length >= 5) return;
    setFormFields([...formFields, { label: "", type: "text", required: false }]);
  }

  function removeField(index: number) {
    setFormFields(formFields.filter((_, i) => i !== index));
  }

  function updateField(index: number, updates: Partial<LandingPageFormField>) {
    setFormFields(formFields.map((f, i) => i === index ? { ...f, ...updates } : f));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      const res = await fetch("/api/campaigns/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setCreativeUrls((prev) => [...prev, data.url]);
      } else {
        setError(data.error || "Erreur lors du telechargement");
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(draft = false) {
    setSubmitting(true);
    setError(null);
    setAsDraft(draft);

    try {
      const payload = {
        title,
        description: description || null,
        destination_url: destinationUrl,
        cpc: Number(cpc),
        cost_per_lead_fcfa: Number(cpl),
        budget: Number(budget),
        brand_name: brandName,
        brand_industry: brandIndustry,
        brand_color: brandColor,
        brand_accent_color: brandAccentColor,
        logo_url: logoUrl || null,
        target_audience: targetAudience,
        campaign_description_for_ai: campaignDescForAi,
        form_fields: formFields.filter((f) => f.label.trim()),
        notification_phone: notifPhone || null,
        notification_email: notifEmail || null,
        creative_urls: creativeUrls,
        save_as_draft: draft,
      };

      const res = await fetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        let errMsg = data.error || "Erreur lors de la creation";
        if (data.details) {
          const fields = Object.entries(data.details)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          if (fields) errMsg += ` (${fields})`;
        }
        setError(errMsg);
        setSubmitting(false);
        return;
      }

      if (!draft) {
        trackEvent.brandCreateCampaign(Number(budget), Number(cpc));
      }

      router.push("/admin/campaigns");
    } catch {
      setError("Erreur de connexion. Verifiez votre internet.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalCost = Number(budget) + LEAD_GEN_SETUP_FEE_FCFA;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.push("/admin/campaigns")} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Retour aux campagnes
      </button>

      <h1 className="text-2xl font-bold mb-2">Campagne Generation de Leads</h1>
      <p className="text-white/40 text-sm mb-6">Creez une landing page avec formulaire pour collecter des prospects qualifies.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["brand", "form", "budget", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition ${
                step === s ? "bg-purple-500 text-white" : "bg-white/10 text-white/40"
              }`}
            >
              {i + 1}
            </button>
            {i < 3 && <div className="w-8 h-0.5 bg-white/10" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Brand Info */}
      {step === "brand" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Informations de la campagne</h2>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Titre de la campagne *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Offre speciale rentrée" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Nom de la marque *</label>
            <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Votre nom de marque" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Secteur d&apos;activite *</label>
              <select value={brandIndustry} onChange={(e) => setBrandIndustry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition">
                {BRAND_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{INDUSTRY_LABELS[ind] || ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Couleur principale *</label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition font-mono" placeholder="#D35400" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Couleur secondaire *</label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandAccentColor} onChange={(e) => setBrandAccentColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                <input type="text" value={brandAccentColor} onChange={(e) => setBrandAccentColor(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition font-mono" placeholder="#1a1a2e" />
              </div>
              <p className="text-xs text-white/30 mt-1">Fond de la landing page</p>
            </div>
            <div className="flex items-end">
              <div className="w-full h-12 rounded-xl border border-white/10 overflow-hidden flex">
                <div className="flex-1" style={{ backgroundColor: brandColor }} />
                <div className="flex-1" style={{ backgroundColor: brandAccentColor }} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">URL de destination (site web) *</label>
            <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://votresite.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">URL du logo (optionnel)</label>
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
          </div>
          {/* Campaign banner upload */}
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Banniere de campagne (pour la promotion)</label>
            <div className="flex flex-wrap gap-3 mb-2">
              {creativeUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`Banner ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                  <button onClick={() => setCreativeUrls((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">x</button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/50 hover:border-white/40 transition cursor-pointer">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[10px]">Ajouter</span>
                  </>
                )}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleUpload} className="hidden" />
            <p className="text-xs text-white/30">Image utilisee par les Echos pour promouvoir votre campagne sur WhatsApp Status</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Audience cible *</label>
            <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Ex: Jeunes professionnels de Dakar, 25-35 ans, interesses par..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Description pour l&apos;IA (ce que vous offrez) *</label>
            <textarea value={campaignDescForAi} onChange={(e) => setCampaignDescForAi(e.target.value)} placeholder="Decrivez votre offre, produit ou service en detail pour generer le contenu de la landing page..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Description (optionnel)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description interne de la campagne" rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none" />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setStep("form")} className="btn-primary px-6 py-2.5">Suivant</button>
          </div>
        </div>
      )}

      {/* STEP 2: Form Fields */}
      {step === "form" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Configuration du formulaire</h2>
          <p className="text-white/40 text-xs mb-4">Les champs Nom et Telephone sont inclus automatiquement. Ajoutez jusqu&apos;a 5 champs supplementaires.</p>

          <div className="space-y-3">
            {formFields.map((field, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="Nom du champ"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value as LandingPageFormField["type"] })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition"
                >
                  <option value="text">Texte</option>
                  <option value="email">Email</option>
                  <option value="phone">Telephone</option>
                  <option value="select">Liste</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-white/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    className="rounded"
                  />
                  Requis
                </label>
                <button onClick={() => removeField(i)} className="text-red-400 hover:text-red-300 transition p-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>

          {formFields.length < 5 && (
            <button onClick={addField} className="text-sm text-primary hover:text-primary/80 transition font-semibold">
              + Ajouter un champ
            </button>
          )}

          <div className="border-t border-white/10 pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Notifications des leads</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">Email de notification</label>
                <input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} placeholder="email@exemple.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">Telephone WhatsApp</label>
                <input type="tel" value={notifPhone} onChange={(e) => setNotifPhone(e.target.value)} placeholder="+221 77 123 45 67" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
              </div>
            </div>
            <p className="text-xs text-white/30 mt-2">Au moins un moyen de notification requis.</p>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("brand")} className="text-sm text-white/40 hover:text-white/70 transition">Retour</button>
            <button onClick={() => setStep("budget")} className="btn-primary px-6 py-2.5">Suivant</button>
          </div>
        </div>
      )}

      {/* STEP 3: Budget */}
      {step === "budget" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Budget et tarification</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">CPC (cout par clic) *</label>
              <input type="number" min="10" max="50" value={cpc} onChange={(e) => setCpc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
              <p className="text-xs text-white/30 mt-1">10 - 50 FCFA</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">CPL (cout par lead) *</label>
              <input type="number" min="200" max="5000" step="100" value={cpl} onChange={(e) => setCpl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
              <p className="text-xs text-white/30 mt-1">200 - 5 000 FCFA</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Budget total *</label>
              <input type="number" min={LEAD_GEN_MIN_BUDGET_FCFA} max="10000000" step="1000" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
              <p className="text-xs text-white/30 mt-1">Min {formatFCFA(LEAD_GEN_MIN_BUDGET_FCFA)}</p>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mt-4">
            <p className="text-sm font-semibold text-purple-300 mb-2">Resume des couts</p>
            <div className="space-y-1.5 text-xs text-white/60">
              <div className="flex justify-between"><span>Budget campagne (clics + leads)</span><span>{formatFCFA(Number(budget))}</span></div>
              <div className="flex justify-between items-center">
                <div>
                  <span>Frais de creation landing page</span>
                  <span className="block text-[10px] text-white/30">Page IA generee automatiquement, unique, non-modifiable</span>
                </div>
                <span>{formatFCFA(LEAD_GEN_SETUP_FEE_FCFA)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1 font-semibold text-white">
                <span>Total debite de votre solde</span><span>{formatFCFA(totalCost)}</span>
              </div>
            </div>
            <p className="text-xs text-white/30 mt-3">Echo recoit 75% du CPC et 75% du CPL sur les leads verifies. Les {formatFCFA(LEAD_GEN_SETUP_FEE_FCFA)} de creation couvrent la generation IA du contenu de votre landing page.</p>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("form")} className="text-sm text-white/40 hover:text-white/70 transition">Retour</button>
            <button onClick={() => setStep("confirm")} className="btn-primary px-6 py-2.5">Suivant</button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirmation */}
      {step === "confirm" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Confirmation</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-white/40">Campagne</span><span>{title}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Marque</span><span>{brandName}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Secteur</span><span>{INDUSTRY_LABELS[brandIndustry]}</span></div>
            <div className="flex justify-between"><span className="text-white/40">CPC</span><span>{cpc} FCFA</span></div>
            <div className="flex justify-between"><span className="text-white/40">CPL</span><span>{cpl} FCFA</span></div>
            <div className="flex justify-between"><span className="text-white/40">Budget</span><span>{formatFCFA(Number(budget))}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Frais landing page IA</span><span>{formatFCFA(LEAD_GEN_SETUP_FEE_FCFA)}</span></div>
            <div className="flex justify-between font-bold border-t border-white/10 pt-2"><span>Total</span><span>{formatFCFA(totalCost)}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Champs formulaire</span><span>{formFields.filter((f) => f.label).length} champs</span></div>
            <div className="flex justify-between"><span className="text-white/40">Banniere(s)</span><span>{creativeUrls.length} image(s)</span></div>
            <div className="flex justify-between items-center"><span className="text-white/40">Couleurs</span><span className="flex gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: brandColor }} /><span className="w-4 h-4 rounded" style={{ backgroundColor: brandAccentColor }} /></span></div>
            <div className="flex justify-between"><span className="text-white/40">Notification</span><span>{notifEmail || notifPhone || "Non configure"}</span></div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4">
            <p className="text-xs text-yellow-300">
              L&apos;IA generera le contenu de votre landing page (titre, description, CTA). Une seule generation par campagne, sans possibilite de regenerer.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep("budget")} className="text-sm text-white/40 hover:text-white/70 transition">Retour</button>
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40"
              >
                {submitting && asDraft ? "..." : "Sauvegarder brouillon"}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-bold hover:bg-purple-600 transition disabled:opacity-40"
              >
                {submitting && !asDraft ? "Creation en cours..." : "Lancer la campagne"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
