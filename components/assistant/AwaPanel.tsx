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
    <>
      {/* Backdrop for mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[97] lg:hidden"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={() => setOpen(false)}
      />

      {/* Floating chat bubble */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="fixed z-[98] flex flex-col"
        style={{
          bottom: 88,
          right: 16,
          width: "min(360px, calc(100vw - 32px))",
          height: "min(520px, calc(100vh - 120px))",
          background: "#0D0D20",
          borderRadius: 20,
          border: "0.5px solid rgba(255,255,255,0.1)",
          boxShadow: "0 16px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(211,84,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(211,84,0,0.08) 0%, transparent 100%)",
            borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Mini robot */}
          <div
            className="w-8 h-8 rounded-[10px] flex flex-col items-center justify-center shrink-0"
            style={{ background: "#D35400" }}
          >
            <div className="flex gap-[4px] mt-0.5">
              <div className="w-[4px] h-[4px] rounded-full bg-white flex items-center justify-center">
                <div className="w-[2px] h-[2px] rounded-full" style={{ background: "#0A0A1A" }} />
              </div>
              <div className="w-[4px] h-[4px] rounded-full bg-white flex items-center justify-center">
                <div className="w-[2px] h-[2px] rounded-full" style={{ background: "#0A0A1A" }} />
              </div>
            </div>
            <div className="w-[6px] h-[1.5px] rounded-full bg-white/60 mt-[2px]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-dm font-semibold text-white">{t("awa.name")}</p>
            <p className="text-[10px] font-dm flex items-center gap-1" style={{ color: "#5DCAA5" }}>
              <span
                className="w-[5px] h-[5px] rounded-full inline-block"
                style={{ background: "#1D9E75", animation: "awaPulse 2s infinite" }}
              />
              {t("awa.status")}
            </p>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <AwaMessages messages={messages} sending={sending} />

        {/* Quick chips */}
        {!chipsUsed && messages.length === 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
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
    </>
  );
}
