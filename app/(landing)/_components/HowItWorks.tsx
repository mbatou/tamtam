"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { useQueryString } from "./useQueryString";

export default function HowItWorks() {
  const [tab, setTab] = useState<"brand" | "echo">("brand");
  const qs = useQueryString();
  const { t } = useTranslation();

  const brandSteps = [
    { title: t("landing.howItWorks.brandStep1Title"), desc: t("landing.howItWorks.brandStep1Desc") },
    { title: t("landing.howItWorks.brandStep2Title"), desc: t("landing.howItWorks.brandStep2Desc") },
    { title: t("landing.howItWorks.brandStep3Title"), desc: t("landing.howItWorks.brandStep3Desc") },
  ];

  const echoSteps = [
    { title: t("landing.howItWorks.echoStep1Title"), desc: t("landing.howItWorks.echoStep1Desc") },
    { title: t("landing.howItWorks.echoStep2Title"), desc: t("landing.howItWorks.echoStep2Desc") },
    { title: t("landing.howItWorks.echoStep3Title"), desc: t("landing.howItWorks.echoStep3Desc") },
  ];

  const steps = tab === "brand" ? brandSteps : echoSteps;
  const accentColor = tab === "brand" ? "#D35400" : "#1D9E75";

  return (
    <section
      id="comment-ca-marche"
      className="bg-tt-ivory py-20 md:py-28 px-5 border-t-2"
      style={{ borderTopColor: accentColor }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-tt-night/40 mb-3">
            {t("landing.howItWorks.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] text-tt-night">
            {t("landing.howItWorks.title")}
          </h2>
        </div>

        <div className="flex justify-center mb-14">
          <div className="flex bg-black/[0.06] rounded-[12px] p-1 gap-1">
            <button
              onClick={() => setTab("brand")}
              role="tab"
              aria-selected={tab === "brand"}
              className={`flex items-center gap-2 px-6 py-3 rounded-[10px] text-[13px] font-semibold font-dm transition-all duration-200 ${
                tab === "brand"
                  ? "bg-[#D35400] text-white shadow-sm"
                  : "text-black/40 hover:text-black/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              {t("landing.howItWorks.tabBrand")}
            </button>
            <button
              onClick={() => setTab("echo")}
              role="tab"
              aria-selected={tab === "echo"}
              className={`flex items-center gap-2 px-6 py-3 rounded-[10px] text-[13px] font-semibold font-dm transition-all duration-200 ${
                tab === "echo"
                  ? "bg-[#1D9E75] text-white shadow-sm"
                  : "text-black/40 hover:text-black/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              {t("landing.howItWorks.tabEcho")}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-0"
          >
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center">
                <div className="flex flex-col items-center text-center gap-4 flex-1">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black font-syne flex-shrink-0"
                    style={{ background: accentColor }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0A0A1A] mb-1.5 font-syne">{step.title}</h3>
                    <p className="text-[13px] text-black/50 leading-relaxed max-w-[200px] mx-auto font-dm">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {i < 2 && (
                  <div className="hidden md:flex items-center justify-center flex-shrink-0 w-12 mt-8">
                    <div
                      className="w-full h-px border-t-[1.5px] border-dashed"
                      style={{ borderColor: tab === "echo" ? "rgba(29,158,117,0.4)" : "rgba(211,84,0,0.4)" }}
                    />
                    <div
                      className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] -ml-px"
                      style={{ borderLeftColor: tab === "echo" ? "rgba(29,158,117,0.4)" : "rgba(211,84,0,0.4)" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center mt-12">
          {tab === "brand" ? (
            <Link
              href={`/register${qs}`}
              className="bg-[#D35400] text-white px-8 py-3.5 rounded-[10px] text-[13px] font-semibold font-dm hover:brightness-110 transition-all"
            >
              {t("landing.howItWorks.ctaBrand")}
            </Link>
          ) : (
            <Link
              href={`/register${qs}`}
              className="border-[1.5px] border-[#1D9E75] text-[#1D9E75] px-8 py-3.5 rounded-[10px] text-[13px] font-semibold font-dm hover:bg-[rgba(29,158,117,0.08)] transition-colors"
            >
              {t("landing.howItWorks.ctaEcho")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
