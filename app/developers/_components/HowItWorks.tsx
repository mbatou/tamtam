"use client";

import { Server, Link2, Shield, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.howItWorks.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-12">
          {t("developers.howItWorks.title")}
        </h2>

        {/* Flow diagram */}
        <div className="bg-[#111128] border border-white/[0.07] rounded-2xl p-6 sm:p-10 mb-12 overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-between min-w-[600px] gap-4">
            {/* Box 1 */}
            <div className="bg-[#0A0A1A] border border-white/[0.07] rounded-xl p-5 w-[180px] text-center shrink-0">
              <p className="text-[11px] font-code text-[#D35400] mb-2">{t("developers.howItWorks.flowVisitor")}</p>
              <p className="text-[12px] font-dm text-white/50">{t("developers.howItWorks.flowVisitorDesc")}</p>
            </div>
            {/* Arrow */}
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-[#D35400]/50 to-[#D35400]" />
              <ArrowRight className="w-4 h-4 text-[#D35400] -ml-1" />
            </div>
            {/* Box 2 */}
            <div className="bg-[#0A0A1A] border border-[#D35400]/30 rounded-xl p-5 w-[200px] text-center shrink-0">
              <p className="text-[11px] font-code text-[#D35400] mb-2">{t("developers.howItWorks.flowYourSite")}</p>
              <code className="text-[10px] font-code text-white/60 block">tamtam(&apos;track&apos;, &apos;sign_up&apos;)</code>
              <p className="text-[10px] font-code text-white/25 mt-2">POST /v1/events</p>
              <p className="text-[10px] font-code text-white/25">X-Tamtam-Key: tmsk_...</p>
            </div>
            {/* Arrow */}
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-[#D35400]/50 to-[#D35400]" />
              <ArrowRight className="w-4 h-4 text-[#D35400] -ml-1" />
            </div>
            {/* Box 3 */}
            <div className="bg-[#0A0A1A] border border-white/[0.07] rounded-xl p-5 w-[180px] text-center shrink-0">
              <p className="text-[11px] font-code text-[#1D9E75] mb-2">{t("developers.howItWorks.flowServers")}</p>
              <p className="text-[12px] font-dm text-white/50">{t("developers.howItWorks.flowServersAction1")}</p>
              <p className="text-[12px] font-dm text-white/50">{t("developers.howItWorks.flowServersAction2")}</p>
            </div>
          </div>
        </div>

        {/* 3 cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: Server,
              title: t("developers.howItWorks.card1Title"),
              desc: t("developers.howItWorks.card1Desc"),
            },
            {
              icon: Link2,
              title: t("developers.howItWorks.card2Title"),
              desc: t("developers.howItWorks.card2Desc"),
            },
            {
              icon: Shield,
              title: t("developers.howItWorks.card3Title"),
              desc: t("developers.howItWorks.card3Desc"),
            },
          ].map((card) => (
            <div key={card.title} className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
              <card.icon className="w-5 h-5 text-[#D35400] mb-4" />
              <h3 className="text-[14px] font-bold font-syne text-white mb-2">{card.title}</h3>
              <p className="text-[12px] font-dm text-white/40 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
