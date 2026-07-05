"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useQueryString } from "./useQueryString";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const qs = useQueryString();
  const { t } = useTranslation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: t("landing.nav.howItWorks"), href: "#comment-ca-marche" },
    { label: t("landing.nav.brands"), href: "#marques" },
    { label: t("landing.nav.becomeEcho"), href: "#echos" },
    { label: t("landing.nav.faq"), href: "#faq" },
    { label: t("landing.nav.developers"), href: "/developers", badge: "API" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-tt-night/90 backdrop-blur-xl border-b border-white/[0.07]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image
            src="/brand/tamtam-horizontal-orange.png"
            alt="Tamtam"
            width={120}
            height={32}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-[13px] font-dm text-white/55 hover:text-white transition-colors"
              >
                {link.label}
                {link.badge && (
                  <span className="text-[9px] bg-[rgba(211,84,0,0.15)] text-[#F0997B] px-1.5 py-0.5 rounded font-medium tracking-wide">
                    {link.badge}
                  </span>
                )}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-dm text-white/55 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-dm font-medium text-white/50 hover:text-white transition-colors"
          >
            {t("landing.nav.login")}
          </Link>
          <div className="w-px h-4 bg-white/10" />
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold bg-tt-orange text-white px-4 py-2 rounded-lg hover:bg-tt-orange-dark transition-colors"
          >
            {t("landing.nav.iAmBrand")}
          </Link>
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold text-tt-teal border border-tt-teal/60 px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
          >
            {t("landing.nav.becomeEchoShort")}
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white/60 hover:text-white p-1"
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-tt-night/95 backdrop-blur-xl border-b border-white/[0.07] overflow-hidden"
          >
            <div className="px-5 py-4 space-y-3">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-dm text-white/60 hover:text-white py-2"
                  >
                    {link.label}
                    {link.badge && (
                      <span className="text-[9px] bg-[rgba(211,84,0,0.15)] text-[#F0997B] px-1.5 py-0.5 rounded font-medium tracking-wide">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm font-dm text-white/60 hover:text-white py-2"
                  >
                    {link.label}
                  </a>
                )
              )}
              <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.07]">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-[14px] font-dm font-medium text-white/60 py-2"
                >
                  {t("landing.nav.login")} →
                </Link>
                <Link
                  href={`/register${qs}`}
                  className="text-sm font-dm font-semibold bg-tt-orange text-white text-center px-4 py-2.5 rounded-lg"
                >
                  {t("landing.nav.iAmBrand")}
                </Link>
                <Link
                  href={`/register${qs}`}
                  className="text-sm font-dm font-semibold text-tt-teal border border-tt-teal/60 text-center px-4 py-2.5 rounded-lg"
                >
                  {t("landing.nav.becomeEchoShort")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
