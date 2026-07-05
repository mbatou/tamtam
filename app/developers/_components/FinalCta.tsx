"use client";

import Link from "next/link";
import { Key, Terminal, MessageCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-[28px] sm:text-[32px] font-bold font-syne text-white mb-10">
          {t("developers.cta.title")}
        </h2>

        <div className="grid sm:grid-cols-3 gap-5 text-left">
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <Key className="w-5 h-5 text-[#D35400] mb-4" />
            <h3 className="text-[14px] font-bold font-syne text-white mb-2">{t("developers.cta.card1Title")}</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-5">
              {t("developers.cta.card1Desc")}
            </p>
            <Link
              href="/signup/brand"
              className="inline-flex items-center gap-2 bg-[#D35400] text-white font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-[#B94700] transition-colors"
            >
              {t("developers.cta.card1Button")} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <Terminal className="w-5 h-5 text-[#D35400] mb-4" />
            <h3 className="text-[14px] font-bold font-syne text-white mb-2">{t("developers.cta.card2Title")}</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-5">
              {t("developers.cta.card2Desc")}
            </p>
            <Link
              href="/login?tab=batteur"
              className="inline-flex items-center gap-2 border border-white/[0.12] text-white/60 font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              {t("developers.cta.card2Button")} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <MessageCircle className="w-5 h-5 text-[#D35400] mb-4" />
            <h3 className="text-[14px] font-bold font-syne text-white mb-2">{t("developers.cta.card3Title")}</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-5">
              {t("developers.cta.card3Desc")}
            </p>
            <a
              href="mailto:contact@tamma.me"
              className="inline-flex items-center gap-2 border border-white/[0.12] text-white/60 font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              {t("developers.cta.card3Button")} <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
