"use client";

import { useTranslation } from "@/lib/i18n";
import type { CampaignObjective } from "@/lib/types";

export default function CampaignObjectiveView({
  objective,
  setObjective,
  onBack,
  onContinue,
}: {
  objective: CampaignObjective;
  setObjective: (objective: CampaignObjective) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();

  const objectives = [
    {
      id: "traffic" as const,
      label: t("admin.campaigns.objectiveTraffic"),
      description: t("admin.campaigns.trafficDesc"),
      detail: t("admin.campaigns.trafficDetail"),
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
      disabled: false,
    },
    {
      id: "awareness" as const,
      label: t("admin.campaigns.objectiveAwareness"),
      description: t("admin.campaigns.awarenessDesc"),
      detail: t("admin.campaigns.awarenessDetail"),
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
      disabled: false,
    },
    {
      id: "lead_generation" as const,
      label: t("admin.campaigns.leadGenLabel"),
      description: t("admin.campaigns.leadGenDesc"),
      detail: t("admin.campaigns.leadGenDetail"),
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      disabled: false,
    },
    {
      id: "app_install" as const,
      label: t("admin.campaigns.appInstallLabel"),
      description: t("admin.campaigns.appInstallDesc"),
      detail: t("admin.campaigns.appInstallDetail"),
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/><path d="M8 10l4 4 4-4"/></svg>,
      disabled: true,
    },
  ];

  return (
    <div className="p-6 lg:p-8" style={{ maxWidth: "100%" }}>
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-medium transition mb-6" style={{ color: "rgba(255,255,255,0.35)" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        {t("common.back")}
      </button>

      <h1 className="text-2xl font-bold font-syne text-white mb-2">{t("admin.campaigns.newRythme")}</h1>
      <p className="text-xs font-dm mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.objectiveQuestion")}</p>

      <div data-tour="objective-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {objectives.map((obj) => (
          <button
            key={obj.id}
            onClick={() => !obj.disabled && setObjective(obj.id as CampaignObjective)}
            disabled={obj.disabled}
            data-tour={`objective-${obj.id}`}
            className="relative text-left p-5 rounded-2xl transition-all"
            style={{
              background: obj.disabled ? "rgba(255,255,255,0.02)" : objective === obj.id ? "rgba(211,84,0,0.08)" : "#111128",
              border: obj.disabled ? "0.5px solid rgba(255,255,255,0.04)" : objective === obj.id ? "1.5px solid #D35400" : "0.5px solid rgba(255,255,255,0.06)",
              opacity: obj.disabled ? 0.4 : 1,
              cursor: obj.disabled ? "not-allowed" : "pointer",
            }}
          >
            {obj.disabled && (
              <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-semibold">
                {t("admin.campaigns.comingSoon")}
              </span>
            )}
            {!obj.disabled && objective === obj.id && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#D35400" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            )}
            <div className="mb-3" style={{ color: "#D35400" }}>{obj.icon}</div>
            <h3 className="font-bold font-syne text-white text-lg mb-1">{obj.label}</h3>
            <p className="text-xs font-dm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>{obj.description}</p>
            <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{obj.detail}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        {objective === "lead_generation" ? (
          <a
            href="/admin/campaigns/lead-gen"
            className="px-8 py-3 rounded-xl text-sm font-bold text-white inline-block text-center no-underline transition" style={{ background: "#D35400" }}
          >
            {t("admin.campaigns.configureLeadGen")}
          </a>
        ) : (
          <button
            onClick={onContinue}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white transition" style={{ background: "#D35400" }}
          >
            {t("admin.campaigns.continue")}
          </button>
        )}
      </div>
    </div>
  );
}
