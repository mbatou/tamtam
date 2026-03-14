"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export default function EchoBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    {
      label: t("nav.pulse"),
      href: "/dashboard",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D35400" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      label: t("nav.rythmes"),
      href: "/rythmes",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D35400" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      ),
    },
    {
      label: t("nav.earnings"),
      href: "/earnings",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D35400" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: t("gamification.leaderboard"),
      href: "/leaderboard",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D35400" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21v-6M12 21V9M16 21v-4M4 21h16" />
        </svg>
      ),
    },
    {
      label: t("nav.profile"),
      href: "/profil",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D35400" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav safe-bottom">
      <div className="flex justify-around items-center pt-2 pb-1 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl relative transition-colors min-w-[60px] ${
                active ? "bg-primary/10" : ""
              }`}
            >
              {item.icon(active)}
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-primary" : "text-white/40"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
