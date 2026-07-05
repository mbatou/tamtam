"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n";

export default function DevFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#0A0A1A] border-t border-white/[0.07] py-8 px-5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={80} height={21} className="h-5 w-auto" />
          <span className="text-[11px] font-dm text-white/20">{t("developers.footer.location")}</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">{t("developers.footer.terms")}</Link>
          <Link href="/privacy" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">{t("developers.footer.privacy")}</Link>
          <Link href="/a-propos" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">{t("developers.footer.about")}</Link>
          <a href="mailto:contact@tamma.me" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">{t("developers.footer.contact")}</a>
        </div>
      </div>
    </footer>
  );
}
