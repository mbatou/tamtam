"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n";
import { useQueryString } from "./useQueryString";

export default function Footer() {
  const qs = useQueryString();
  const { t } = useTranslation();

  return (
    <footer className="bg-[#0D0D20] border-t border-white/[0.07] pt-12 pb-6 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              className="h-7 w-auto mb-3"
            />
            <p className="font-dm text-[13px] text-white/40 leading-relaxed mb-4">
              {t("landing.footer.tagline")}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white transition-colors text-[12px] font-dm"
              >
                Instagram
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white transition-colors text-[12px] font-dm"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              {t("landing.footer.platform")}
            </p>
            <ul className="space-y-2">
              {[
                { label: t("landing.footer.howItWorks"), href: "#comment-ca-marche" },
                { label: t("landing.footer.useCases"), href: "#marques" },
                { label: t("landing.footer.pixel"), href: "#pixel" },
                { label: t("landing.footer.faq"), href: "#faq" },
                { label: t("landing.nav.developers"), href: "/developers" },
              ].map((link, i) => (
                <li key={i}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              {t("landing.footer.legal")}
            </p>
            <ul className="space-y-2">
              {[
                { label: t("landing.footer.terms"), href: "/terms" },
                { label: t("landing.footer.privacy"), href: "/privacy" },
                { label: t("landing.footer.about"), href: "/a-propos" },
              ].map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              {t("landing.footer.joinTamtam")}
            </p>
            <div className="space-y-2">
              <Link
                href={`/register${qs}`}
                className="block bg-tt-orange text-white text-center font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-tt-orange-dark transition-colors"
              >
                {t("landing.footer.launchCampaign")}
              </Link>
              <Link
                href={`/register${qs}`}
                className="block border border-tt-teal/60 text-tt-teal text-center font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
              >
                {t("landing.footer.becomeEcho")}
              </Link>
              <Link
                href="/login"
                className="block text-center font-dm text-[12px] text-white/30 hover:text-white/50 transition-colors py-1"
              >
                {t("landing.footer.login")}
              </Link>
            </div>
            <div className="mt-4">
              <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-1">
                {t("landing.footer.contact")}
              </p>
              <a
                href="mailto:contact@tamma.me"
                className="font-dm text-[13px] text-white/40 hover:text-white transition-colors"
              >
                contact@tamma.me
              </a>
              <p className="font-dm text-[12px] text-white/25 mt-1">Dakar, Sénégal</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-5 text-center">
          <p className="font-dm text-[11px] text-white/25">
            {t("landing.footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
