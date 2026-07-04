"use client";

import { useTranslation, Locale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

/**
 * Language switcher.
 * - "full": labeled block with large buttons (profile/settings pages)
 * - "compact": small inline pills (sidebars)
 */
export default function LanguageSwitcher({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { locale, setLocale, t } = useTranslation();

  if (variant === "compact") {
    return (
      <div className="flex gap-1">
        {(["en", "fr"] as const).map((lang) => {
          const active = locale === lang;
          return (
            <button
              key={lang}
              onClick={() => { trackEvent.languageSwitch(lang); setLocale(lang); }}
              className="px-3 py-1 rounded-md text-[11px] font-medium uppercase transition-colors"
              style={{
                background: active ? "rgba(211,84,0,0.15)" : "transparent",
                color: active ? "#D35400" : "rgba(255,255,255,0.3)",
                border: active ? "0.5px solid rgba(211,84,0,0.4)" : "0.5px solid transparent",
              }}
            >
              {lang}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-white/40 block">{t("common.language")}</label>
      <div className="flex gap-2">
        {([
          { key: "fr" as Locale, label: "🇫🇷 " + t("common.french") },
          { key: "en" as Locale, label: "🇬🇧 " + t("common.english") },
        ]).map((lang) => (
          <button
            key={lang.key}
            onClick={() => { trackEvent.languageSwitch(lang.key); setLocale(lang.key); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              locale === lang.key
                ? "bg-gradient-primary text-white"
                : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
