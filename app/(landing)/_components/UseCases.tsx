"use client";

import { Smartphone, ShoppingBag, Users, Check, Minus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function UseCases() {
  const { t } = useTranslation();

  const cases = [
    {
      icon: Smartphone,
      title: t("landing.useCases.case1Title"),
      desc: t("landing.useCases.case1Desc"),
      detail: t("landing.useCases.case1Detail"),
    },
    {
      icon: ShoppingBag,
      title: t("landing.useCases.case2Title"),
      desc: t("landing.useCases.case2Desc"),
      detail: t("landing.useCases.case2Detail"),
    },
    {
      icon: Users,
      title: t("landing.useCases.case3Title"),
      desc: t("landing.useCases.case3Desc"),
      detail: t("landing.useCases.case3Detail"),
    },
  ];

  const tableRows = [
    { label: t("landing.useCases.rowCpc"), tamtam: t("landing.useCases.tamtamCpc"), meta: t("landing.useCases.metaCpc"), bao: t("landing.useCases.baoMeasure") },
    { label: t("landing.useCases.rowTargeting"), tamtam: t("landing.useCases.tamtamTarget"), meta: t("landing.useCases.metaTarget"), bao: "—" },
    { label: t("landing.useCases.rowAudience"), tamtam: t("landing.useCases.tamtamAudience"), meta: t("landing.useCases.metaAudience"), bao: "—" },
    { label: t("landing.useCases.rowPixel"), tamtam: "check", meta: "check", bao: "x" },
    { label: t("landing.useCases.rowMinCost"), tamtam: t("landing.useCases.tamtamMin"), meta: t("landing.useCases.metaMin"), bao: "—" },
  ];

  return (
    <section id="marques" className="py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-white/40 mb-3">
            {t("landing.useCases.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px]">
            {t("landing.useCases.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {cases.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="bg-tt-night-2 border border-white/[0.07] border-l-2 border-l-tt-orange rounded-[14px] p-6">
                <Icon size={28} className="text-tt-orange mb-4" />
                <h3 className="font-syne font-bold text-[16px] mb-2">{c.title}</h3>
                <p className="font-dm text-[13px] text-white/55 leading-relaxed mb-4">{c.desc}</p>
                <p className="font-dm text-[11px] text-tt-orange/70">{c.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-tt-night-2 border border-white/[0.07] rounded-[14px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] font-dm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="text-left p-4 text-white/30 font-medium" />
                  <th className="p-4 text-center bg-tt-orange/10 text-tt-orange font-bold">{t("landing.useCases.tableHeader")}</th>
                  <th className="p-4 text-center text-white/40 font-medium">{t("landing.useCases.tableMeta")}</th>
                  <th className="p-4 text-center text-white/40 font-medium hidden sm:table-cell">{t("landing.useCases.tableBao")}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="p-4 text-white/50">{row.label}</td>
                    <td className="p-4 text-center bg-tt-orange/5 text-white font-medium">
                      {row.tamtam === "check" ? <Check size={16} className="mx-auto text-tt-teal" /> : row.tamtam}
                    </td>
                    <td className="p-4 text-center text-white/40">
                      {row.meta === "check" ? <Check size={16} className="mx-auto text-tt-teal" /> : row.meta}
                    </td>
                    <td className="p-4 text-center text-white/30 hidden sm:table-cell">
                      {row.bao === "x" ? <Minus size={16} className="mx-auto text-white/20" /> : row.bao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
