"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function Hero() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#0A0A1A] pt-20 pb-16 sm:pt-28 sm:pb-24 px-5">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-4">
            {t("developers.hero.chip")}
          </p>
          <h1 className="text-[36px] sm:text-[52px] font-bold font-syne tracking-tight text-white leading-[1.1] mb-5">
            {t("developers.hero.title1")}
            <br />
            {t("developers.hero.title2")}
          </h1>
          <p className="text-[15px] font-dm text-white/45 leading-relaxed max-w-[520px] mb-8">
            {t("developers.hero.desc")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup/brand"
              className="inline-flex items-center gap-2 bg-[#D35400] text-white font-dm font-semibold text-[13px] px-5 py-2.5 rounded-lg hover:bg-[#B94700] transition-colors"
            >
              {t("developers.hero.ctaPrimary")} <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 border border-white/[0.12] text-white/60 font-dm font-semibold text-[13px] px-5 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              {t("developers.hero.ctaDocs")} ↓
            </a>
          </div>
        </div>

        {/* Code preview */}
        <div className="bg-[#0D1117] border border-white/[0.08] rounded-[14px] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161B22] border-b border-white/[0.06]">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
            <span className="ml-2 text-[11px] text-white/25 font-code">tamtam-pixel.js</span>
          </div>
          <pre className="p-5 text-[12px] font-code leading-[1.8] overflow-x-auto scrollbar-hide">
            <code>
              <span className="text-[#8B949E]">{"// Initialize Tamtam Pixel"}</span>{"\n"}
              <span className="text-[#FF7B72]">window</span>
              <span className="text-white">.</span>
              <span className="text-[#79C0FF]">tamtam</span>
              <span className="text-white"> = </span>
              <span className="text-[#FF7B72]">new</span>
              <span className="text-[#FFA657]"> TamtamPixel</span>
              <span className="text-white">(</span>
              <span className="text-[#A5D6FF]">{`'tmsk_your_key_here'`}</span>
              <span className="text-white">)</span>{"\n\n"}
              <span className="text-[#8B949E]">{"// Track a signup"}</span>{"\n"}
              <span className="text-[#79C0FF]">tamtam</span>
              <span className="text-white">.</span>
              <span className="text-[#D2A8FF]">track</span>
              <span className="text-white">(</span>
              <span className="text-[#A5D6FF]">{`'sign_up'`}</span>
              <span className="text-white">, {"{"}</span>{"\n"}
              <span className="text-white">  </span>
              <span className="text-[#79C0FF]">value</span>
              <span className="text-white">: </span>
              <span className="text-[#79C0FF]">1</span>
              <span className="text-white">,</span>{"\n"}
              <span className="text-white">  </span>
              <span className="text-[#79C0FF]">currency</span>
              <span className="text-white">: </span>
              <span className="text-[#A5D6FF]">{`'XOF'`}</span>{"\n"}
              <span className="text-white">{"}"}</span>
              <span className="text-white">)</span>{"\n\n"}
              <span className="text-[#3FB950]">{"// ✓ Event received · 47ms"}</span>
            </code>
          </pre>
        </div>
      </div>

      {/* Stats strip */}
      <div className="max-w-7xl mx-auto mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {[
          t("developers.hero.stat1"),
          t("developers.hero.stat2"),
          t("developers.hero.stat3"),
        ].map((s, i) => (
          <span key={i} className="text-[11px] font-dm text-white/30">
            {i > 0 && <span className="mr-6 sm:mr-10 text-white/10">·</span>}
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
