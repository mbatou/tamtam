"use client";

import { CheckCircle } from "lucide-react";
import CodeBlock from "@/components/developers/CodeBlock";
import { useTranslation } from "@/lib/i18n";

export default function TmRefLifecycle() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.tmRef.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-4">
          {t("developers.tmRef.title")}
        </h2>
        <p className="text-[13px] font-dm text-white/45 mb-10 max-w-[520px]">
          {t("developers.tmRef.desc")}
        </p>

        {/* 5-step flow */}
        <div className="space-y-4 mb-10">
          {[
            {
              step: "1",
              title: t("developers.tmRef.step1Title"),
              desc: t("developers.tmRef.step1Desc"),
              code: "https://votresite.com?tm_ref=echo_abc123",
            },
            {
              step: "2",
              title: t("developers.tmRef.step2Title"),
              desc: t("developers.tmRef.step2Desc"),
              code: "URL bar: votresite.com/signup?tm_ref=echo_abc123",
            },
            {
              step: "3",
              title: t("developers.tmRef.step3Title"),
              desc: t("developers.tmRef.step3Desc"),
              code: "tamtam('init', 'tmsk_...') // auto-reads ?tm_ref from URL",
            },
            {
              step: "4",
              title: t("developers.tmRef.step4Title"),
              desc: t("developers.tmRef.step4Desc"),
              code: "tamtam('track', 'sign_up') // tm_ref=echo_abc123 attached",
            },
            {
              step: "5",
              title: t("developers.tmRef.step5Title"),
              desc: t("developers.tmRef.step5Desc"),
              code: "→ Echo credited · Campaign budget debited",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#D35400]/15 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[12px] font-bold font-code text-[#D35400]">{item.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-dm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-[12px] font-dm text-white/40 mb-2">{item.desc}</p>
                <code className="text-[11px] font-code text-white/35 bg-[#0D1117] border border-white/[0.05] rounded-lg px-3 py-2 block overflow-x-auto scrollbar-hide">
                  {item.code}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* Green info box */}
        <div className="bg-[rgba(29,158,117,0.08)] border border-[rgba(29,158,117,0.2)] rounded-[10px] p-4 flex items-start gap-3 mb-10">
          <CheckCircle className="w-5 h-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-white mb-1 font-dm">{t("developers.tmRef.infoTitle")}</p>
            <p className="text-[12px] text-white/45 font-dm">
              {t("developers.tmRef.infoDesc")}
            </p>
          </div>
        </div>

        {/* Code example: two Échos, different tm_ref */}
        <h3 className="text-[16px] font-bold font-syne text-white mb-4">{t("developers.tmRef.exampleTitle")}</h3>
        <CodeBlock
          language="bash"
          code={`# Echo A — campaign "Promo"
https://votresite.com/promo?tm_ref=echo_a_7x9k2

# Echo B — same campaign "Promo"
https://votresite.com/promo?tm_ref=echo_b_m3p5q

# → Each visitor attributed to the Echo who shared the link
# → Pixel reads tm_ref automatically, no extra code needed`}
        />
      </div>
    </section>
  );
}
