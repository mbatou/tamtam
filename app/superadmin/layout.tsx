"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Vue d'ensemble", href: "/superadmin", emoji: "🏠", exact: true },
  { label: "Anti-Fraude", href: "/superadmin/fraud", emoji: "🛡️" },
  { label: "Modération", href: "/superadmin/campaigns", emoji: "🥁" },
  { label: "Leads", href: "/superadmin/leads", emoji: "📩" },
  { label: "Finances", href: "/superadmin/finance", emoji: "💰" },
  { label: "Utilisateurs", href: "/superadmin/users", emoji: "👥" },
  { label: "Support", href: "/superadmin/support", emoji: "💬" },
  { label: "Paramètres", href: "/superadmin/settings", emoji: "⚙️" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen sa-surface font-dm flex">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-white/5 transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[230px]"
        }`}
      >
        <div className="p-4 border-b border-white/5">
          <Link href="/superadmin" className="flex items-center gap-2">
            <span className="text-xl font-black gradient-text">
              {collapsed ? "T" : "Tamtam"}
            </span>
            {!collapsed && (
              <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                SUPER
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = (item as { exact?: boolean }).exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-gradient-primary text-white shadow-lg"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base shrink-0">{item.emoji}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-white/5 text-white/30 hover:text-white/50 text-xs text-center"
        >
          {collapsed ? "→" : "← Réduire"}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-4">
            <span className="lg:hidden text-xl font-black gradient-text">Tamtam</span>
            <span className="hidden lg:block text-xs text-white/30 font-medium">{today}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white">
              SA
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="lg:hidden flex overflow-x-auto gap-1 p-2 border-b border-white/5">
          {navItems.map((item) => {
            const active = (item as { exact?: boolean }).exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  active ? "bg-gradient-primary text-white" : "text-white/40 bg-white/5"
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
