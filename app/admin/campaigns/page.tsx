"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import type { Campaign } from "@/lib/types";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "",
  });
  const [creativeUrls, setCreativeUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/campaigns?batteur_id=${session.user.id}`);
    const data = await res.json();
    setCampaigns(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "" });
    setCreativeUrls([]);
    setEditingId(null);
    setError(null);
  }

  function startEdit(campaign: Campaign) {
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
    setShowForm(true);
    setError(null);
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

  const [showRechargePrompt, setShowRechargePrompt] = useState(false);

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
        if (data.code === "INSUFFICIENT_BALANCE") {
          setShowRechargePrompt(true);
        }
        setError(data.error || "Erreur");
        setSubmitting(false);
        return;
      }

      resetForm();
      setShowForm(false);
      setSubmitting(false);
      loadCampaigns();
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setSubmitting(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Supprimer ce rythme ? Cette action est irréversible.")) return;

    const res = await fetch("/api/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      loadCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || "Erreur lors de la suppression");
    }
  }

  async function toggleStatus(campaign: Campaign) {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    const res = await fetch("/api/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaign.id, status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json();
      if (data.code === "INSUFFICIENT_BALANCE") {
        alert("Solde insuffisant pour réactiver cette campagne. Veuillez recharger votre portefeuille.");
      } else {
        alert(data.error || "Erreur");
      }
    }
    loadCampaigns();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Rythmes</h1>
        <button
          onClick={() => {
            if (showForm) { resetForm(); setShowForm(false); }
            else { resetForm(); setShowForm(true); }
          }}
          className="btn-primary text-sm"
        >
          {showForm ? "Annuler" : "Nouveau Rythme"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">{editingId ? "Modifier le Rythme" : "Lancer un Rythme"}</h2>
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

            {/* Media Upload */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">Visuels de campagne (images/vidéos)</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {creativeUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    {url.match(/\.(mp4|webm)/) ? (
                      <video src={url} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                    ) : (
                      <img src={url} alt={`Creative ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                    )}
                    <button
                      onClick={() => removeCreative(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      x
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/50 hover:border-white/40 transition cursor-pointer"
                >
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
              <p className="text-xs text-white/20">JPG, PNG, WebP, GIF, MP4, WebM — Max 10 Mo par fichier</p>
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
          <button onClick={handleSubmit} disabled={submitting || !form.title || !form.destination_url || !form.cpc || !form.budget} className="btn-primary mt-4 disabled:opacity-40">
            {submitting ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Lancer le Rythme"}
          </button>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Titre</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Visuels</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Statut</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Budget</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">CPC</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Progression</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
                return (
                  <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{campaign.title}</div>
                      {campaign.description && <div className="text-xs text-white/30 mt-0.5 line-clamp-1">{campaign.description}</div>}
                    </td>
                    <td className="px-5 py-4">
                      {campaign.creative_urls && campaign.creative_urls.length > 0 ? (
                        <div className="flex -space-x-2">
                          {campaign.creative_urls.slice(0, 3).map((url, i) => (
                            <img key={i} src={url} alt="" className="w-8 h-8 rounded-lg object-cover border-2 border-[#0a0a0a]" />
                          ))}
                          {campaign.creative_urls.length > 3 && (
                            <span className="w-8 h-8 rounded-lg bg-white/10 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-white/40">
                              +{campaign.creative_urls.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge-${campaign.status}`}>
                        {campaign.status === "active" ? "Actif" : campaign.status === "paused" ? "Pausé" : campaign.status === "completed" ? "Terminé" : campaign.status === "draft" ? "Brouillon" : "Rejeté"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/60">{formatFCFA(campaign.spent)} / {formatFCFA(campaign.budget)}</td>
                    <td className="px-5 py-4">{campaign.cpc} FCFA</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <span className="text-xs text-white/40">{Math.round(progress)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {(campaign.status === "active" || campaign.status === "paused") && (
                          <button onClick={() => toggleStatus(campaign)} className="text-xs font-semibold text-primary hover:underline">
                            {campaign.status === "active" ? "Pauser" : "Activer"}
                          </button>
                        )}
                        <button onClick={() => startEdit(campaign)} className="text-xs font-semibold text-white/40 hover:text-white hover:underline">
                          Modifier
                        </button>
                        <button onClick={() => deleteCampaign(campaign.id)} className="text-xs font-semibold text-red-400/60 hover:text-red-400 hover:underline">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {campaigns.length === 0 && (
          <div className="p-8 text-center"><p className="text-white/30 text-sm">Aucun rythme créé.</p></div>
        )}
      </div>
    </div>
  );
}
