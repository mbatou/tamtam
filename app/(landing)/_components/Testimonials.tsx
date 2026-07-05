"use client";

import { useTranslation } from "@/lib/i18n";

export default function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
    {
      quote: t("landing.testimonials.t1Quote"),
      name: t("landing.testimonials.t1Name"),
      detail: t("landing.testimonials.t1Company"),
      type: "brand" as const,
    },
    {
      quote: t("landing.testimonials.t2Quote"),
      name: t("landing.testimonials.t2Name"),
      detail: t("landing.testimonials.t2Location"),
      type: "echo" as const,
    },
    {
      quote: t("landing.testimonials.t3Quote"),
      name: t("landing.testimonials.t3Name"),
      detail: t("landing.testimonials.t3Location"),
      type: "echo" as const,
    },
  ];

  return (
    <section className="bg-[#111128] py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 text-center mb-3 font-dm">
          {t("landing.testimonials.sectionLabel")}
        </p>
        <h2 className="text-[28px] md:text-[32px] font-black text-white text-center mb-12 tracking-[-0.5px] font-syne">
          {t("landing.testimonials.title")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((tm, i) => (
            <div
              key={i}
              className="bg-[#141420] border border-white/[0.07] rounded-[14px] p-6"
              style={{
                borderLeft: `2px solid ${tm.type === "brand" ? "#D35400" : "#1D9E75"}`,
                borderRadius: "0 14px 14px 0",
              }}
            >
              <p className="text-[13px] text-white/70 leading-relaxed italic mb-5 font-dm">
                &ldquo;{tm.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white font-dm">{tm.name}</p>
                  <p className="text-[11px] text-white/35 font-dm">{tm.detail}</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full font-dm"
                  style={{
                    background: tm.type === "brand" ? "rgba(211,84,0,0.15)" : "rgba(29,158,117,0.12)",
                    color: tm.type === "brand" ? "#F0997B" : "#5DCAA5",
                  }}
                >
                  {tm.type === "brand" ? t("landing.testimonials.badgeBrand") : t("landing.testimonials.badgeEcho")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
