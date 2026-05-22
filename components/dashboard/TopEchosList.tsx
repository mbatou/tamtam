"use client";

import Link from "next/link";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface Echo {
  id: string;
  name: string;
  clicks: number;
  earned: number;
}

interface TopEchosListProps {
  echos: Echo[];
}

const AVATAR_COLORS = ["#D35400", "#1D9E75", "#8B5CF6", "#3B82F6", "#EF4444"];

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function TopEchosList({ echos }: TopEchosListProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold font-syne text-white">{t("admin.dashboard.topEchos")}</h3>
        <Link href="/admin/echos" className="text-[11px] font-medium transition-colors" style={{ color: "#D35400" }}>
          {t("admin.dashboard.viewAll")}
        </Link>
      </div>

      <div>
        {echos.map((echo, i) => (
          <div
            key={echo.id}
            className="flex items-center justify-between px-5 py-3 transition-colors"
            style={{
              borderTop: "0.5px solid rgba(255,255,255,0.04)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {getInitials(echo.name)}
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">{echo.name}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {echo.clicks} {t("common.clicks")}
                </p>
              </div>
            </div>
            <span className="text-[13px] font-bold font-syne" style={{ color: "#1D9E75" }}>
              {formatFCFA(echo.earned)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
