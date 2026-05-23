"use client";

import { motion } from "framer-motion";
import { useAwa } from "./AwaProvider";
import { useTranslation } from "@/lib/i18n";
import AwaMessages from "./AwaMessages";
import AwaInput from "./AwaInput";

const PAGE_CHIPS: Record<string, string[]> = {
  overview: ["chips.budget", "chips.cpc", "chips.echos", "chips.create"],
  campaigns: ["chips.createCampaign", "chips.optimizeBudget", "chips.bestObjective", "chips.campaignTips"],
  wallet: ["chips.recharge", "chips.spendingBreakdown", "chips.budgetAdvice", "chips.paymentHelp"],
  pixel: ["chips.pixelSetup", "chips.pixelEvents", "chips.conversionTracking", "chips.pixelDebug"],
  settings: ["chips.profileSetup", "chips.teamInvite", "chips.securityTips", "chips.languageHelp"],
  support: ["chips.contactSupport", "chips.responseTime", "chips.commonIssues", "chips.ticketStatus"],
  analytics: ["chips.readMetrics", "chips.improveCtr", "chips.audienceInsights", "chips.exportData"],
};

export default function AwaPanel() {
  const { open, setOpen, messages, sending, sendMessage, chipsUsed, setChipsUsed, currentPage } = useAwa();
  const { t } = useTranslation();

  if (!open) return null;

  const chipKeys = PAGE_CHIPS[currentPage] || PAGE_CHIPS.overview;
  const chips = chipKeys.map((key) => ({
    key,
    label: t(`awa.${key}`),
  }));

  function handleChip(label: string) {
    setChipsUsed(true);
    sendMessage(label);
  }

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 z-[98] flex flex-col"
      style={{
        width: 320,
        background: "#0D0D20",
        borderLeft: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
        {/* Mini robot */}
        <div
          className="w-9 h-9 rounded-[10px] flex flex-col items-center justify-center shrink-0 relative"
          style={{ background: "#D35400" }}
        >
          <div className="flex gap-[5px] mt-0.5">
            <div className="w-[5px] h-[5px] rounded-full bg-white flex items-center justify-center">
              <div className="w-[2px] h-[2px] rounded-full" style={{ background: "#0A0A1A" }} />
            </div>
            <div className="w-[5px] h-[5px] rounded-full bg-white flex items-center justify-center">
              <div className="w-[2px] h-[2px] rounded-full" style={{ background: "#0A0A1A" }} />
            </div>
          </div>
          <div className="w-[7px] h-[2px] rounded-full bg-white/60 mt-[3px]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-dm font-medium text-white">{t("awa.name")}</p>
          <p className="text-[11px] font-dm flex items-center gap-1" style={{ color: "#5DCAA5" }}>
            <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: "#1D9E75", animation: "awaPulse 2s infinite" }} />
            {t("awa.status")}
          </p>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 transition hover:brightness-150"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <AwaMessages messages={messages} sending={sending} />

      {/* Quick chips */}
      {!chipsUsed && messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => handleChip(chip.label)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-dm transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.45)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(211,84,0,0.1)";
                e.currentTarget.style.color = "#D35400";
                e.currentTarget.style.borderColor = "rgba(211,84,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <AwaInput onSend={sendMessage} disabled={sending} />
    </motion.div>
  );
}
