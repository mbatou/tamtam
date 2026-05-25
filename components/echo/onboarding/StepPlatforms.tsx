"use client";

import { PLATFORM_LIST } from "@/lib/onboarding";
import { useTranslation } from "@/lib/i18n";

interface StepPlatformsProps {
  selected: string[];
  onChange: (platforms: string[]) => void;
  onNext: () => void;
  onSkip: () => void;
}

export default function StepPlatforms({ selected, onChange, onNext, onSkip }: StepPlatformsProps) {
  const { t } = useTranslation();

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-6">
        <p className="text-2xl mb-2">📱</p>
        <h2 className="text-xl font-bold font-syne mb-2">
          {t("echo.onboarding.platformsTitle")}
        </h2>
        <p className="text-sm text-white/50">
          {t("echo.onboarding.platformsDesc")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {PLATFORM_LIST.map((platform) => {
          const isSelected = selected.includes(platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => toggle(platform.id)}
              className="relative p-4 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: isSelected ? platform.color : "rgba(255,255,255,0.08)",
                backgroundColor: isSelected ? platform.bg : "rgba(255,255,255,0.03)",
              }}
            >
              {isSelected && (
                <span
                  className="absolute top-2 right-2 text-xs font-bold"
                  style={{ color: platform.color }}
                >
                  ✓
                </span>
              )}
              <span className="text-sm font-bold block" style={{ color: isSelected ? platform.color : "rgba(255,255,255,0.7)" }}>
                {platform.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <button
          onClick={onSkip}
          className="text-xs text-white/30 hover:text-white/50 transition"
        >
          {t("echo.onboarding.skip")}
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="px-6 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] disabled:opacity-40 transition text-sm"
        >
          {t("echo.onboarding.continue")}
        </button>
      </div>
    </div>
  );
}
