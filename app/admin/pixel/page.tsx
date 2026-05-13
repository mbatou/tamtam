"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Pixel } from "@/lib/types";

type PixelWithCredentials = {
  pixel: Pixel;
  credentials: { pixel_id: string; api_key: string };
};

type ConversionEvent = {
  id: string;
  event: string;
  event_name: string | null;
  attributed: boolean;
  value_amount: number | null;
  created_at: string;
};

export default function PixelDashboardPage() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<PixelWithCredentials | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", platform: "app" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingPixel, setTestingPixel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ pixelId: string; success: boolean; latency?: number } | null>(null);
  const [regenPixel, setRegenPixel] = useState<string | null>(null);
  const [regenKey, setRegenKey] = useState<{ pixelId: string; apiKey: string } | null>(null);
  const [liveEvents, setLiveEvents] = useState<ConversionEvent[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const supabase = createClient();

  const loadPixels = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/pixels");
      const data = await res.json();
      if (res.ok) setPixels(data.pixels);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPixels();
  }, [loadPixels]);

  // Supabase Realtime subscription for live conversion events
  useEffect(() => {
    if (pixels.length === 0) return;

    const pixelIds = pixels.map((p) => p.pixel_id);
    const channel = supabase
      .channel("pixel-conversions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversions",
          filter: `pixel_id=in.(${pixelIds.join(",")})`,
        },
        (payload) => {
          const newEvent = payload.new as ConversionEvent;
          setLiveEvents((prev) => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pixels, supabase]);

  async function handleCreate() {
    if (!createForm.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/brand/pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        setCreating(false);
        return;
      }
      setShowCreateModal(false);
      setShowCredentialsModal(data as PixelWithCredentials);
      setCreateForm({ name: "", platform: "app" });
      await loadPixels();
    } catch {
      setError("Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(pixel: Pixel) {
    await fetch("/api/brand/pixels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixel_id: pixel.pixel_id, is_active: !pixel.is_active }),
    });
    await loadPixels();
  }

  async function handleTest(pixelId: string) {
    setTestingPixel(pixelId);
    setTestResult(null);
    try {
      const res = await fetch("/api/brand/pixels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_id: pixelId }),
      });
      const data = await res.json();
      setTestResult({ pixelId, success: data.success, latency: data.latency_ms });
    } catch {
      setTestResult({ pixelId, success: false });
    } finally {
      setTestingPixel(null);
    }
  }

  async function handleRegenerate(pixelId: string) {
    setRegenPixel(pixelId);
    try {
      const res = await fetch("/api/brand/pixels/regenerate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_id: pixelId }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegenKey({ pixelId, apiKey: data.api_key });
      }
    } catch {
      // ignore
    } finally {
      setRegenPixel(null);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const totalConversions = pixels.reduce((acc, p) => acc + (p.total_conversions || 0), 0);
  const activePixels = pixels.filter((p) => p.is_active).length;

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Tamtam Pixel</h1>
          <p className="text-sm text-white/40 mt-1">Suivez vos conversions en temps réel</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-primary text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition flex items-center gap-2 self-start"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Créer un Pixel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/40 font-semibold">Pixels actifs</p>
          <p className="text-2xl font-black mt-1">{activePixels}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/40 font-semibold">Total pixels</p>
          <p className="text-2xl font-black mt-1">{pixels.length}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/40 font-semibold">Conversions totales</p>
          <p className="text-2xl font-black mt-1 text-primary">{totalConversions.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-white/40 font-semibold">Événements live</p>
          <p className="text-2xl font-black mt-1 text-accent">{liveEvents.length}</p>
        </div>
      </div>

      {/* Pixel cards */}
      {pixels.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="text-4xl mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-white/20"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 className="text-lg font-bold text-white/60">Aucun pixel configuré</h3>
          <p className="text-sm text-white/30 mt-2 max-w-md mx-auto">
            Créez votre premier pixel pour commencer à suivre les conversions de vos campagnes.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 bg-gradient-primary text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition"
          >
            Créer un Pixel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pixels.map((pixel) => (
            <div key={pixel.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${pixel.is_active ? "bg-emerald-400" : "bg-white/20"}`} />
                  <div>
                    <h3 className="font-bold text-sm">{pixel.name}</h3>
                    <p className="text-xs text-white/30 font-mono mt-0.5">{pixel.pixel_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    pixel.platform === "app" ? "bg-blue-500/20 text-blue-400" :
                    pixel.platform === "web" ? "bg-purple-500/20 text-purple-400" :
                    "bg-teal-500/20 text-teal-400"
                  }`}>
                    {pixel.platform === "app" ? "App" : pixel.platform === "web" ? "Web" : "App + Web"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    pixel.test_status === "success" ? "bg-emerald-500/20 text-emerald-400" :
                    pixel.test_status === "failed" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {pixel.test_status === "success" ? "Testé" : pixel.test_status === "failed" ? "Échec test" : "Non testé"}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-black">{(pixel.total_conversions || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-white/40">Conversions</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-black">{pixel.last_test_latency_ms ? `${pixel.last_test_latency_ms}ms` : "—"}</p>
                  <p className="text-[10px] text-white/40">Latence</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-black">{pixel.test_count || 0}</p>
                  <p className="text-[10px] text-white/40">Tests</p>
                </div>
              </div>

              {/* Test result inline */}
              {testResult && testResult.pixelId === pixel.pixel_id && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {testResult.success
                    ? `Test réussi en ${testResult.latency}ms`
                    : "Échec du test — vérifiez votre configuration"}
                </div>
              )}

              {/* Regenerated key inline */}
              {regenKey && regenKey.pixelId === pixel.pixel_id && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400 font-bold mb-2">Nouvelle clé API (copiez-la maintenant) :</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-black/30 px-3 py-1.5 rounded flex-1 break-all">{regenKey.apiKey}</code>
                    <button
                      onClick={() => copyToClipboard(regenKey.apiKey, `regen-${pixel.pixel_id}`)}
                      className="text-xs bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition shrink-0"
                    >
                      {copiedField === `regen-${pixel.pixel_id}` ? "Copié !" : "Copier"}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => handleTest(pixel.pixel_id)}
                  disabled={testingPixel === pixel.pixel_id}
                  className="text-xs font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {testingPixel === pixel.pixel_id ? "Test en cours..." : "Tester"}
                </button>
                <button
                  onClick={() => handleToggleActive(pixel)}
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition ${
                    pixel.is_active ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {pixel.is_active ? "Désactiver" : "Activer"}
                </button>
                <button
                  onClick={() => handleRegenerate(pixel.pixel_id)}
                  disabled={regenPixel === pixel.pixel_id}
                  className="text-xs font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition text-yellow-400 disabled:opacity-50"
                >
                  {regenPixel === pixel.pixel_id ? "Génération..." : "Régénérer clé"}
                </button>
                <button
                  onClick={() => copyToClipboard(pixel.pixel_id, `pid-${pixel.pixel_id}`)}
                  className="text-xs font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition"
                >
                  {copiedField === `pid-${pixel.pixel_id}` ? "Copié !" : "Copier ID"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Event Stream */}
      {liveEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Événements en direct
          </h2>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {liveEvents.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      evt.attributed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"
                    }`}>
                      {evt.event}
                    </span>
                    {evt.event_name && <span className="text-xs text-white/40">{evt.event_name}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {evt.value_amount && (
                      <span className="text-xs font-bold text-primary">{evt.value_amount.toLocaleString()} FCFA</span>
                    )}
                    <span className="text-[10px] text-white/30">
                      {new Date(evt.created_at).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Pixel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Créer un Pixel</h2>
            {error && <p className="text-sm text-red-400 mb-3 bg-red-500/10 p-3 rounded-lg">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">Nom du pixel</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ex: Mon App Mobile"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2">Plateforme</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["app", "web", "both"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCreateForm({ ...createForm, platform: p })}
                      className={`text-xs font-bold py-2.5 rounded-xl transition ${
                        createForm.platform === p
                          ? "bg-primary text-white"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                      }`}
                    >
                      {p === "app" ? "App" : p === "web" ? "Web" : "Les deux"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setError(null); }}
                className="flex-1 bg-white/5 text-white/60 font-semibold py-3 rounded-xl text-sm hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name.trim()}
                className="flex-1 bg-gradient-primary text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
              >
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal (shown after creation) */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h2 className="text-lg font-bold">Pixel créé avec succès !</h2>
              <p className="text-xs text-white/40 mt-1">Copiez vos identifiants maintenant. La clé API ne sera plus affichée.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1">PIXEL ID</label>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-black/30 px-3 py-2 rounded-lg flex-1">{showCredentialsModal.credentials.pixel_id}</code>
                  <button
                    onClick={() => copyToClipboard(showCredentialsModal.credentials.pixel_id, "cred-pid")}
                    className="text-xs bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20 transition shrink-0"
                  >
                    {copiedField === "cred-pid" ? "Copié !" : "Copier"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1">CLÉ API</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-black/30 px-3 py-2 rounded-lg flex-1 break-all">{showCredentialsModal.credentials.api_key}</code>
                  <button
                    onClick={() => copyToClipboard(showCredentialsModal.credentials.api_key, "cred-key")}
                    className="text-xs bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20 transition shrink-0"
                  >
                    {copiedField === "cred-key" ? "Copié !" : "Copier"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick integration snippet */}
            <div className="mt-4 p-3 bg-white/[0.03] border border-white/5 rounded-xl">
              <p className="text-[10px] font-bold text-white/40 mb-2">INTÉGRATION RAPIDE</p>
              <pre className="text-[11px] font-mono text-white/60 overflow-x-auto whitespace-pre">{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/conversions \\
  -H "Content-Type: application/json" \\
  -H "X-Tamtam-Key: ${showCredentialsModal.credentials.api_key}" \\
  -d '{"pixel_id":"${showCredentialsModal.credentials.pixel_id}","event":"test"}'`}</pre>
            </div>

            <button
              onClick={() => setShowCredentialsModal(null)}
              className="w-full mt-6 bg-gradient-primary text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition"
            >
              J&apos;ai copié mes identifiants
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
