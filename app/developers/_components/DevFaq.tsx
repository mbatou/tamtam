"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left"
      >
        <span className="text-[14px] font-dm font-semibold text-white pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="text-[13px] font-dm text-white/40 leading-relaxed pb-5 pr-8">
          {a}
        </p>
      )}
    </div>
  );
}

export default function DevFaq() {
  const { t } = useTranslation();
  const faqs = [
    { q: t("developers.faq.q1"), a: t("developers.faq.a1") },
    { q: t("developers.faq.q2"), a: t("developers.faq.a2") },
    { q: t("developers.faq.q3"), a: t("developers.faq.a3") },
    { q: t("developers.faq.q4"), a: t("developers.faq.a4") },
    { q: t("developers.faq.q5"), a: t("developers.faq.a5") },
    { q: t("developers.faq.q6"), a: t("developers.faq.a6") },
    { q: t("developers.faq.q7"), a: t("developers.faq.a7") },
    { q: t("developers.faq.q8"), a: t("developers.faq.a8") },
  ];

  return (
    <section id="faq" className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.faq.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          {t("developers.faq.title")}
        </h2>
        <div className="bg-[#0A0A1A] border border-white/[0.07] rounded-2xl px-6">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
