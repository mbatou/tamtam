"use client";

import { Section, SECTION_TABS } from "./types";

export default function FraudSectionNav({
  activeSection,
  onSectionChange,
  counts,
}: {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  counts: { ips: number; echos: number; clicks: number };
}) {
  return (
    <div className="flex gap-1 mb-6 overflow-x-auto">
      {SECTION_TABS.map((st) => {
        const Icon = st.icon;
        const countMap: Record<string, number | undefined> = {
          ips: counts.ips,
          echos: counts.echos,
          clicks: counts.clicks,
        };
        const count = countMap[st.key];
        return (
          <button
            key={st.key}
            onClick={() => onSectionChange(st.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-dm font-medium transition whitespace-nowrap ${
              activeSection === st.key
                ? "bg-[#D35400] text-white"
                : "bg-[#111128] border border-white/[0.07] text-white/40 hover:bg-[#141420]"
            }`}
          >
            <Icon size={14} />
            {st.label}
            {count !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                activeSection === st.key ? "bg-white/20" : "bg-white/10 text-white/50"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
