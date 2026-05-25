"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n";
import {
  LayoutDashboard, Target, BarChart3,
  Wallet, Zap,
  Settings, MessageCircle, LogOut,
} from "lucide-react";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import BrandSwitcher from "@/components/dashboard/BrandSwitcher";

const NAV_GROUPS = [
  {
    labelKey: "nav.campaigns",
    items: [
      { labelKey: "nav.overview", href: "/admin/dashboard", Icon: LayoutDashboard },
      { labelKey: "nav.rythmes", href: "/admin/campaigns", Icon: Target },
      { labelKey: "nav.analytics", href: "/admin/analytics", Icon: BarChart3 },
    ],
  },
  {
    labelKey: "nav.finance",
    items: [
      { labelKey: "nav.wallet", href: "/admin/wallet", Icon: Wallet },
    ],
  },
  {
    labelKey: "nav.tools",
    items: [
      { labelKey: "nav.pixel", href: "/admin/pixel", Icon: Zap },
    ],
  },
  {
    labelKey: "nav.account",
    items: [
      { labelKey: "nav.settings", href: "/admin/settings", Icon: Settings },
      { labelKey: "nav.support", href: "/admin/support", Icon: MessageCircle },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[200px] min-h-screen"
        style={{
          background: "#0D0D20",
          borderRight: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="p-5 pb-0">
          <Link href="/admin/dashboard" className="block mb-4">
            <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={110} height={28} priority className="h-7 w-auto" />
          </Link>
          <div className="mb-4">
            <BrandSwitcher />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <p
                className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-[0.1em] font-dm"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative"
                      style={{
                        background: active ? "rgba(211,84,0,0.12)" : "transparent",
                        color: active ? "#D35400" : "rgba(255,255,255,0.45)",
                        borderRight: active ? "2px solid #D35400" : "2px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <item.Icon size={16} />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 space-y-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 text-[12px] font-medium text-red-400/60 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden p-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-2">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={100} height={26} priority className="h-6 w-auto" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button onClick={handleLogout} className="text-red-400/60 hover:text-red-400 transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <BrandSwitcher />
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden bottom-nav safe-bottom">
        <div className="flex justify-around items-center py-2 px-1">
          {[
            { labelKey: "nav.overview", href: "/admin/dashboard", Icon: LayoutDashboard },
            { labelKey: "nav.rythmes", href: "/admin/campaigns", Icon: Target },
            { labelKey: "nav.analytics", href: "/admin/analytics", Icon: BarChart3 },
            { labelKey: "nav.wallet", href: "/admin/wallet", Icon: Wallet },
            { labelKey: "nav.settings", href: "/admin/settings", Icon: Settings },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-2"
              >
                <item.Icon size={18} color={active ? "#D35400" : "rgba(255,255,255,0.3)"} />
                <span className={`text-[9px] font-medium ${active ? "text-[#D35400]" : "text-white/30"}`}>
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
