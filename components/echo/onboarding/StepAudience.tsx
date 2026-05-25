"use client";

import { AUDIENCE_SIZES } from "@/lib/onboarding";
import { useTranslation } from "@/lib/i18n";

const AUDIENCE_I18N_KEYS: Record<string, { label: string; sublabel: string }> = {
  small: { label: "echo.onboarding.audienceSmallLabel", sublabel: "echo.onboarding.audienceSmallSublabel" },
  medium: { label: "echo.onboarding.audienceMediumLabel", sublabel: "echo.onboarding.audienceMediumSublabel" },
  growing: { label: "echo.onboarding.audienceGrowingLabel", sublabel: "echo.onboarding.audienceGrowingSublabel" },
  large: { label: "echo.onboarding.audienceLargeLabel", sublabel: "echo.onboarding.audienceLargeSublabel" },
};

interface StepAudienceProps {
  primaryPlatformLabel: string;
  selected: string | null;
  onChange: (size: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function StepAudience({ primaryPlatformLabel, selected, onChange, onNext, onBack, onSkip }: StepAudienceProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-6">
        <p className="text-2xl mb-2">👥</p>
        <h2 className="text-xl font-bold font-syne mb-2">
          {t("echo.onboarding.audienceTitle")}
        </h2>
        <p className="text-sm text-white/50">
          {t("echo.onboarding.audienceDesc", { platform: primaryPlatformLabel })}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {AUDIENCE_SIZES.map((size) => {
          const isSelected = selected === size.id;
          const keys = AUDIENCE_I18N_KEYS[size.id];
          return (
            <button
              key={size.id}
              onClick={() => onChange(size.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                isSelected
                  ? "border-[#1D9E75] bg-[#1D9E75]/10"
                  : "border-white/8 bg-white/[0.03] hover:border-white/15"
              }`}
            >
              <span className="text-2xl">{size.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isSelected ? "text-[#1D9E75]" : "text-white"}`}>
                  {keys ? t(keys.label) : size.label}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{keys ? t(keys.sublabel) : size.sublabel}</p>
              </div>
              {isSelected && (
                <span className="text-[#1D9E75] text-sm font-bold shrink-0">✓</span>
              )}
            </button>
          );
        })}
      </div>

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
          onClick={onNext}
          disabled={!selected}
          className="px-6 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-40 transition text-sm"
        >
          {t("echo.onboarding.continue")}
        </button>
      </div>
    </div>
  );
}
