"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function PixelCallout() {
  const { t } = useTranslation();

  const bullets = [
    t("landing.pixel.bullet1"),
    t("landing.pixel.bullet2"),
    t("landing.pixel.bullet3"),
    t("landing.pixel.bullet4"),
  ];

  return (
    <section className="bg-tt-night-2 py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-tt-orange mb-3">
            {t("landing.pixel.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[24px] md:text-[28px] mb-6 leading-tight">
            {t("landing.pixel.title")}
          </h2>
          <div className="space-y-3 mb-8">
            {bullets.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-[14px] font-dm text-white/60">
                <Check size={16} className="text-tt-teal mt-0.5 shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/pixel"
            className="inline-flex items-center gap-2 bg-tt-orange hover:bg-tt-orange-dark text-white font-dm font-semibold text-[14px] px-6 py-3 rounded-[10px] transition-colors"
          >
            {t("landing.pixel.cta")} <ArrowRight size={16} />
          </Link>
          <p className="text-[11px] font-dm text-white/30 mt-3">
            {t("landing.pixel.ctaSub")}
          </p>
        </div>

        <div className="bg-[#141420] border border-white/[0.07] rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-tt-orange" />
              <span className="text-[12px] font-dm font-bold text-white/70">{t("landing.pixel.mockupTitle")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tt-teal animate-pulse" />
              <span className="text-[11px] font-dm text-tt-teal">{t("landing.pixel.mockupActive")}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/[0.07] px-5 py-5">
            {[
              { value: "200", label: t("landing.pixel.mockupClicks"), sub: null },
              { value: "76", label: t("landing.pixel.mockupSignups"), sub: "38%" },
              { value: "50", label: t("landing.pixel.mockupActivations"), sub: "65.8%" },
            ].map((s, i) => (
              <div key={i} className="text-center px-2">
                <p className="font-syne font-bold text-[24px] text-white">{s.value}</p>
                <p className="text-[11px] font-dm text-white/40">{s.label}</p>
                {s.sub && <p className="text-[10px] font-dm text-tt-teal">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 space-y-2">
            <p className="text-[10px] font-dm font-semibold text-white/30 uppercase tracking-wider mb-2">{t("landing.pixel.mockupFunnel")}</p>
            {[
              { width: "100%", label: t("landing.pixel.funnelClicks"), color: "bg-tt-orange" },
              { width: "38%", label: t("landing.pixel.funnelSignups"), color: "bg-tt-orange/60" },
              { width: "25%", label: t("landing.pixel.funnelActive"), color: "bg-tt-teal" },
            ].map((bar, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${bar.color} rounded-full`} style={{ width: bar.width }} />
                </div>
                <span className="text-[11px] font-dm text-white/40 w-20 text-right">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
