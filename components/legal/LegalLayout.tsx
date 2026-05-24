"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode, useState, useEffect, useRef } from "react";

interface TocItem {
  id: string;
  label: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  toc: TocItem[];
  children: ReactNode;
}

export default function LegalLayout({ title, lastUpdated, toc, children }: LegalLayoutProps) {
  const [activeId, setActiveId] = useState(toc[0]?.id || "");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [toc]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#F5F3EE]/95 backdrop-blur-sm border-b border-black/[0.06]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-black/40 hover:text-black/60 transition font-dm"
          >
            Connexion
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Title */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold font-syne tracking-tight text-[#0A0A1A] mb-2">
            {title}
          </h1>
          <p className="text-sm text-black/35 font-dm">Dernière mise à jour : {lastUpdated}</p>
        </div>

        <div className="flex gap-12">
          {/* Sticky TOC sidebar — hidden on mobile */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/25 font-dm mb-3">
                Sommaire
              </p>
              {toc.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-all font-dm ${
                    activeId === id
                      ? "text-[#D35400] bg-[#D35400]/[0.06] font-semibold"
                      : "text-black/40 hover:text-black/60 hover:bg-black/[0.03]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0 max-w-3xl">
            <div className="space-y-10 text-[15px] text-black/55 leading-relaxed font-dm">
              {children}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-black/[0.06]">
              <p className="text-xs text-black/30 font-dm">
                Lupandu SARL &middot; Dakar, Sénégal &middot;{" "}
                <a href="mailto:contact@tamma.me" className="text-[#D35400] hover:underline">
                  contact@tamma.me
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
