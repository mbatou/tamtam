"use client";

import Link from "next/link";
import CodeBlock from "@/components/developers/CodeBlock";
import { useTranslation } from "@/lib/i18n";

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.privacy.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          {t("developers.privacy.title")}
        </h2>

        <div className="grid sm:grid-cols-3 gap-5">
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-[14px] font-bold font-syne text-white mb-4">{t("developers.privacy.card1Title")}</h3>
            <div className="text-[12px] font-dm text-white/40 leading-relaxed space-y-3">
              <div>
                <p className="text-white/55 font-semibold mb-1">{t("developers.privacy.card1Collects")}</p>
                <p>· {t("developers.privacy.card1Item1")}</p>
                <p>· {t("developers.privacy.card1Item2")}</p>
                <p>· {t("developers.privacy.card1Item3")}</p>
                <p>· {t("developers.privacy.card1Item4")}</p>
              </div>
              <div>
                <p className="text-white/55 font-semibold mb-1">{t("developers.privacy.card1NeverCollects")}</p>
                <p>· {t("developers.privacy.card1Never1")}</p>
                <p>· {t("developers.privacy.card1Never2")}</p>
                <p>· {t("developers.privacy.card1Never3")}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-[14px] font-bold font-syne text-white mb-4">{t("developers.privacy.card2Title")}</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-3">
              {t("developers.privacy.card2Desc")}
            </p>
            <CodeBlock
              language="js"
              code={`tamtam('track', 'sign_up', {
  user_data: {
    email_hash: sha256('user@example.com'),
    phone_hash: sha256('+221771234567'),
  }
})`}
            />
            <p className="text-[11px] font-dm text-white/30 mt-3">
              {t("developers.privacy.card2Note")}
            </p>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-[14px] font-bold font-syne text-white mb-4">{t("developers.privacy.card3Title")}</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed">
              {t("developers.privacy.card3Content1")}
            </p>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mt-3">
              {t("developers.privacy.card3Content2")}
            </p>
            <Link href="/privacy" className="text-[12px] font-dm text-[#D35400] hover:underline mt-3 block">
              {t("developers.privacy.card3Link")} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
