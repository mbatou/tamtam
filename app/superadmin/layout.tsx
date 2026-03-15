"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import SuperadminSearch from "@/components/SuperadminSearch";

interface PendingCounts {
  pendingLeads: number;
  pendingPayouts: number;
  pendingCampaigns: number;
  highFraud: boolean;
}

const navItems = [
  { label: "Briefing", href: "/superadmin/briefing", emoji: "☀️" },
  { label: "Vue d'ensemble", href: "/superadmin", emoji: "🏠", exact: true },
  { label: "Roadmap", href: "/superadmin/roadmap", emoji: "🎯" },
  { label: "Anti-Fraude", href: "/superadmin/fraud", emoji: "🛡️", badgeKey: "fraud" as const },
  { label: "Modération", href: "/superadmin/campaigns", emoji: "🥁", badgeKey: "campaigns" as const },
  { label: "Leads", href: "/superadmin/leads", emoji: "📩", badgeKey: "leads" as const },
  { label: "Finances", href: "/superadmin/finance", emoji: "💰", badgeKey: "payouts" as const },
  { label: "Utilisateurs", href: "/superadmin/users", emoji: "👥" },
  { label: "Gamification", href: "/superadmin/gamification", emoji: "🎮" },
  { label: "Santé", href: "/superadmin/health", emoji: "🩺" },
  { label: "Support", href: "/superadmin/support", emoji: "💬" },
  { label: "Paramètres", href: "/superadmin/settings", emoji: "⚙️" },
];

function getBadgeCount(counts: PendingCounts | null, key?: string): number {
  if (!counts || !key) return 0;
  switch (key) {
    case "leads": return counts.pendingLeads;
    case "payouts": return counts.pendingPayouts;
    case "campaigns": return counts.pendingCampaigns;
    case "fraud": return counts.highFraud ? 1 : 0;
    default: return 0;
  }
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<PendingCounts | null>(null);

  const fetchCounts = useCallback(() => {
    fetch("/api/superadmin/pending-counts")
      .then((r) => r.json())
      .then((d) => setCounts(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

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
            const badgeCount = getBadgeCount(counts, (item as { badgeKey?: string }).badgeKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                  active
                    ? "bg-gradient-primary text-white shadow-lg"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base shrink-0 relative">
                  {item.emoji}
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="text-[10px] font-bold bg-orange-400/20 text-orange-400 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
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
        <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-4 shrink-0">
            <span className="lg:hidden text-xl font-black gradient-text">Tamtam</span>
            <span className="hidden lg:block text-xs text-white/30 font-medium">{today}</span>
          </div>
          <div className="hidden sm:block flex-1 max-w-md">
            <SuperadminSearch />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <QuickActions counts={counts} />
            <DashboardSwitcher />
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white">
              SA
            </div>
          </div>
        </header>

        {/* Mobile search */}
        <div className="sm:hidden px-4 py-2 border-b border-white/5">
          <SuperadminSearch />
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden flex overflow-x-auto gap-1 p-2 border-b border-white/5">
          {navItems.map((item) => {
            const active = (item as { exact?: boolean }).exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const badgeCount = getBadgeCount(counts, (item as { badgeKey?: string }).badgeKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
                  active ? "bg-gradient-primary text-white" : "text-white/40 bg-white/5"
                }`}
              >
                <span className="relative">
                  {item.emoji}
                  {badgeCount > 0 && (
                    <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-orange-400" />
                  )}
                </span>
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

function QuickActions({ counts }: { counts: PendingCounts | null }) {
  const totalPending = (counts?.pendingPayouts || 0) + (counts?.pendingLeads || 0);

  return (
    <div className="hidden md:flex items-center gap-2">
      <Link
        href="/superadmin/campaigns?action=create"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-[11px] font-semibold text-white/50 hover:text-white/80"
      >
        <span>+</span>
        <span>Campaign</span>
      </Link>
      <Link
        href="/superadmin/users?action=create"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-[11px] font-semibold text-white/50 hover:text-white/80"
      >
        <span>+</span>
        <span>Batteur</span>
      </Link>
      {totalPending > 0 && (
        <Link
          href="/superadmin/finance"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-400/10 hover:bg-orange-400/20 transition text-[11px] font-bold text-orange-400"
        >
          <span>{totalPending} pending</span>
        </Link>
      )}
      {counts?.highFraud && (
        <Link
          href="/superadmin/fraud"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/20 transition text-[11px] font-bold text-red-400 animate-pulse"
        >
          <span>Fraud alert</span>
        </Link>
      )}
    </div>
  );
}

const dashboards = [
  { label: "SuperAdmin", href: "/superadmin", badge: "SUPER", badgeColor: "bg-red-500/20 text-red-400" },
  { label: "Batteur (Marque)", href: "/admin/dashboard", badge: "BRAND", badgeColor: "bg-primary/20 text-primary" },
  { label: "Echo", href: "/dashboard", badge: "ECHO", badgeColor: "bg-accent/20 text-accent" },
];

function DashboardSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs font-semibold text-white/60 hover:text-white/80"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        Changer de vue
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Changer de dashboard</p>
          </div>
          {dashboards.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition"
            >
              <span className="text-sm font-medium text-white/70">{d.label}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${d.badgeColor}`}>{d.badge}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
