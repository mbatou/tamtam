"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const C = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const MAPPER_EVENTS = ["sign_up", "activation", "purchase", "lead", "page_view", "subscription"];

export default function PixelExtensionGuidePage() {
  const { t } = useTranslation();
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: 860 }}>
      {/* Back link */}
      <Link
        href="/admin/pixel"
        className="inline-flex items-center gap-1.5 text-[11px] font-dm font-semibold mb-4 transition-all hover:brightness-125"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        {t("brandExtension.back")}
      </Link>

      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden" style={C}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "rgba(211,84,0,0.06)" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(211,84,0,0.12)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold font-syne text-white">{t("brandExtension.title")}</h1>
              <p className="text-[11px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{t("brandExtension.subtitle")}</p>
            </div>
          </div>
          <p className="text-xs font-dm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{t("brandExtension.heroBody")}</p>
        </div>
      </div>

      <h2 className="text-sm font-bold font-syne text-white mb-3">{t("brandExtension.stepsTitle")}</h2>

      <div className="space-y-3">
        {/* ===== Step 1 — Install ===== */}
        <div className="rounded-2xl p-5" style={C}>
          <StepHeader n="1" color="#D35400" title={t("brandExtension.step1Title")} desc={t("brandExtension.step1Body")} />
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-disabled="true"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-dm font-semibold text-white opacity-50 cursor-not-allowed"
              style={{ background: "#D35400" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
              {t("brandExtension.chromeStoreCta")}
            </a>
            <span
              className="text-[10px] font-dm font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(234,179,8,0.1)", color: "#EAB308" }}
            >
              {t("brandExtension.chromeStoreSoon")}
            </span>
          </div>

          {/* Manual install (collapsible) */}
          <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => setManualOpen(!manualOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-dm font-semibold transition hover:brightness-125"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {t("brandExtension.manualToggle")}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: manualOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {manualOpen && (
              <div className="px-4 pb-4">
                <p className="text-[11px] font-dm mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{t("brandExtension.manualIntro")}</p>
                <a
                  href="/tamtam-pixel-extension.zip"
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-dm font-semibold mb-3 transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {t("brandExtension.manualDownload")}
                </a>
                <ol className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-syne mt-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{i}</span>
                      <span className="text-[11px] font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>{t(`brandExtension.manualStep${i}`)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* ===== Step 2 — Pixel ID ===== */}
        <div className="rounded-2xl p-5" style={C}>
          <StepHeader n="2" color="#D35400" title={t("brandExtension.step2Title")} desc={t("brandExtension.step2Body")} />
          <p className="text-[11px] font-dm mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{t("brandExtension.step2Where")}</p>
          <Link
            href="/admin/pixel"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-dm font-semibold transition-all hover:brightness-110"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
          >
            {t("brandExtension.step2Link")}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <ScreenshotPlaceholder label={t("brandExtension.screenshotSoon")} />
        </div>

        {/* ===== Step 3 — Inject & test ===== */}
        <div className="rounded-2xl p-5" style={C}>
          <StepHeader n="3" color="#3B82F6" title={t("brandExtension.step3Title")} desc={t("brandExtension.step3Body")} />
          <div className="space-y-2">
            {["step3Item1", "step3Item2"].map((key) => (
              <div key={key} className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.04)" }}>
                <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-[11px] font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>{t(`brandExtension.${key}`)}</span>
              </div>
            ))}
          </div>
          <ScreenshotPlaceholder label={t("brandExtension.screenshotSoon")} />
        </div>

        {/* ===== Step 4 — Visual mapper ===== */}
        <div className="rounded-2xl p-5" style={C}>
          <StepHeader n="4" color="#8B5CF6" title={t("brandExtension.step4Title")} desc={t("brandExtension.step4Body")} />
          <ol className="space-y-2 mb-3">
            {["step4Item1", "step4Item2", "step4Item3"].map((key, i) => (
              <li key={key} className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.04)" }}>
                <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-syne mt-0.5" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>{i + 1}</span>
                <span className="text-[11px] font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>{t(`brandExtension.${key}`)}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] font-dm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{t("brandExtension.step4Done")}</p>
          <p className="text-[9px] font-dm font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("brandExtension.eventTypesLabel")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {MAPPER_EVENTS.map((evt) => (
              <code key={evt} className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", border: "0.5px solid rgba(139,92,246,0.15)", color: "#8B5CF6" }}>
                {evt}
              </code>
            ))}
          </div>
          <ScreenshotPlaceholder label={t("brandExtension.screenshotSoon")} />
        </div>

        {/* ===== Step 5 — Verify & attribution ===== */}
        <div className="rounded-2xl p-5" style={C}>
          <StepHeader n="5" color="#1D9E75" title={t("brandExtension.step5Title")} desc={t("brandExtension.step5Body")} />
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.12)" }}>
            <p className="text-[11px] font-dm font-bold mb-1" style={{ color: "#1D9E75" }}>{t("brandExtension.attributionTitle")}</p>
            <p className="text-[11px] font-dm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{t("brandExtension.attributionBody")}</p>
          </div>
        </div>
      </div>

      {/* ===== Note: tracking vs payable ===== */}
      <div className="mt-6 rounded-2xl p-5" style={{ background: "rgba(234,179,8,0.05)", border: "0.5px solid rgba(234,179,8,0.2)" }}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(234,179,8,0.12)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <p className="text-xs font-bold font-syne mb-1" style={{ color: "#EAB308" }}>{t("brandExtension.noteTitle")}</p>
            <p className="text-[11px] font-dm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>{t("brandExtension.noteBody")}</p>
            <Link
              href="/developers"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-dm font-semibold transition-all hover:brightness-110"
              style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.2)", color: "#EAB308" }}
            >
              {t("brandExtension.noteCta")}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Helpers */
function StepHeader({ n, color, title, desc }: { n: string; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-syne text-white" style={{ background: color }}>{n}</div>
      <div>
        <p className="text-sm font-bold font-syne text-white">{title}</p>
        <p className="text-[11px] font-dm mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
      </div>
    </div>
  );
}

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="mt-4 rounded-xl flex flex-col items-center justify-center gap-2 py-8"
      style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.1)" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <span className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.2)" }}>{label}</span>
    </div>
  );
}
