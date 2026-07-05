"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n";

export default function DevNav() {
  const { t } = useTranslation();
  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A1A]/90 backdrop-blur-xl border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={100} height={26} priority className="h-6 w-auto" />
          </Link>
          <span className="text-white/15">|</span>
          <span className="text-[12px] font-code text-white/40">Developers</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <a href="#quickstart" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">{t("developers.nav.quickstart")}</a>
          <a href="#api" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">{t("developers.nav.api")}</a>
          <a href="#examples" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">{t("developers.nav.examples")}</a>
          <a href="#faq" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">{t("developers.nav.faq")}</a>
          <Link
            href="/signup/brand"
            className="text-[11px] font-dm font-semibold bg-[#D35400] text-white px-3 py-1.5 rounded-lg hover:bg-[#B94700] transition-colors"
          >
            {t("developers.nav.getApiKey")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
