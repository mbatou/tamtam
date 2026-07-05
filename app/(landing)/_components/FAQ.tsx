"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  const faqs = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1"), side: "brand" },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2"), side: "echo" },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3"), side: "brand" },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4"), side: "echo" },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5"), side: "brand" },
    { q: t("landing.faq.q6"), a: t("landing.faq.a6"), side: "echo" },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 text-center mb-3 font-dm">{t("landing.faq.sectionLabel")}</p>
        <h2 className="text-[28px] md:text-[32px] font-black text-white text-center mb-12 tracking-[-0.5px] font-syne">
          {t("landing.faq.title")}
        </h2>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-[#111128] border border-white/[0.07] rounded-[10px] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={openIndex === i}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: faq.side === "brand" ? "#D35400" : "#1D9E75" }}
                  />
                  <span className="text-[13px] font-medium text-white font-dm">{faq.q}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4 pl-10">
                  <p className="text-[13px] text-white/55 leading-relaxed font-dm">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
