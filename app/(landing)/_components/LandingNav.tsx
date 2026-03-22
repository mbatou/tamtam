"use client";

import Link from "next/link";

export default function LandingNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 absolute top-0 left-0 right-0 z-20">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-orange-500 font-black text-xl">←</span>
        <span className="text-white font-bold">Tamtam</span>
      </Link>
      <Link
        href="/login"
        className="text-gray-400 hover:text-white text-sm transition-colors"
      >
        Se connecter
      </Link>
    </nav>
  );
}
