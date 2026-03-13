"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, timeAgo } from "@/lib/utils";
import type { Campaign } from "@/lib/types";

type View = "list" | "detail" | "form";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "",
  });
  const [creativeUrls, setCreativeUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRechargePrompt, setShowRechargePrompt] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/campaigns?batteur_id=${session.user.id}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setCampaigns(list);
    if (selectedCampaign) {
      const updated = list.find((c: Campaign) => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);
      else { setSelectedCampaign(null); setView("list"); }
    }
    setLoading(false);
  }

  function resetForm() {
    setForm({ title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "" });
    setCreativeUrls([]);
    setEditingId(null);
    setError(null);
    setShowRechargePrompt(false);
  }

  function openDetail(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setView("detail");
  }

  function openNewForm() {
    resetForm();
    setView("form");
  }

  function openEditForm(campaign: Campaign) {
    setForm({
      title: campaign.title,
      description: campaign.description || "",
      destination_url: campaign.destination_url,
      cpc: campaign.cpc.toString(),
      budget: campaign.budget.toString(),
      starts_at: campaign.starts_at ? campaign.starts_at.slice(0, 16) : "",
      ends_at: campaign.ends_at ? campaign.ends_at.slice(0, 16) : "",
    });
    setCreativeUrls(campaign.creative_urls || []);
    setEditingId(campaign.id);
    setError(null);
    setShowRechargePrompt(false);
    setView("form");
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
        setError(data.error || "Erreur lors de l'upload");
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeCreative(index: number) {
    setCreativeUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setShowRechargePrompt(false);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title,
        description: form.description || null,
        destination_url: form.destination_url,
        cpc: form.cpc,
        budget: form.budget,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        creative_urls: creativeUrls,
      };
      const res = await fetch("/api/campaigns", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "INSUFFICIENT_BALANCE") setShowRechargePrompt(true);
        let errorMsg = data.error || "Erreur";
        if (data.details) {
          const fields = Object.entries(data.details).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
          if (fields) errorMsg += ` (${fields})`;
        }
        setError(errorMsg);
        setSubmitting(false);
        return;
      }
      resetForm();
      setSubmitting(false);
      await loadCampaigns();
      setSelectedCampaign(data);
      setView("detail");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setSubmitting(false);
    }
  }

  async function handleAction(campaignId: string, action: "pause" | "activate" | "complete" | "delete") {
    setActionLoading(action);
    try {
      if (action === "delete") {
        if (!confirm("Supprimer ce rythme ? Le budget non dépensé sera remboursé.")) {
          setActionLoading(null);
          return;
        }
        const res = await fetch("/api/campaigns", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: campaignId }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Erreur");
        } else {
          setSelectedCampaign(null);
          setView("list");
        }
      } else {
        const statusMap = { pause: "paused", activate: "active", complete: "completed" } as const;
        const res = await fetch("/api/campaigns", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: campaignId, status: statusMap[action] }),
        });
        if (!res.ok) {
          const data = await res.json();
          if (data.code === "INSUFFICIENT_BALANCE") {
            alert("Solde insuffisant pour réactiver cette campagne. Veuillez recharger votre portefeuille.");
          } else {
            alert(data.error || "Erreur");
          }
        }
      }
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      active: "Actif", paused: "Pausé", completed: "Terminé", draft: "Brouillon", rejected: "Rejeté",
    };
    return map[status] || status;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ==================== DETAIL VIEW ====================
  if (view === "detail" && selectedCampaign) {
    const c = selectedCampaign;
    const progress = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
    const remaining = c.budget - c.spent;
    const isActive = c.status === "active";
    const isPaused = c.status === "paused";
    const isEnded = c.status === "completed" || c.status === "rejected";

    return (
      <div className="p-6 max-w-5xl">
        <button onClick={() => { setSelectedCampaign(null); setView("list"); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour aux Rythmes
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{c.title}</h1>
              <span className={`badge-${c.status}`}>{getStatusLabel(c.status)}</span>
            </div>
            {c.description && <p className="text-white/40 text-sm max-w-xl">{c.description}</p>}
            <p className="text-white/20 text-xs mt-2">Créé {timeAgo(c.created_at)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isActive && (
              <button onClick={() => handleAction(c.id, "pause")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 transition disabled:opacity-40">
                {actionLoading === "pause" ? "..." : "Mettre en pause"}
              </button>
            )}
            {isPaused && (
              <button onClick={() => handleAction(c.id, "activate")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40">
                {actionLoading === "activate" ? "..." : "Réactiver"}
              </button>
            )}
            {(isActive || isPaused) && (
              <button onClick={() => handleAction(c.id, "complete")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40">
                {actionLoading === "complete" ? "..." : "Terminer"}
              </button>
            )}
            {!isEnded && (
              <button onClick={() => openEditForm(c)} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition">
                Modifier
              </button>
            )}
            <button onClick={() => handleAction(c.id, "delete")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-40">
              {actionLoading === "delete" ? "..." : "Supprimer"}
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">Budget</p>
            <p className="text-xl font-bold">{formatFCFA(c.budget)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">Dépensé</p>
            <p className="text-xl font-bold text-accent">{formatFCFA(c.spent)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">Restant</p>
            <p className="text-xl font-bold text-primary">{formatFCFA(remaining)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">CPC</p>
            <p className="text-xl font-bold">{formatFCFA(c.cpc)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="glass-card p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Progression du budget</p>
            <p className="text-sm font-bold text-primary">{Math.round(progress)}%</p>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/30">
            <span>{formatFCFA(c.spent)} dépensé</span>
            <span>{formatFCFA(c.budget)} total</span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass-card p-5">
            <p className="text-xs text-white/40 font-semibold mb-3">Informations</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/30">URL de destination</p>
                <a href={c.destination_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{c.destination_url}</a>
              </div>
              {c.starts_at && (
                <div>
                  <p className="text-xs text-white/30">Date de début</p>
                  <p className="text-sm">{new Date(c.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              )}
              {c.ends_at && (
                <div>
                  <p className="text-xs text-white/30">Date de fin</p>
                  <p className="text-sm">{new Date(c.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs text-white/40 font-semibold mb-3">Visuels</p>
            {c.creative_urls && c.creative_urls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {c.creative_urls.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10">
                    {url.match(/\.(mp4|webm)/) ? (
                      <video src={url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={url} alt={`Visuel ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/20">Aucun visuel ajouté</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== FORM VIEW ====================
  if (view === "form") {
    return (
      <div className="p-6 max-w-4xl">
        <button onClick={() => { resetForm(); setView(editingId ? "detail" : "list"); }} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour
        </button>

        <h1 className="text-2xl font-bold mb-8">{editingId ? "Modifier le Rythme" : "Nouveau Rythme"}</h1>

        <div className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">Titre *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promo Ramadan 2026" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description de la campagne..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">URL de destination *</label>
              <input type="url" value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://marque.sn/promo" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">Visuels de campagne</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {creativeUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    {url.match(/\.(mp4|webm)/) ? (
                      <video src={url} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                    ) : (
                      <img src={url} alt={`Creative ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                    )}
                    <button onClick={() => removeCreative(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">x</button>
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
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple onChange={handleUpload} className="hidden" />
              <p className="text-xs text-white/20">JPG, PNG, WebP, GIF, MP4, WebM</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">CPC (FCFA) *</label>
              <input type="number" value={form.cpc} onChange={(e) => setForm({ ...form, cpc: e.target.value })} placeholder="25" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Budget total (FCFA) *</label>
              <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="100000" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Date de début</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Date de fin</label>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <p>{error}</p>
              {showRechargePrompt && (
                <a href="/admin/wallet" className="inline-block mt-2 px-4 py-2 rounded-xl bg-primary/20 text-primary font-semibold text-xs hover:bg-primary/30 transition">
                  Recharger mon portefeuille
                </a>
              )}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !form.title || !form.destination_url || !form.cpc || !form.budget} className="btn-primary mt-6 disabled:opacity-40">
            {submitting ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Lancer le Rythme"}
          </button>
        </div>
      </div>
    );
  }

  // ==================== LIST VIEW (Card Grid) ====================
  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Rythmes</h1>
        <button onClick={openNewForm} className="btn-primary text-sm">Nouveau Rythme</button>
      </div>

      {campaigns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3m0 0L9.5 7.5M12 3l2.5 4.5" />
            </svg>
          </div>
          <p className="text-white/40 text-sm mb-4">Aucun rythme créé pour le moment.</p>
          <button onClick={openNewForm} className="btn-primary text-sm">Créer votre premier Rythme</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
            return (
              <div
                key={campaign.id}
                onClick={() => openDetail(campaign)}
                className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-all group"
              >
                {campaign.creative_urls && campaign.creative_urls.length > 0 ? (
                  <div className="h-32 rounded-xl overflow-hidden mb-4 border border-white/5">
                    <img src={campaign.creative_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-32 rounded-xl mb-4 bg-white/[0.02] border border-white/5 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/10">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{campaign.title}</h3>
                    {campaign.description && <p className="text-xs text-white/30 truncate mt-0.5">{campaign.description}</p>}
                  </div>
                  <span className={`badge-${campaign.status} shrink-0`}>{getStatusLabel(campaign.status)}</span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>{formatFCFA(campaign.spent)}</span>
                    <span>{formatFCFA(campaign.budget)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/30">
                  <span>CPC: {formatFCFA(campaign.cpc)}</span>
                  <span>{timeAgo(campaign.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
