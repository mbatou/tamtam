"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";

interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  emoji: string;
  sort_order: number;
}

interface Signal {
  id: string;
  name_fr: string;
  name_en: string;
  emoji: string;
  sort_order: number;
}

interface StepInterestsProps {
  onComplete: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function StepInterests({ onComplete, onBack, onSkip }: StepInterestsProps) {
  const { t, locale } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"interests" | "signals">("interests");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/echo/interests");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setSignals(data.signals || []);
        if (data.selectedInterests?.length) setSelectedInterests(data.selectedInterests);
        if (data.selectedSignals?.length) setSelectedSignals(data.selectedSignals);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleInterest(id: string) {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  function toggleSignal(id: string) {
    setSelectedSignals((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/echo/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest_ids: selectedInterests,
          signal_ids: selectedSignals,
        }),
      });
      if (res.ok) {
        onComplete();
      }
    } catch {
      // silent
    }
    setSubmitting(false);
  }

  const getName = (item: { name_fr: string; name_en: string }) =>
    locale === "en" ? item.name_en : item.name_fr;

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <div className="mb-6">
          <div className="skeleton h-6 w-48 rounded-xl mb-2" />
          <div className="skeleton h-4 w-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {phase === "interests" ? (
        <>
          <div className="mb-5">
            <p className="text-2xl mb-2">🎯</p>
            <h2 className="text-xl font-bold font-syne mb-2">
              {t("echo.onboarding.interestsTitle")}
            </h2>
            <p className="text-sm text-white/50">
              {t("echo.onboarding.interestsDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {categories.map((cat) => {
              const selected = selectedInterests.includes(cat.id);
              const disabled = !selected && selectedInterests.length >= 5;
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleInterest(cat.id)}
                  disabled={disabled}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? "border-[#1D9E75] bg-[#1D9E75]/10"
                      : disabled
                      ? "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
                      : "border-white/8 bg-white/[0.03] hover:border-white/15"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 text-[#1D9E75] text-xs">✓</span>
                  )}
                  <span className="text-xl block mb-1">{cat.emoji}</span>
                  <span className="text-xs font-bold leading-tight">{getName(cat)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/30 mb-4">{selectedInterests.length} / 5</p>

          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-xs text-white/50 hover:text-white/70 transition"
              >
                ← {t("common.back")}
              </button>
              <button
                onClick={onSkip}
                className="text-xs text-white/30 hover:text-white/50 transition"
              >
                {t("echo.onboarding.skip")}
              </button>
            </div>
            <button
              onClick={() => setPhase("signals")}
              disabled={selectedInterests.length < 1}
              className="px-6 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-40 transition text-sm"
            >
              {t("echo.onboarding.continue")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-2xl mb-2">📢</p>
            <h2 className="text-xl font-bold font-syne mb-2">
              {t("echo.onboarding.signalsTitle")}
            </h2>
            <p className="text-sm text-white/50">
              {t("echo.onboarding.signalsDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {signals.map((sig) => {
              const selected = selectedSignals.includes(sig.id);
              const disabled = !selected && selectedSignals.length >= 3;
              return (
                <button
                  key={sig.id}
                  onClick={() => toggleSignal(sig.id)}
                  disabled={disabled}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? "border-[#1D9E75] bg-[#1D9E75]/10"
                      : disabled
                      ? "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
                      : "border-white/8 bg-white/[0.03] hover:border-white/15"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 text-[#1D9E75] text-xs">✓</span>
                  )}
                  <span className="text-xl block mb-1">{sig.emoji}</span>
                  <span className="text-xs font-bold leading-tight">{getName(sig)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/30 mb-4">{selectedSignals.length} / 3</p>

          <div className="mt-auto flex items-center justify-between pt-4">
            <button
              onClick={() => setPhase("interests")}
              className="text-xs text-white/50 hover:text-white/70 transition"
            >
              ← {t("common.back")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedSignals.length < 1}
              className="px-6 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-40 transition text-sm"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("common.saving")}
                </span>
              ) : (
                t("echo.onboarding.finish")
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
