"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function Changelog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-[#111128] py-12 px-5 border-t border-white/[0.07]">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 text-left w-full"
        >
          <span className="text-[13px] font-dm font-semibold text-white/50">{t("developers.changelog.title")}</span>
          <ChevronDown className={`w-4 h-4 text-white/25 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-[12px] font-dm font-semibold text-white/60 mb-2">{t("developers.changelog.v11Label")}</p>
              <div className="text-[11px] font-code text-white/35 space-y-1">
                <p><span className="text-[#1D9E75]">+</span> Endpoint /api/pixel/ping</p>
                <p><span className="text-[#1D9E75]">+</span> event_id deduplication (24h window)</p>
                <p><span className="text-[#1D9E75]">+</span> debug mode in JS SDK</p>
                <p><span className="text-[#F39C12]">~</span> Rate limit increased: 100 → 200 req/min per IP</p>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-dm font-semibold text-white/60 mb-2">{t("developers.changelog.v10Label")}</p>
              <div className="text-[11px] font-code text-white/35 space-y-1">
                <p><span className="text-[#1D9E75]">+</span> Initial release</p>
                <p><span className="text-[#1D9E75]">+</span> Events: page_view, sign_up, activation, purchase</p>
                <p><span className="text-[#1D9E75]">+</span> JS SDK (2KB gzipped)</p>
                <p><span className="text-[#1D9E75]">+</span> Server-side API</p>
                <p><span className="text-[#1D9E75]">+</span> 3-layer fraud protection</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
