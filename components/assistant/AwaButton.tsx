"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAwa } from "./AwaProvider";
import { useTranslation } from "@/lib/i18n";

export default function AwaButton() {
  const { open, setOpen, unread } = useAwa();
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  useEffect(() => {
    if (tooltipDismissed || open) return;
    const show = setTimeout(() => setShowTooltip(true), 2000);
    const hide = setTimeout(() => setShowTooltip(false), 7000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [tooltipDismissed, open]);

  function handleClick() {
    setOpen(!open);
    setShowTooltip(false);
    setTooltipDismissed(true);
  }

  return (
    <>
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed z-[99] pointer-events-none"
            style={{
              bottom: 90,
              right: open ? 340 : 20,
              transition: "right 0.3s ease",
            }}
          >
            <div
              className="px-3 py-2 rounded-lg text-[11px] font-dm whitespace-nowrap"
              style={{
                background: "#111128",
                border: "0.5px solid rgba(211,84,0,0.3)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {t("awa.tooltip")}
              <div
                className="absolute -bottom-1 right-5 w-2 h-2 rotate-45"
                style={{ background: "#111128", borderRight: "0.5px solid rgba(211,84,0,0.3)", borderBottom: "0.5px solid rgba(211,84,0,0.3)" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Robot button */}
      <motion.button
        onClick={handleClick}
        className="fixed z-[100] cursor-pointer"
        style={{
          bottom: 24,
          right: open ? 336 : 16,
          transition: "right 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
        animate={{ y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        aria-label="Awa assistant"
      >
        {/* Shadow */}
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-[6px] rounded-full"
          style={{ background: "rgba(211,84,0,0.15)", filter: "blur(3px)" }}
          animate={{ width: ["40px", "28px", "40px"], opacity: [0.3, 0.12, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Body */}
        <div
          className="w-[56px] h-[56px] rounded-2xl flex flex-col items-center justify-center relative"
          style={{ background: "#D35400", boxShadow: "0 4px 20px rgba(211,84,0,0.3)" }}
        >
          {/* Antenna */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-[3px] h-[10px] rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
            <div className="w-[5px] h-[5px] rounded-full bg-white" style={{ animation: "awaPulse 2s infinite" }} />
          </div>

          {/* Eyes */}
          <div className="flex gap-[10px] mt-1">
            <div className="w-[9px] h-[9px] rounded-full bg-white flex items-center justify-center">
              <div className="w-[4px] h-[4px] rounded-full" style={{ background: "#0A0A1A", animation: "awaBlink 4s infinite" }} />
            </div>
            <div className="w-[9px] h-[9px] rounded-full bg-white flex items-center justify-center">
              <div className="w-[4px] h-[4px] rounded-full" style={{ background: "#0A0A1A", animation: "awaBlink 4s infinite" }} />
            </div>
          </div>

          {/* Mouth */}
          <div className="w-[12px] h-[3px] rounded-full bg-white/60 mt-[5px]" />
        </div>

        {/* Notification dot */}
        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "#1D9E75" }}
            >
              {unread}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Keyframe styles */}
      <style jsx global>{`
        @keyframes awaBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes awaPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes awaTypingDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}
