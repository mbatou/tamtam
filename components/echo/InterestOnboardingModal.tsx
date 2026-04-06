"use client";

import { useState, useEffect, useCallback } from "react";

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

interface RewardResult {
  credited: boolean;
  amount: number;
  founding: boolean;
}

interface InterestOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reward: RewardResult) => void;
  isExistingEcho: boolean;
  showReward?: boolean;
  editMode?: boolean;
  initialInterests?: string[];
  initialSignals?: string[];
}

export default function InterestOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  isExistingEcho,
  showReward = true,
  editMode = false,
  initialInterests = [],
  initialSignals = [],
}: InterestOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests);
  const [selectedSignals, setSelectedSignals] = useState<string[]>(initialSignals);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
    if (isOpen) {
      fetchData();
      if (!editMode) setStep(1);
    }
  }, [isOpen, fetchData, editMode]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const toggleSignal = (id: string) => {
    setSelectedSignals((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleDismiss = async () => {
    try {
      await fetch("/api/echo/interests/dismiss", { method: "POST" });
    } catch {
      // silent
    }
    onClose();
  };

  const handleSubmit = async () => {
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
      const data = await res.json();
      if (res.ok && data.success) {
        const result: RewardResult = {
          credited: data.reward_credited,
          amount: data.amount,
          founding: data.founding_badge,
        };
        setReward(result);
        if (editMode) {
          onComplete(result);
        } else {
          setStep(3);
          if (result.credited) setShowConfetti(true);
        }
      }
    } catch {
      // silent
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  // Edit mode: show both grids side by side
  if (editMode) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Modifier mes centres d&apos;int&eacute;r&ecirc;t</h3>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl">&times;</button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-32 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Interests */}
              <div className="mb-6">
                <h4 className="text-sm font-bold mb-1">Centres d&apos;int&eacute;r&ecirc;t</h4>
                <p className="text-xs text-white/40 mb-3">Choisis jusqu&apos;&agrave; 5 cat&eacute;gories</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                            ? "border-[#D35400] bg-[#D35400]/10"
                            : disabled
                            ? "border-white/5 bg-white/3 opacity-40 cursor-not-allowed"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 text-[#D35400] text-xs">&#10003;</span>
                        )}
                        <span className="text-xl block mb-1">{cat.emoji}</span>
                        <span className="text-xs font-bold leading-tight">{cat.name_fr}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-white/30 mt-2">{selectedInterests.length} / 5 s&eacute;lectionn&eacute;s</p>
              </div>

              {/* Signals */}
              <div className="mb-6">
                <h4 className="text-sm font-bold mb-1">Contenu partag&eacute; sur WhatsApp Status</h4>
                <p className="text-xs text-white/40 mb-3">Choisis jusqu&apos;&agrave; 3 types</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                            ? "border-[#D35400] bg-[#D35400]/10"
                            : disabled
                            ? "border-white/5 bg-white/3 opacity-40 cursor-not-allowed"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 text-[#D35400] text-xs">&#10003;</span>
                        )}
                        <span className="text-xl block mb-1">{sig.emoji}</span>
                        <span className="text-xs font-bold leading-tight">{sig.name_fr}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-white/30 mt-2">{selectedSignals.length} / 3 s&eacute;lectionn&eacute;s</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || selectedInterests.length < 1 || selectedSignals.length < 1}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#D35400] to-[#E67E22] disabled:opacity-50 transition"
              >
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Full onboarding flow (3 steps)
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto glass-card p-6 animate-slide-up">

        {/* Progress indicator */}
        {step < 3 && (
          <div className="flex gap-2 mb-5">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-[#D35400]" : "bg-white/10"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#D35400]" : "bg-white/10"}`} />
          </div>
        )}

        {/* STEP 1: Interests */}
        {step === 1 && (
          <>
            {/* Header */}
            <div className="mb-5">
              {isExistingEcho && showReward ? (
                <>
                  <p className="text-2xl mb-2">&#127881;</p>
                  <h2 className="text-lg font-bold mb-2">Tu fais partie des &Eacute;chos de Tamtam</h2>
                  <p className="text-sm text-white/60 mb-3">
                    On te demande 2 minutes pour nous dire ce que tu aimes.
                  </p>
                  <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs text-white/50">
                    <p>&#8226; <span className="text-[#1ABC9C] font-semibold">100 FCFA</span> cr&eacute;dit&eacute;s instantan&eacute;ment sur ton portefeuille</p>
                    <p>&#8226; Le badge <span className="text-[#FDEF42] font-semibold">&quot;&Eacute;cho Fondateur&quot;</span> (exclusif, jamais redistribu&eacute;)</p>
                    <p>&#8226; Des campagnes qui te correspondent mieux</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold mb-2">Bienvenue sur Tamtam!</h2>
                  <p className="text-sm text-white/60">
                    Dis-nous ce que tu aimes pour qu&apos;on te propose les meilleures campagnes.
                  </p>
                </>
              )}
            </div>

            {/* Interest grid */}
            <div className="mb-4">
              <h3 className="text-sm font-bold mb-1">Quels sont tes centres d&apos;int&eacute;r&ecirc;t?</h3>
              <p className="text-xs text-white/40 mb-3">Choisis jusqu&apos;&agrave; 5 cat&eacute;gories</p>

              {loading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                            ? "border-[#D35400] bg-[#D35400]/10"
                            : disabled
                            ? "border-white/5 bg-white/3 opacity-40 cursor-not-allowed"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 text-[#D35400] text-xs">&#10003;</span>
                        )}
                        <span className="text-xl block mb-1">{cat.emoji}</span>
                        <span className="text-xs font-bold leading-tight">{cat.name_fr}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-white/30 mt-2">{selectedInterests.length} / 5 s&eacute;lectionn&eacute;s</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleDismiss}
                className="text-xs text-white/30 hover:text-white/50 transition"
              >
                Plus tard
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedInterests.length < 1}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#D35400] to-[#E67E22] disabled:opacity-50 transition text-sm"
              >
                Continuer &rarr;
              </button>
            </div>
          </>
        )}

        {/* STEP 2: Content signals */}
        {step === 2 && (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-bold mb-1">Qu&apos;est-ce que tu partages sur ton WhatsApp Status d&apos;habitude?</h3>
              <p className="text-xs text-white/40 mb-3">Choisis jusqu&apos;&agrave; 3 types de contenu</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                          ? "border-[#D35400] bg-[#D35400]/10"
                          : disabled
                          ? "border-white/5 bg-white/3 opacity-40 cursor-not-allowed"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 text-[#D35400] text-xs">&#10003;</span>
                      )}
                      <span className="text-xl block mb-1">{sig.emoji}</span>
                      <span className="text-xs font-bold leading-tight">{sig.name_fr}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-white/30 mt-2">{selectedSignals.length} / 3 s&eacute;lectionn&eacute;s</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-white/50 hover:text-white/70 transition"
                >
                  &larr; Retour
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-white/30 hover:text-white/50 transition"
                >
                  Plus tard
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedSignals.length < 1}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#D35400] to-[#E67E22] disabled:opacity-50 transition text-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi...
                  </span>
                ) : (
                  "Terminer"
                )}
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Completion */}
        {step === 3 && reward && (
          <div className="text-center py-4">
            {/* Confetti effect */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 60}%`,
                      backgroundColor: ["#D35400", "#1ABC9C", "#FDEF42", "#E74C3C", "#3498DB"][i % 5],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
            )}

            {reward.credited ? (
              <>
                <p className="text-4xl mb-3">&#127881;</p>
                <h2 className="text-xl font-bold mb-4">F&eacute;licitations!</h2>
                <div className="glass-card p-4 mb-4 inline-block">
                  <p className="text-2xl font-black text-[#1ABC9C]">+100 FCFA</p>
                  <p className="text-xs text-white/50 mt-1">cr&eacute;dit&eacute;s sur ton portefeuille</p>
                </div>
                <div className="bg-[#FDEF42]/10 border border-[#FDEF42]/20 rounded-xl p-4 mb-5">
                  <p className="text-lg mb-1">&#129351;</p>
                  <p className="text-sm font-bold text-[#FDEF42]">Tu es maintenant un &quot;&Eacute;cho Fondateur&quot;</p>
                  <p className="text-xs text-white/40 mt-1">Ce badge est exclusif &mdash; il ne sera jamais redonn&eacute;.</p>
                </div>
                <div className="flex gap-3">
                  <a
                    href="/portefeuille"
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#1ABC9C] to-[#16A085] text-sm text-center"
                  >
                    Voir mon portefeuille
                  </a>
                  <button
                    onClick={() => { onComplete(reward); }}
                    className="flex-1 py-3 rounded-xl font-semibold text-white/60 border border-white/10 text-sm hover:bg-white/5 transition"
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">&#10024;</p>
                <h2 className="text-xl font-bold mb-2">Merci!</h2>
                <p className="text-sm text-white/60 mb-5">
                  Tes pr&eacute;f&eacute;rences sont enregistr&eacute;es.<br />
                  Tu verras bient&ocirc;t des campagnes qui te correspondent mieux.
                </p>
                <button
                  onClick={() => { onComplete(reward); }}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#D35400] to-[#E67E22] text-sm"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
