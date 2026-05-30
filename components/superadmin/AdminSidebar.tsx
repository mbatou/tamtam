"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  Activity,
  Megaphone,
  Wallet,
  Users,
  Building2,
  MessageCircle,
  Target,
  Shield,
  Scale,
  Search,
  FlaskConical,
  HeartPulse,
  Bell,
  Users2,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  permKey?: string;
  badgeKey?: "leads" | "payouts" | "campaigns" | "fraud";
  superadminOnly?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  storageKey: string;
  items: NavItem[];
}

export interface AdminSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  pendingCounts: {
    pendingLeads: number;
    pendingPayouts: number;
    pendingCampaigns: number;
    highFraud: boolean;
  } | null;
  userRole: "superadmin" | "team";
  userPermissions: string[] | null;
  userName: string;
  teamPosition: string | null;
}

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------

const sections: NavSection[] = [
  {
    id: "dailyops",
    label: "Daily Ops",
    storageKey: "sa_sidebar_dailyops",
    items: [
      { label: "Morning Brief", href: "/superadmin/briefing", icon: Newspaper, permKey: "briefing" },
      { label: "Live Overview", href: "/superadmin", icon: Activity, exact: true, permKey: "overview" },
      { label: "Campaigns", href: "/superadmin/campaigns", icon: Megaphone, badgeKey: "campaigns", permKey: "campaigns" },
      { label: "Finances", href: "/superadmin/finance", icon: Wallet, badgeKey: "payouts", permKey: "finance" },
    ],
  },
  {
    id: "cs",
    label: "Customer Success",
    storageKey: "sa_sidebar_cs",
    items: [
      { label: "Échos", href: "/superadmin/users", icon: Users, permKey: "users" },
      { label: "Brands", href: "/superadmin/crm", icon: Building2, badgeKey: "leads", permKey: "leads" },
      { label: "Support", href: "/superadmin/support", icon: MessageCircle, permKey: "support" },
      { label: "CRM & Leads", href: "/superadmin/leads", icon: Target, permKey: "leads" },
    ],
  },
  {
    id: "growth",
    label: "Growth & Operations",
    storageKey: "sa_sidebar_growth",
    items: [
      { label: "Anti-Fraud", href: "/superadmin/fraud", icon: Shield, badgeKey: "fraud", permKey: "fraud" },
      { label: "Reconciliation", href: "/superadmin/wave-reconciliation", icon: Scale, superadminOnly: true },
      { label: "Investigation", href: "/superadmin/investigate", icon: Search, superadminOnly: true },
      { label: "Data Lab", href: "/superadmin/datalab", icon: FlaskConical, superadminOnly: true },
    ],
  },
  {
    id: "system",
    label: "System",
    storageKey: "sa_sidebar_system",
    items: [
      { label: "Notifications", href: "/superadmin/notifications", icon: Bell, superadminOnly: true },
      { label: "Platform Health", href: "/superadmin/health", icon: HeartPulse, permKey: "health" },
      { label: "Team", href: "/superadmin/team", icon: Users2, superadminOnly: true },
      { label: "Settings", href: "/superadmin/settings", icon: Settings, superadminOnly: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usePersistedState(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(key);
      if (stored !== null) return stored === "true";
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue];
}

function getBadgeCount(
  counts: AdminSidebarProps["pendingCounts"],
  key?: "leads" | "payouts" | "campaigns" | "fraud",
): number {
  if (!counts || !key) return 0;
  switch (key) {
    case "leads":
      return counts.pendingLeads;
    case "payouts":
      return counts.pendingPayouts;
    case "campaigns":
      return counts.pendingCampaigns;
    case "fraud":
      return counts.highFraud ? 1 : 0;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSidebar(props: AdminSidebarProps) {
  const {
    collapsed,
    onCollapse,
    pendingCounts,
    userRole,
    userPermissions,
    teamPosition,
  } = props;
  const pathname = usePathname();

  // Section collapse states — one hook per section (stable key order)
  const [dailyOpsOpen, setDailyOpsOpen] = usePersistedState("sa_sidebar_dailyops", true);
  const [csOpen, setCsOpen] = usePersistedState("sa_sidebar_cs", true);
  const [growthOpen, setGrowthOpen] = usePersistedState("sa_sidebar_growth", true);
  const [systemOpen, setSystemOpen] = usePersistedState("sa_sidebar_system", true);

  const sectionState: Record<string, { open: boolean; setOpen: (v: boolean) => void }> = {
    dailyops: { open: dailyOpsOpen, setOpen: setDailyOpsOpen },
    cs: { open: csOpen, setOpen: setCsOpen },
    growth: { open: growthOpen, setOpen: setGrowthOpen },
    system: { open: systemOpen, setOpen: setSystemOpen },
  };

  // ----- Permission filtering -----
  const isSuperadmin = userRole === "superadmin";

  const canSee = useCallback(
    (item: NavItem): boolean => {
      if (isSuperadmin) return true;
      if (item.superadminOnly) return false;
      if (item.permKey && userPermissions) return userPermissions.includes(item.permKey);
      if (item.permKey && !userPermissions) return false;
      return true;
    },
    [isSuperadmin, userPermissions],
  );

  // ----- Active detection -----
  function isActive(item: NavItem): boolean {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  // ----- Badge abbreviation for team position -----
  const positionBadge = teamPosition
    ? teamPosition === "coo"
      ? "COO"
      : teamPosition
          .replace(/_/g, " ")
          .split(" ")
          .map((w) => w[0]?.toUpperCase())
          .join("")
    : "SA";

  // ----- Render helpers -----

  function renderNavItem(item: NavItem) {
    const active = isActive(item);
    const badgeCount = getBadgeCount(pendingCounts, item.badgeKey);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`group flex items-center rounded-lg transition-all relative ${
          collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
        }`}
        style={{
          gap: collapsed ? 0 : "10px",
          background: active ? "rgba(211,84,0,0.12)" : "transparent",
          color: active ? "#D35400" : "rgba(255,255,255,0.55)",
          borderRight: active ? "2px solid #D35400" : "2px solid transparent",
          borderRadius: "8px",
          fontSize: "13px",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        <span className="relative shrink-0 flex items-center justify-center">
          <Icon size={16} />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          )}
        </span>

        {!collapsed && (
          <>
            <span className="flex-1 font-dm font-medium truncate">{item.label}</span>
            {badgeCount > 0 && (
              <span className="text-[10px] font-bold bg-orange-400/20 text-orange-400 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {badgeCount}
              </span>
            )}
          </>
        )}

        {/* Collapsed tooltip */}
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[#1a1a2e] px-2.5 py-1 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg border border-white/10">
            {item.label}
            {badgeCount > 0 && (
              <span className="ml-1.5 text-[10px] font-bold text-orange-400">({badgeCount})</span>
            )}
          </span>
        )}
      </Link>
    );
  }

  function renderSection(section: NavSection, idx: number) {
    const visibleItems = section.items.filter(canSee);
    if (visibleItems.length === 0) return null;

    const { open, setOpen } = sectionState[section.id];
    const hasActivePage = visibleItems.some((item) => isActive(item));
    // Auto-expand if current page is in the section
    const expanded = open || hasActivePage;

    const SectionChevron = expanded ? ChevronDown : ChevronRight;

    return (
      <div key={section.id}>
        {/* Separator between sections */}
        {idx > 0 && (
          <div
            className="my-2"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
          />
        )}

        {/* Section label */}
        {!collapsed ? (
          <button
            onClick={() => setOpen(!expanded)}
            className="flex items-center w-full px-3 py-2 cursor-pointer select-none"
          >
            <span
              className="flex-1 text-left font-dm font-medium uppercase"
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              {section.label}
            </span>
            <SectionChevron
              size={12}
              style={{ color: "rgba(255,255,255,0.2)" }}
            />
          </button>
        ) : (
          <div
            className="my-2"
            style={{ borderTop: idx === 0 ? "none" : undefined }}
          />
        )}

        {/* Section items */}
        {expanded && (
          <div className="space-y-0.5">{visibleItems.map(renderNavItem)}</div>
        )}
      </div>
    );
  }

  // ----- Main render -----

  return (
    <aside
      className="hidden lg:flex flex-col transition-all duration-300 shrink-0"
      style={{
        width: collapsed ? 64 : 220,
        background: "#0A0A1A",
        borderRight: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo area */}
      <div
        className="p-4"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        <Link href="/superadmin" className="flex items-center gap-2">
          {collapsed ? (
            <Image
              src="/brand/tamtam-favicon.png"
              alt="Tamtam"
              width={28}
              height={28}
              priority
              className="h-7 w-7"
            />
          ) : (
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              priority
              className="h-7 w-auto"
            />
          )}
          {!collapsed && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                isSuperadmin
                  ? "bg-red-500/20 text-red-400"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {isSuperadmin ? "SUPER" : positionBadge}
            </span>
          )}
        </Link>
      </div>

      {/* Nav area */}
      <nav className="flex-1 overflow-y-auto p-3">
        {sections.map((section, idx) => renderSection(section, idx))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="flex items-center justify-center gap-2 p-4 text-white/30 hover:text-white/50 transition-colors"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        {collapsed ? (
          <ChevronsRight size={16} />
        ) : (
          <>
            <ChevronsLeft size={16} />
            <span className="text-xs font-dm">Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
