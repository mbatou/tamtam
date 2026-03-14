"use client";

import { useTranslation, Locale } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

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
            onClick={() => setLocale(lang.key)}
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
