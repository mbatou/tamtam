"use client";

import { useTranslation } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex gap-1">
      {(["en", "fr"] as const).map((lang) => {
        const active = locale === lang;
        return (
          <button
            key={lang}
            onClick={() => setLocale(lang)}
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
