"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAwa } from "./AwaProvider";
import { useTranslation } from "@/lib/i18n";

const NUDGES: Record<string, { fr: string[]; en: string[] }> = {
  overview: {
    fr: [
      "Besoin d'aide pour lire vos stats ?",
      "Créons une campagne ensemble !",
      "Votre solde est prêt, on lance un rythme ?",
    ],
    en: [
      "Need help reading your stats?",
      "Let's create a campaign together!",
      "Your balance is ready, launch a rythme?",
    ],
  },
  campaigns: {
    fr: [
      "Cliquez 'Nouveau Rythme' pour lancer !",
      "Je peux vous aider à choisir l'objectif",
      "Optimisons votre budget ensemble",
    ],
    en: [
      "Click 'New Rythme' to launch!",
      "I can help you choose the objective",
      "Let's optimize your budget together",
    ],
  },
  wallet: {
    fr: [
      "Rechargez ici via Wave !",
      "Je vous explique vos transactions",
      "Besoin de recharger votre solde ?",
    ],
    en: [
      "Top up here via Wave!",
      "I'll explain your transactions",
      "Need to top up your balance?",
    ],
  },
  pixel: {
    fr: [
      "Installez le Pixel en 5 min !",
      "Je vous guide étape par étape",
      "Suivez vos conversions ici",
    ],
    en: [
      "Install the Pixel in 5 min!",
      "I'll guide you step by step",
      "Track your conversions here",
    ],
  },
  settings: {
    fr: [
      "Configurez votre profil ici",
      "Ajoutez votre logo de marque",
      "Invitez votre équipe !",
    ],
    en: [
      "Set up your profile here",
      "Add your brand logo",
      "Invite your team!",
    ],
  },
  support: {
    fr: [
      "Une question ? Je suis là !",
      "Consultez la FAQ d'abord",
      "Créez un ticket si besoin",
    ],
    en: [
      "Have a question? I'm here!",
      "Check the FAQ first",
      "Create a ticket if needed",
    ],
  },
  analytics: {
    fr: [
      "Analysons vos performances !",
      "Je peux expliquer vos métriques",
      "Améliorons votre CTR ensemble",
    ],
    en: [
      "Let's analyze your performance!",
      "I can explain your metrics",
      "Let's improve your CTR together",
    ],
  },
};

export default function AwaButton() {
  const { open, setOpen, unread, currentPage } = useAwa();
  const { locale } = useTranslation();
  const [nudgeText, setNudgeText] = useState("");
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const nudgeIndexRef = useRef(0);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setNudgeDismissed(false);
    nudgeIndexRef.current = 0;
  }, [currentPage]);

  useEffect(() => {
    if (open || nudgeDismissed) {
      setShowNudge(false);
      return;
    }

    function showNext() {
      const pageNudges = NUDGES[currentPage] || NUDGES.overview;
      const langNudges = locale === "en" ? pageNudges.en : pageNudges.fr;
      const idx = nudgeIndexRef.current % langNudges.length;
      setNudgeText(langNudges[idx]);
      setShowNudge(true);
      nudgeIndexRef.current++;

      nudgeTimerRef.current = setTimeout(() => {
        setShowNudge(false);
        nudgeTimerRef.current = setTimeout(showNext, 12000);
      }, 5000);
    }

    nudgeTimerRef.current = setTimeout(showNext, 4000);
    return () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current); };
  }, [open, nudgeDismissed, currentPage, locale]);

  function handleClick() {
    setOpen(!open);
    setShowNudge(false);
    setNudgeDismissed(true);
  }

  return (
    <>
      {/* Nudge bubble */}
      <AnimatePresence>
        {showNudge && !open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed z-[99] cursor-pointer"
            style={{ bottom: 88, right: 16 }}
            onClick={handleClick}
          >
            <div
              className="px-3.5 py-2.5 rounded-xl text-[12px] font-dm leading-snug max-w-[200px]"
              style={{
                background: "linear-gradient(135deg, #1a1a35 0%, #111128 100%)",
                border: "0.5px solid rgba(211,84,0,0.25)",
                color: "rgba(255,255,255,0.85)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(211,84,0,0.08)",
              }}
            >
              <div className="flex items-start gap-2">
                <div className="w-[18px] h-[18px] rounded-md flex flex-col items-center justify-center shrink-0 mt-0.5" style={{ background: "#D35400" }}>
                  <div className="flex gap-[3px]">
                    <div className="w-[3px] h-[3px] rounded-full bg-white" />
                    <div className="w-[3px] h-[3px] rounded-full bg-white" />
                  </div>
                  <div className="w-[5px] h-[1.5px] rounded-full bg-white/60 mt-[1.5px]" />
                </div>
                <span>{nudgeText}</span>
              </div>
              {/* Arrow pointing down to the button */}
              <div
                className="absolute -bottom-[6px] right-6 w-3 h-3 rotate-45"
                style={{
                  background: "#111128",
                  borderRight: "0.5px solid rgba(211,84,0,0.25)",
                  borderBottom: "0.5px solid rgba(211,84,0,0.25)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Robot button */}
      <motion.button
        onClick={handleClick}
        className="fixed z-[100] cursor-pointer"
        style={{ bottom: 24, right: 16 }}
        animate={{ y: [0, -6, 0], rotate: [-1, 1, -1] }}
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
          className="w-[52px] h-[52px] rounded-2xl flex flex-col items-center justify-center relative"
          style={{ background: "#D35400", boxShadow: "0 4px 20px rgba(211,84,0,0.3)" }}
        >
          {/* Antenna */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-[3px] h-[10px] rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
            <div className="w-[5px] h-[5px] rounded-full bg-white" style={{ animation: "awaPulse 2s infinite" }} />
          </div>

          {/* Eyes */}
          <div className="flex gap-[9px] mt-1">
            <div className="w-[8px] h-[8px] rounded-full bg-white flex items-center justify-center">
              <div className="w-[3.5px] h-[3.5px] rounded-full" style={{ background: "#0A0A1A", animation: "awaBlink 4s infinite" }} />
            </div>
            <div className="w-[8px] h-[8px] rounded-full bg-white flex items-center justify-center">
              <div className="w-[3.5px] h-[3.5px] rounded-full" style={{ background: "#0A0A1A", animation: "awaBlink 4s infinite" }} />
            </div>
          </div>

          {/* Mouth */}
          <div className="w-[10px] h-[3px] rounded-full bg-white/60 mt-[4px]" />
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
