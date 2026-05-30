"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  Plus,
  AlertTriangle,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import SuperadminSearch from "@/components/SuperadminSearch";
import ReconciliationBanner from "@/components/superadmin/ReconciliationBanner";
import AdminSidebar from "@/components/superadmin/AdminSidebar";

interface PendingCounts {
  pendingLeads: number;
  pendingPayouts: number;
  pendingCampaigns: number;
  highFraud: boolean;
}

interface UserContext {
  role: string;
  team_position: string | null;
  team_permissions: string[] | null;
  name: string;
}

const PAGE_TITLES: Record<string, string> = {
  "/superadmin": "Live Overview",
  "/superadmin/briefing": "Morning Brief",
  "/superadmin/campaigns": "Campaigns",
  "/superadmin/finance": "Finances",
  "/superadmin/users": "Échos",
  "/superadmin/crm": "Brands",
  "/superadmin/support": "Support",
  "/superadmin/leads": "CRM & Leads",
  "/superadmin/fraud": "Anti-Fraud",
  "/superadmin/wave-reconciliation": "Reconciliation",
  "/superadmin/investigate": "Investigation",
  "/superadmin/datalab": "Data Lab",
  "/superadmin/health": "Platform Health",
  "/superadmin/team": "Team",
  "/superadmin/settings": "Settings",
  "/superadmin/ambassadors": "Ambassadors",
  "/superadmin/analytics": "Analytics",
  "/superadmin/reconciliation": "Reconciliation",
  "/superadmin/email-campaigns": "Email Campaigns",
  "/superadmin/roadmap": "Roadmap",
  "/superadmin/pipeline": "Pipeline",
  "/superadmin/notifications": "Notifications",
};

// Mobile nav items (flat list)
const mobileNavItems = [
  { label: "Brief", href: "/superadmin/briefing" },
  { label: "Overview", href: "/superadmin", exact: true },
  { label: "Campaigns", href: "/superadmin/campaigns" },
  { label: "Finances", href: "/superadmin/finance" },
  { label: "Échos", href: "/superadmin/users" },
  { label: "Brands", href: "/superadmin/crm" },
  { label: "Support", href: "/superadmin/support" },
  { label: "CRM", href: "/superadmin/leads" },
  { label: "Fraud", href: "/superadmin/fraud" },
  { label: "Recon", href: "/superadmin/wave-reconciliation" },
  { label: "Investigate", href: "/superadmin/investigate" },
  { label: "Health", href: "/superadmin/health" },
  { label: "Team", href: "/superadmin/team" },
  { label: "Settings", href: "/superadmin/settings" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<PendingCounts | null>(null);
  const [userCtx, setUserCtx] = useState<UserContext | null>(null);

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

  useEffect(() => {
    fetch("/api/echo/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u)
          setUserCtx({
            role: u.role,
            team_position: u.team_position,
            team_permissions: u.team_permissions,
            name: u.name,
          });
      })
      .catch(() => {});
  }, []);

  const isSuperadmin = !userCtx || userCtx.role === "superadmin";
  const positionBadge = userCtx?.team_position
    ? userCtx.team_position === "coo"
      ? "COO"
      : userCtx.team_position
          .replace(/_/g, " ")
          .split(" ")
          .map((w) => w[0]?.toUpperCase())
          .join("")
    : "SA";

  const pageTitle = PAGE_TITLES[pathname] || "SuperAdmin";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalPending = (counts?.pendingPayouts || 0) + (counts?.pendingLeads || 0);

  return (
    <div className="min-h-screen bg-[#0A0A1A] font-dm flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          pendingCounts={counts}
          userRole={isSuperadmin ? "superadmin" : "team"}
          userPermissions={userCtx?.team_permissions || null}
          userName={userCtx?.name || "Admin"}
          teamPosition={userCtx?.team_position || null}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 bg-[#0A0A1A] border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-4 shrink-0">
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              priority
              className="lg:hidden h-7 w-auto"
            />
            <div className="hidden lg:block">
              <h1 className="font-syne font-bold text-lg text-white leading-none">{pageTitle}</h1>
              <span className="text-[11px] font-dm text-white/30">{today}</span>
            </div>
          </div>

          <div className="hidden sm:block flex-1 max-w-md">
            <SuperadminSearch />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick create */}
            <div className="hidden md:flex items-center gap-1.5">
              <Link
                href="/superadmin/campaigns?action=create"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-[11px] font-medium text-white/50 hover:text-white/70"
              >
                <Plus size={12} />
                <span>Campaign</span>
              </Link>
              <Link
                href="/superadmin/users?action=create"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-[11px] font-medium text-white/50 hover:text-white/70"
              >
                <Plus size={12} />
                <span>Batteur</span>
              </Link>
            </div>

            {/* Pending badge */}
            {totalPending > 0 && (
              <Link
                href="/superadmin/finance"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#D35400]/10 hover:bg-[#D35400]/20 transition text-[11px] font-bold text-[#F0997B]"
              >
                <Bell size={12} />
                <span>{totalPending}</span>
              </Link>
            )}

            {/* Fraud alert */}
            {counts?.highFraud && (
              <Link
                href="/superadmin/fraud"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition text-[11px] font-bold text-[#F09595] animate-pulse"
              >
                <AlertTriangle size={12} />
              </Link>
            )}

            {/* Dashboard switcher */}
            <DashboardSwitcher />

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full bg-[#D35400] flex items-center justify-center text-[10px] font-bold text-white"
              title={userCtx?.name || "Admin"}
            >
              {positionBadge}
            </div>
          </div>
        </header>

        {/* Mobile search */}
        <div className="sm:hidden px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <SuperadminSearch />
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden flex overflow-x-auto gap-1 p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {mobileNavItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-[#D35400]/12 text-[#D35400]"
                    : "text-white/40 bg-white/[0.04] hover:bg-white/[0.06]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <ReconciliationBanner />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Switcher
// ---------------------------------------------------------------------------

const dashboards = [
  { label: "SuperAdmin", href: "/superadmin", badge: "SUPER", badgeColor: "bg-red-500/20 text-red-400" },
  { label: "Batteur (Marque)", href: "/admin/dashboard", badge: "BRAND", badgeColor: "bg-[#D35400]/20 text-[#D35400]" },
  { label: "Echo", href: "/dashboard", badge: "ECHO", badgeColor: "bg-[#1D9E75]/20 text-[#5DCAA5]" },
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-[11px] font-medium text-white/50 hover:text-white/70"
      >
        <LayoutGrid size={13} />
        <span className="hidden md:inline">Switch</span>
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-[#111128] shadow-2xl z-50 overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
              Switch dashboard
            </p>
          </div>
          {dashboards.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.04] transition"
            >
              <span className="text-sm font-medium text-white/70">{d.label}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${d.badgeColor}`}>
                {d.badge}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
