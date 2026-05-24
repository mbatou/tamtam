"use client";

import { useState, ReactNode } from "react";

interface Tab {
  label: string;
  content: ReactNode;
}

interface TabGroupProps {
  tabs: Tab[];
}

export default function TabGroup({ tabs }: TabGroupProps) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-dm font-medium transition-all whitespace-nowrap ${
              i === active
                ? "bg-[rgba(211,84,0,0.12)] text-[#D35400] border border-[rgba(211,84,0,0.3)]"
                : "text-white/35 hover:text-white/55 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}
