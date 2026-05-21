"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { TEMPLATES } from "@/lib/landing-page-templates";
import type { LandingPage, LandingPageFormField, LandingPageTemplate } from "@/lib/types";

// ---------------------------------------------------------------------------
// Preview + Inline Editor for Landing Pages
// Phone mockup with side-by-side edit panel
// ---------------------------------------------------------------------------

type Tab = "content" | "style" | "form";

export default function LandingPagePreviewPage() {
  const router = useRouter();
  const { id: campaignId } = useParams<{ id: string }>();
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [saved, setSaved] = useState(false);

  // Edit state
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [description, setDescription] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [brandColor, setBrandColor] = useState("#D35400");
  const [accentColor, setAccentColor] = useState("#1a1a2e");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [template, setTemplate] = useState<LandingPageTemplate>("simple");
  const [formFields, setFormFields] = useState<LandingPageFormField[]>([]);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/landing-pages`);
        if (!res.ok) throw new Error("Erreur chargement");
        const pages: LandingPage[] = await res.json();
        const page = pages.find((p) => p.campaign_id === campaignId);
        if (!page) {
          setError("Landing page introuvable pour cette campagne.");
          setLoading(false);
          return;
        }
        setLandingPage(page);
        setHeadline(page.headline);
        setSubheadline(page.subheadline || "");
        setDescription(page.description || "");
        setCtaText(page.cta_text);
        setBrandColor(page.brand_color || "#D35400");
        setAccentColor(page.brand_accent_color || "#1a1a2e");
        setLogoUrl(page.logo_url || "");
        setHeroImageUrl(page.hero_image_url || "");
        setTemplate(page.template || "simple");
        setFormFields(page.form_fields || []);
      } catch {
        setError("Impossible de charger la landing page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  async function handleSave() {
    if (!landingPage) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/landing-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landing_page_id: landingPage.id,
          headline,
          subheadline: subheadline || null,
          description: description || null,
          cta_text: ctaText,
          brand_color: brandColor,
          brand_accent_color: accentColor,
          logo_url: logoUrl || null,
          hero_image_url: heroImageUrl || null,
          template,
          form_fields: formFields,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur de sauvegarde");
      }

      const updated = await res.json();
      setLandingPage(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleLaunch() {
    if (!landingPage) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/landing-pages/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du lancement");
      }

      router.push("/admin/campaigns");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du lancement");
    } finally {
      setSaving(false);
    }
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingHero(true);
    const formData = new FormData();
    formData.append("file", files[0]);
    try {
      const res = await fetch("/api/campaigns/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setHeroImageUrl(data.url);
      }
    } catch {
      // silent
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl">
        <div className="skeleton h-8 w-48 rounded-xl mb-4" />
        <div className="skeleton h-[600px] rounded-xl" />
      </div>
    );
  }

  if (error && !landingPage) {
    return (
      <div className="p-6 max-w-4xl">
        <button onClick={() => router.push("/admin/campaigns")} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour
        </button>
        <div className="glass-card p-6">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!landingPage) return null;

  const isApproved = landingPage.landing_page_approved;

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/campaigns")} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour
          </button>
          <h1 className="text-xl font-bold">Apercu de la page</h1>
          {isApproved && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">Approuvee</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!editMode ? (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition font-semibold"
              >
                Modifier
              </button>
              {!isApproved && (
                <button
                  onClick={handleLaunch}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition disabled:opacity-40"
                >
                  {saving ? "Lancement..." : "Confirmer et lancer"}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition disabled:opacity-40"
              >
                {saving ? "Sauvegarde..." : saved ? "Sauvegarde !" : "Sauvegarder"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className={`flex gap-6 ${editMode ? "" : "justify-center"}`}>
        {/* Edit Panel */}
        {editMode && (
          <div className="w-96 shrink-0 glass-card p-5 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto">
            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {([
                { id: "content" as Tab, label: "Contenu" },
                { id: "style" as Tab, label: "Style" },
                { id: "form" as Tab, label: "Formulaire" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    tab === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content tab */}
            {tab === "content" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Titre</label>
                  <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Sous-titre</label>
                  <input type="text" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} maxLength={300} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Bouton CTA</label>
                  <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={50} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Image principale</label>
                  {heroImageUrl && (
                    <div className="relative mb-2 group">
                      <img src={heroImageUrl} alt="" className="w-full h-32 object-cover rounded-lg border border-white/10" />
                      <button
                        onClick={() => setHeroImageUrl("")}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        x
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingHero}
                    className="text-xs text-purple-400 hover:text-purple-300 transition font-semibold"
                  >
                    {uploadingHero ? "Telechargement..." : heroImageUrl ? "Changer l'image" : "+ Ajouter une image"}
                  </button>
                  <input ref={heroInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroUpload} className="hidden" />
                </div>
              </div>
            )}

            {/* Style tab */}
            {tab === "style" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Template</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTemplate(t.id)}
                        className={`p-3 rounded-xl text-left transition border ${
                          template === t.id
                            ? "bg-purple-500/20 border-purple-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-lg">{t.icon}</span>
                        <p className="text-xs font-semibold mt-1">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Couleur principale</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">Couleur de fond</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5">URL du logo</label>
                  <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition" />
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 h-10 rounded-lg" style={{ backgroundColor: brandColor }} />
                  <div className="flex-1 h-10 rounded-lg" style={{ backgroundColor: accentColor }} />
                </div>
              </div>
            )}

            {/* Form tab */}
            {tab === "form" && (
              <div className="space-y-3">
                <p className="text-xs text-white/30">Nom et Telephone sont inclus automatiquement.</p>
                {formFields.map((field, i) => (
                  <div key={i} className="bg-white/5 p-2.5 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...formFields];
                          updated[i] = { ...updated[i], label: e.target.value };
                          setFormFields(updated);
                        }}
                        maxLength={100}
                        placeholder="Nom du champ"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary transition"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...formFields];
                          const newType = e.target.value as LandingPageFormField["type"];
                          updated[i] = {
                            ...updated[i],
                            type: newType,
                            options: newType === "select" && !field.options?.length ? [""] : newType !== "select" ? undefined : field.options,
                          };
                          setFormFields(updated);
                        }}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary transition"
                      >
                        <option value="text">Texte</option>
                        <option value="email">Email</option>
                        <option value="phone">Tel</option>
                        <option value="select">Liste</option>
                      </select>
                      <button
                        onClick={() => setFormFields(formFields.filter((_, idx) => idx !== i))}
                        className="text-red-400/60 hover:text-red-300 transition"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    {field.type === "select" && (
                      <div className="pl-2 space-y-1">
                        {(field.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...formFields];
                                const newOpts = [...(updated[i].options || [])];
                                newOpts[oi] = e.target.value;
                                updated[i] = { ...updated[i], options: newOpts };
                                setFormFields(updated);
                              }}
                              maxLength={100}
                              placeholder={`Option ${oi + 1}`}
                              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-primary transition"
                            />
                            <button
                              onClick={() => {
                                const updated = [...formFields];
                                const newOpts = (updated[i].options || []).filter((_, idx) => idx !== oi);
                                updated[i] = { ...updated[i], options: newOpts.length > 0 ? newOpts : [""] };
                                setFormFields(updated);
                              }}
                              className="text-red-400/40 hover:text-red-300 transition"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))}
                        {(field.options || []).length < 20 && (
                          <button
                            onClick={() => {
                              const updated = [...formFields];
                              updated[i] = { ...updated[i], options: [...(updated[i].options || []), ""] };
                              setFormFields(updated);
                            }}
                            className="text-[11px] text-purple-400 hover:text-purple-300 transition font-semibold"
                          >
                            + Option
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {formFields.length < 5 && (
                  <button
                    onClick={() => setFormFields([...formFields, { label: "", type: "text", required: false }])}
                    className="text-xs text-primary hover:text-primary/80 transition font-semibold"
                  >
                    + Ajouter un champ
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Phone Mockup */}
        <div className="flex-1 flex justify-center">
          <div className="relative">
            {/* Phone frame */}
            <div className="w-[375px] h-[750px] rounded-[3rem] border-[8px] border-gray-700 bg-gray-800 shadow-2xl overflow-hidden relative">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-700 rounded-b-2xl z-20" />

              {/* Screen content */}
              <div className="w-full h-full overflow-y-auto" style={{ background: `linear-gradient(160deg, ${editMode ? accentColor : (landingPage.brand_accent_color || "#1a1a2e")} 0%, ${editMode ? accentColor : (landingPage.brand_accent_color || "#1a1a2e")}dd 40%, ${editMode ? accentColor : (landingPage.brand_accent_color || "#1a1a2e")}bb 100%)` }}>
                {/* Brand color bar */}
                <div className="w-full h-1.5" style={{ background: `linear-gradient(90deg, ${editMode ? brandColor : landingPage.brand_color}, ${editMode ? brandColor : landingPage.brand_color}99)` }} />

                <div className="px-5 py-8 pt-10">
                  {/* Hero image */}
                  {(editMode ? heroImageUrl : landingPage.hero_image_url) && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img
                        src={(editMode ? heroImageUrl : landingPage.hero_image_url) || ""}
                        alt=""
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}

                  {/* Logo */}
                  {(editMode ? logoUrl : landingPage.logo_url) && (
                    <div className="flex justify-center mb-5">
                      <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                        <img src={(editMode ? logoUrl : landingPage.logo_url) || ""} alt="" className="h-8 w-auto object-contain" />
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div
                    className="rounded-2xl p-5 shadow-xl border"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                      borderColor: `${editMode ? brandColor : landingPage.brand_color}30`,
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <h1 className="text-xl font-extrabold text-white text-center leading-tight mb-2">
                      {editMode ? headline : landingPage.headline}
                    </h1>

                    {(editMode ? subheadline : landingPage.subheadline) && (
                      <p className="text-center text-xs mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {editMode ? subheadline : landingPage.subheadline}
                      </p>
                    )}

                    {(editMode ? description : landingPage.description) && (
                      <p className="text-center text-[11px] mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {editMode ? description : landingPage.description}
                      </p>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 h-px" style={{ backgroundColor: `${editMode ? brandColor : landingPage.brand_color}30` }} />
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: editMode ? brandColor : landingPage.brand_color }} />
                      <div className="flex-1 h-px" style={{ backgroundColor: `${editMode ? brandColor : landingPage.brand_color}30` }} />
                    </div>

                    {/* Mock form */}
                    <div className="space-y-2.5">
                      <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-white/30">Nom complet *</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-white/30">Telephone *</span>
                      </div>
                      {(editMode ? formFields : landingPage.form_fields).map((f, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                          <span className="text-[10px] text-white/30">{f.label || "Champ"}{f.required ? " *" : ""}</span>
                        </div>
                      ))}

                      {/* CTA button */}
                      <button
                        className="w-full py-2.5 rounded-xl text-white text-xs font-bold mt-2"
                        style={{ backgroundColor: editMode ? brandColor : landingPage.brand_color }}
                      >
                        {editMode ? ctaText : landingPage.cta_text}
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <p className="text-center text-[10px] mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Propulse par Tamtam
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval banner */}
      {!isApproved && !editMode && (
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-yellow-300 font-semibold mb-2">Verifiez votre page avant de lancer</p>
          <p className="text-xs text-white/40 mb-3">Verifiez le contenu genere par l&apos;IA, modifiez si necessaire, puis confirmez le lancement.</p>
          <button
            onClick={handleLaunch}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition disabled:opacity-40"
          >
            {saving ? "Lancement..." : "Confirmer et lancer"}
          </button>
        </div>
      )}
    </div>
  );
}
