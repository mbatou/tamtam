"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

export type Locale = "fr" | "en";

const messages: Record<Locale, Record<string, unknown>> = { fr, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === "string" ? current : path;
}

function detectLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem("tamtam-locale");
  if (stored === "en" || stored === "fr") return stored;
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "fr";
  return browserLang.startsWith("en") ? "en" : "fr";
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("tamtam-locale", newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let value = getNestedValue(messages[locale] as Record<string, unknown>, key);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return value;
  }, [locale]);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
