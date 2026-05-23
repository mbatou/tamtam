"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import type { TourStep } from "@/lib/awa-tours";

interface Props {
  steps: TourStep[];
  onFinish: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getBubblePosition(
  rect: TargetRect,
  position: TourStep["position"],
  bubbleW: number,
  bubbleH: number
) {
  const pad = 16;
  const robotSize = 48;
  let robotX: number, robotY: number, bubbleX: number, bubbleY: number;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  switch (position) {
    case "bottom":
      robotX = rect.left + rect.width / 2 - robotSize / 2;
      robotY = rect.top + rect.height + pad;
      bubbleX = robotX + robotSize + 8;
      bubbleY = robotY - 4;
      break;
    case "top":
      robotX = rect.left + rect.width / 2 - robotSize / 2;
      robotY = rect.top - robotSize - pad;
      bubbleX = robotX + robotSize + 8;
      bubbleY = robotY - 4;
      break;
    case "left":
      robotX = rect.left - robotSize - pad;
      robotY = rect.top + rect.height / 2 - robotSize / 2;
      bubbleX = robotX - bubbleW - 8;
      bubbleY = robotY - 8;
      break;
    case "right":
      robotX = rect.left + rect.width + pad;
      robotY = rect.top + rect.height / 2 - robotSize / 2;
      bubbleX = robotX + robotSize + 8;
      bubbleY = robotY - 8;
      break;
  }

  if (bubbleX + bubbleW > vw - 16) bubbleX = vw - bubbleW - 16;
  if (bubbleX < 16) bubbleX = 16;
  if (bubbleY + bubbleH > vh - 16) bubbleY = vh - bubbleH - 16;
  if (bubbleY < 16) bubbleY = 16;

  if (robotX + robotSize > vw - 8) robotX = vw - robotSize - 8;
  if (robotX < 8) robotX = 8;
  if (robotY + robotSize > vh - 8) robotY = vh - robotSize - 8;
  if (robotY < 8) robotY = 8;

  return { robotX, robotY, bubbleX, bubbleY };
}

export default function AwaTourOverlay({ steps, onFinish }: Props) {
  const { locale } = useTranslation();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const resizeRef = useRef<ReturnType<typeof setTimeout>>();
  const isFR = locale === "fr";

  const currentStep = steps[step];

  const findTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    const delay = setTimeout(findTarget, 200);
    const handleResize = () => {
      clearTimeout(resizeRef.current);
      resizeRef.current = setTimeout(findTarget, 100);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      clearTimeout(delay);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [findTarget]);

  function handleNext() {
    if (step < steps.length - 1) setStep(step + 1);
    else onFinish();
  }

  function handleSkip() {
    onFinish();
  }

  if (!currentStep) return null;

  const bubbleW = 260;
  const bubbleH = 120;
  const pos = targetRect
    ? getBubblePosition(targetRect, currentStep.position, bubbleW, bubbleH)
    : { robotX: window.innerWidth / 2 - 24, robotY: window.innerHeight / 2, bubbleX: window.innerWidth / 2 + 40, bubbleY: window.innerHeight / 2 - 20 };

  const message = isFR ? currentStep.message.fr : currentStep.message.en;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: "none" }}>
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
        <defs>
          <mask id="awa-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#awa-spotlight)"
          onClick={handleSkip}
        />
      </svg>

      {/* Spotlight border glow */}
      {targetRect && (
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: "2px solid rgba(211,84,0,0.4)",
            boxShadow: "0 0 24px rgba(211,84,0,0.15), inset 0 0 24px rgba(211,84,0,0.05)",
          }}
        />
      )}

      {/* Awa robot — moves to each target */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: pos.robotX, y: pos.robotY }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute"
          style={{ pointerEvents: "none", zIndex: 210 }}
        >
          <motion.div
            animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center relative"
              style={{ background: "#D35400", boxShadow: "0 6px 24px rgba(211,84,0,0.4)" }}
            >
              {/* Antenna */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-[2px] h-[8px] rounded-full bg-white/40" />
                <div className="w-[4px] h-[4px] rounded-full bg-white" style={{ animation: "awaPulse 2s infinite" }} />
              </div>
              {/* Eyes */}
              <div className="flex gap-[8px] mt-1">
                <div className="w-[7px] h-[7px] rounded-full bg-white flex items-center justify-center">
                  <div className="w-[3px] h-[3px] rounded-full" style={{ background: "#0A0A1A", animation: "awaBlink 4s infinite" }} />
                </div>
                <div className="w-[7px] h-[7px] rounded-full bg-white flex items-center justify-center">
                  <div className="w-[3px] h-[3px] rounded-full" style={{ background: "#0A0A1A", animation: "awaBlink 4s infinite" }} />
                </div>
              </div>
              {/* Mouth — smile during tour */}
              <div className="w-[10px] h-[5px] rounded-b-full border-b-2 border-x-2 border-white/60 mt-[3px]" />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
          className="absolute"
          style={{
            left: pos.bubbleX,
            top: pos.bubbleY,
            width: bubbleW,
            pointerEvents: "auto",
            zIndex: 220,
          }}
        >
          <div
            className="rounded-2xl px-4 py-3.5"
            style={{
              background: "linear-gradient(135deg, #1a1a38 0%, #111128 100%)",
              border: "1px solid rgba(211,84,0,0.2)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Step counter */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="h-[3px] rounded-full transition-all"
                    style={{
                      width: i === step ? 16 : 6,
                      background: i === step ? "#D35400" : i < step ? "rgba(211,84,0,0.3)" : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>
                {step + 1}/{steps.length}
              </span>
            </div>

            {/* Message */}
            <p className="text-[12px] font-dm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
              {message}
            </p>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-[11px] font-dm transition hover:text-white/60"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {isFR ? "Passer" : "Skip"}
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-medium transition"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {isFR ? "Retour" : "Back"}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-dm font-bold text-white transition hover:brightness-110"
                  style={{ background: isLast ? "#1D9E75" : "#D35400" }}
                >
                  {isLast ? (isFR ? "Merci !" : "Thanks!") : (isFR ? "Suivant" : "Next")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
