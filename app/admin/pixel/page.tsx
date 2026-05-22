"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n";
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

const C = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const INP = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };

export default function PixelDashboardPage() {
  const { t } = useTranslation();
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

  useEffect(() => { loadPixels(); }, [loadPixels]);

  useEffect(() => {
    if (pixels.length === 0) return;
    const pixelIds = pixels.map((p) => p.pixel_id);
    const channel = supabase
      .channel("pixel-conversions")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "conversions",
        filter: `pixel_id=in.(${pixelIds.join(",")})`,
      }, (payload) => {
        const newEvent = payload.new as ConversionEvent;
        setLiveEvents((prev) => [newEvent, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
        setError(data.error || t("admin.pixel.errorCreating"));
        setCreating(false);
        return;
      }
      setShowCreateModal(false);
      setShowCredentialsModal(data as PixelWithCredentials);
      setCreateForm({ name: "", platform: "app" });
      await loadPixels();
    } catch {
      setError(t("admin.pixel.networkError"));
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
      await loadPixels();
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
      if (res.ok) setRegenKey({ pixelId, apiKey: data.api_key });
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
      <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
        <div className="mb-6">
          <div className="h-6 w-40 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-64 rounded mt-2 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={C}>
              <div className="h-3 w-16 rounded mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-7 w-10 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">{t("admin.pixel.title")}</h1>
          <p className="text-[11px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{t("admin.pixel.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/pixel/guide"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-dm font-semibold transition-all hover:brightness-110"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            {t("admin.pixel.viewGuide")}
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background: "#D35400" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t("admin.pixel.createPixel")}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t("admin.pixel.activePixels"), value: activePixels, color: "#1D9E75" },
          { label: t("admin.pixel.totalPixels"), value: pixels.length, color: "#3B82F6" },
          { label: t("admin.pixel.totalConversions"), value: totalConversions.toLocaleString(), color: "#D35400" },
          { label: t("admin.pixel.liveEvents"), value: liveEvents.length, color: "#8B5CF6" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-default" style={C}>
            <p className="text-[11px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</p>
            <p className="text-xl font-bold font-syne leading-none" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pixel cards */}
      {pixels.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={C}>
          <div className="mx-auto mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 className="text-base font-bold font-syne text-white/60">{t("admin.pixel.noPixels")}</h3>
          <p className="text-xs font-dm mt-2 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.3)" }}>
            {t("admin.pixel.noPixelsDesc")}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background: "#D35400" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t("admin.pixel.createPixel")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pixels.map((pixel) => (
            <div key={pixel.id} className="rounded-2xl p-5" style={C}>
              {/* Header row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: pixel.is_active ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.04)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pixel.is_active ? "#1D9E75" : "rgba(255,255,255,0.25)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-syne text-white">{pixel.name}</h3>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{pixel.pixel_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <PlatformBadge platform={pixel.platform} t={t} />
                  <TestStatusBadge status={pixel.test_status} t={t} />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: t("admin.pixel.conversions"), value: (pixel.total_conversions || 0).toLocaleString() },
                  { label: t("admin.pixel.latency"), value: pixel.last_test_latency_ms ? `${pixel.last_test_latency_ms}ms` : "—" },
                  { label: t("admin.pixel.tests"), value: pixel.test_count || 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-base font-bold font-syne text-white">{s.value}</p>
                    <p className="text-[9px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Test result */}
              {testResult && testResult.pixelId === pixel.pixel_id && (
                <div
                  className="mt-3 px-4 py-3 rounded-xl text-xs font-dm"
                  style={{
                    background: testResult.success ? "rgba(29,158,117,0.08)" : "rgba(239,68,68,0.08)",
                    border: `0.5px solid ${testResult.success ? "rgba(29,158,117,0.15)" : "rgba(239,68,68,0.15)"}`,
                    color: testResult.success ? "#1D9E75" : "#EF4444",
                  }}
                >
                  {testResult.success
                    ? t("admin.pixel.testSuccess", { latency: String(testResult.latency) })
                    : t("admin.pixel.testFailed")}
                </div>
              )}

              {/* Regenerated key */}
              {regenKey && regenKey.pixelId === pixel.pixel_id && (
                <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: "rgba(234,179,8,0.06)", border: "0.5px solid rgba(234,179,8,0.15)" }}>
                  <p className="text-[10px] font-dm font-semibold mb-2" style={{ color: "#EAB308" }}>{t("admin.pixel.newApiKey")}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono px-3 py-1.5 rounded-lg flex-1 break-all" style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.7)" }}>{regenKey.apiKey}</code>
                    <button
                      onClick={() => copyToClipboard(regenKey.apiKey, `regen-${pixel.pixel_id}`)}
                      className="text-[10px] font-dm px-3 py-1.5 rounded-lg transition shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                    >
                      {copiedField === `regen-${pixel.pixel_id}` ? t("admin.pixel.copied") : t("admin.pixel.copy")}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => handleTest(pixel.pixel_id)}
                  disabled={testingPixel === pixel.pixel_id}
                  className="text-[11px] font-dm font-semibold px-4 py-2 rounded-xl transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                >
                  {testingPixel === pixel.pixel_id ? t("admin.pixel.testing") : t("admin.pixel.test")}
                </button>
                <button
                  onClick={() => handleToggleActive(pixel)}
                  className="text-[11px] font-dm font-semibold px-4 py-2 rounded-xl transition-all hover:brightness-110"
                  style={{
                    background: pixel.is_active ? "rgba(239,68,68,0.08)" : "rgba(29,158,117,0.08)",
                    border: `0.5px solid ${pixel.is_active ? "rgba(239,68,68,0.12)" : "rgba(29,158,117,0.12)"}`,
                    color: pixel.is_active ? "#EF4444" : "#1D9E75",
                  }}
                >
                  {pixel.is_active ? t("admin.pixel.deactivate") : t("admin.pixel.activate")}
                </button>
                <button
                  onClick={() => handleRegenerate(pixel.pixel_id)}
                  disabled={regenPixel === pixel.pixel_id}
                  className="text-[11px] font-dm font-semibold px-4 py-2 rounded-xl transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "rgba(234,179,8,0.06)", border: "0.5px solid rgba(234,179,8,0.1)", color: "#EAB308" }}
                >
                  {regenPixel === pixel.pixel_id ? t("admin.pixel.regenerating") : t("admin.pixel.regenerateKey")}
                </button>
                <button
                  onClick={() => copyToClipboard(pixel.pixel_id, `pid-${pixel.pixel_id}`)}
                  className="text-[11px] font-dm font-semibold px-4 py-2 rounded-xl transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                >
                  {copiedField === `pid-${pixel.pixel_id}` ? t("admin.pixel.copied") : t("admin.pixel.copyId")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Event Stream */}
      {liveEvents.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold font-syne text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#1D9E75" }} />
            {t("admin.pixel.liveStream")}
          </h2>
          <div className="rounded-2xl overflow-hidden" style={C}>
            <div className="max-h-64 overflow-y-auto">
              {liveEvents.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[9px] font-dm font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: evt.attributed ? "rgba(29,158,117,0.1)" : "rgba(255,255,255,0.04)",
                        color: evt.attributed ? "#1D9E75" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {evt.event}
                    </span>
                    {evt.event_name && <span className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{evt.event_name}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {evt.value_amount != null && evt.value_amount > 0 && (
                      <span className="text-[11px] font-bold font-syne" style={{ color: "#D35400" }}>{evt.value_amount.toLocaleString()} FCFA</span>
                    )}
                    <span className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {new Date(evt.created_at).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== CREATE MODAL ====== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="relative w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => { setShowCreateModal(false); setError(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h2 className="text-base font-bold font-syne text-white mb-5">{t("admin.pixel.createTitle")}</h2>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.pixel.pixelName")}</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder={t("admin.pixel.pixelNamePlaceholder")}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none"
                  style={INP}
                />
              </div>
              <div>
                <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.pixel.platform")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["app", "web", "both"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCreateForm({ ...createForm, platform: p })}
                      className="text-xs font-dm font-semibold py-2.5 rounded-xl transition-all"
                      style={{
                        background: createForm.platform === p ? "#D35400" : "rgba(255,255,255,0.04)",
                        border: createForm.platform === p ? "1px solid #D35400" : "0.5px solid rgba(255,255,255,0.08)",
                        color: createForm.platform === p ? "white" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {p === "app" ? t("admin.pixel.platformApp") : p === "web" ? t("admin.pixel.platformWeb") : t("admin.pixel.platformBoth")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setError(null); }}
                className="flex-1 py-3 rounded-xl text-xs font-dm font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                {t("admin.pixel.cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name.trim()}
                className="flex-1 py-3 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
                style={{ background: "#D35400" }}
              >
                {creating ? t("admin.pixel.creating") : t("admin.pixel.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== CREDENTIALS MODAL ====== */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="relative w-full max-w-lg mx-4 rounded-2xl p-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.08)" }}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(29,158,117,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h2 className="text-base font-bold font-syne text-white">{t("admin.pixel.createdSuccess")}</h2>
              <p className="text-[11px] font-dm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{t("admin.pixel.createdDesc")}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-dm font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.pixel.pixelId")}</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono px-3 py-2 rounded-lg flex-1" style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.7)" }}>{showCredentialsModal.credentials.pixel_id}</code>
                  <button
                    onClick={() => copyToClipboard(showCredentialsModal.credentials.pixel_id, "cred-pid")}
                    className="text-[10px] font-dm px-3 py-2 rounded-lg transition shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                  >
                    {copiedField === "cred-pid" ? t("admin.pixel.copied") : t("admin.pixel.copy")}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-dm font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.pixel.apiKey")}</label>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] font-mono px-3 py-2 rounded-lg flex-1 break-all" style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.7)" }}>{showCredentialsModal.credentials.api_key}</code>
                  <button
                    onClick={() => copyToClipboard(showCredentialsModal.credentials.api_key, "cred-key")}
                    className="text-[10px] font-dm px-3 py-2 rounded-lg transition shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                  >
                    {copiedField === "cred-key" ? t("admin.pixel.copied") : t("admin.pixel.copy")}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick integration snippet */}
            <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[9px] font-dm font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.pixel.quickIntegration")}</p>
              <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre" style={{ color: "rgba(255,255,255,0.5)" }}>{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/conversions \\
  -H "Content-Type: application/json" \\
  -H "X-Tamtam-Key: ${showCredentialsModal.credentials.api_key}" \\
  -d '{"pixel_id":"${showCredentialsModal.credentials.pixel_id}","event":"test"}'`}</pre>
            </div>

            <button
              onClick={() => setShowCredentialsModal(null)}
              className="w-full mt-5 py-3 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "#D35400" }}
            >
              {t("admin.pixel.credentialsCopied")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Helpers */
function PlatformBadge({ platform, t }: { platform: string; t: (k: string) => string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    app: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6", label: t("admin.pixel.platformApp") },
    web: { bg: "rgba(139,92,246,0.1)", color: "#8B5CF6", label: t("admin.pixel.platformWeb") },
    both: { bg: "rgba(29,158,117,0.1)", color: "#1D9E75", label: t("admin.pixel.platformBoth") },
  };
  const c = config[platform] || config.app;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-dm font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      <span className="w-1 h-1 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

function TestStatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    success: { bg: "rgba(29,158,117,0.1)", color: "#1D9E75", label: t("admin.pixel.tested") },
    failed: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", label: t("admin.pixel.testFailedBadge") },
    pending: { bg: "rgba(234,179,8,0.1)", color: "#EAB308", label: t("admin.pixel.untested") },
  };
  const c = config[status] || config.pending;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-dm font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      <span className="w-1 h-1 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}
