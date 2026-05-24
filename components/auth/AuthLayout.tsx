"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  panel: ReactNode;
  accentColor?: "orange" | "teal";
}

const glowStyles = {
  orange: "radial-gradient(ellipse at 60% 40%, rgba(211,84,0,0.15) 0%, transparent 60%)",
  teal: "radial-gradient(ellipse at 60% 40%, rgba(29,158,117,0.15) 0%, transparent 60%)",
};

export default function AuthLayout({ children, panel, accentColor = "orange" }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[#0A0A1A]">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{ background: glowStyles[accentColor] }}
      >
        <Link href="/" className="absolute top-8 left-8">
          <Image
            src="/brand/tamtam-horizontal-orange.png"
            alt="Tamtam"
            width={140}
            height={38}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <div className="max-w-md w-full">{panel}</div>
        <p className="absolute bottom-8 text-xs text-white/20 font-dm">
          Lupandu SARL &middot; tamma.me
        </p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="lg:hidden">
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="text-xs text-white/30 hover:text-white/50 transition font-dm ml-auto"
          >
            Retour
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:px-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
