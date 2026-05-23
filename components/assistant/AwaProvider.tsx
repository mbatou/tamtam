"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import type { AwaMessage, AwaBrandData } from "@/types/awa";
import { TOURS, type TourStep } from "@/lib/awa-tours";

interface AwaContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: AwaMessage[];
  sending: boolean;
  sendMessage: (content: string) => void;
  brandData: AwaBrandData;
  chipsUsed: boolean;
  setChipsUsed: (v: boolean) => void;
  unread: number;
  currentPage: string;
  tourActive: boolean;
  tourSteps: TourStep[];
  startTour: (tourId?: string) => void;
  endTour: () => void;
}

const AwaContext = createContext<AwaContextType | null>(null);

export function useAwa() {
  const ctx = useContext(AwaContext);
  if (!ctx) throw new Error("useAwa must be used inside AwaProvider");
  return ctx;
}

const PAGE_MAP: Record<string, string> = {
  "/admin/dashboard": "overview",
  "/admin/campaigns": "campaigns",
  "/admin/wallet": "wallet",
  "/admin/pixel": "pixel",
  "/admin/settings": "settings",
  "/admin/support": "support",
  "/admin/analytics": "analytics",
};

function resolvePageKey(pathname: string): string {
  return PAGE_MAP[pathname] || "overview";
}

const SEEN_TOURS_KEY = "awa-seen-tours";

function getSeenTours(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_TOURS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markTourSeen(tourId: string) {
  const seen = getSeenTours();
  seen.add(tourId);
  localStorage.setItem(SEEN_TOURS_KEY, JSON.stringify(Array.from(seen)));
}

export default function AwaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale } = useTranslation();
  const currentPage = resolvePageKey(pathname);

  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<AwaMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [chipsUsed, setChipsUsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [brandData, setBrandData] = useState<AwaBrandData>({
    walletBalance: 0,
    totalSpent: 0,
    activeCampaigns: 0,
    totalCampaigns: 0,
    totalClicks: 0,
    totalEchos: 0,
    avgCpc: 0,
    language: locale,
    brandName: "",
    currentPage,
  });
  const abortRef = useRef<AbortController | null>(null);
  const dataFetchedRef = useRef(false);
  const autoTourTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setBrandData((prev) => ({ ...prev, currentPage, language: locale }));
  }, [currentPage, locale]);

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setBrandData((prev) => ({
          ...prev,
          walletBalance: data.walletBalance || 0,
          totalSpent: data.budgetSpent || 0,
          activeCampaigns: data.activeRythmes || 0,
          totalCampaigns: data.totalCampaigns || 0,
          totalClicks: data.totalClicks || data.validClicks || 0,
          totalEchos: data.activeEchos || 0,
          avgCpc: data.validClicks && data.budgetSpent ? Math.round(data.budgetSpent / data.validClicks) : 0,
          brandName: data.brandName || prev.brandName,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setChipsUsed(false);
  }, [currentPage]);

  // Auto-offer tour on first visit to a page (if not seen before)
  useEffect(() => {
    if (tourActive) return;
    if (autoTourTriggeredRef.current.has(currentPage)) return;
    autoTourTriggeredRef.current.add(currentPage);

    const seen = getSeenTours();
    const tour = TOURS.find((t) => t.page === currentPage);
    if (tour && !seen.has(tour.id)) {
      const delay = setTimeout(() => {
        const hasTargets = tour.steps.some((s) => document.querySelector(s.target));
        if (hasTargets) {
          setTourSteps(tour.steps);
          setTourActive(true);
        }
      }, 2000);
      return () => clearTimeout(delay);
    }
  }, [currentPage, tourActive]);

  const startTour = useCallback((tourId?: string) => {
    const id = tourId || currentPage;
    const tour = TOURS.find((t) => t.id === id || t.page === id);
    if (tour) {
      setTourSteps(tour.steps);
      setTourActive(true);
      setOpenState(false);
    }
  }, [currentPage]);

  const endTour = useCallback(() => {
    setTourActive(false);
    const tour = TOURS.find((t) => t.steps === tourSteps);
    if (tour) markTourSeen(tour.id);
    setTourSteps([]);
  }, [tourSteps]);

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    if (v) {
      setUnread(0);
      if (tourActive) {
        setTourActive(false);
        setTourSteps([]);
      }
    }
  }, [tourActive]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || sending) return;

      const userMsg: AwaMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setSending(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
      ]);

      try {
        abortRef.current = new AbortController();
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/awa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages, brandData }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text();
          if (errText === "AWA_NOT_CONFIGURED") {
            throw new Error("__AWA_NOT_CONFIGURED__");
          }
          if (res.status === 429) {
            throw new Error("__RATE_LIMIT__");
          }
          throw new Error("Stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snap = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m))
          );
        }

        if (!open) setUnread((u) => u + 1);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        let fallback = "Something went wrong. Please try again.";
        if (err instanceof Error) {
          if (err.message === "__AWA_NOT_CONFIGURED__") {
            fallback = brandData.language === "fr"
              ? "Awa est en cours de configuration. Veuillez réessayer plus tard."
              : "Awa is being configured. Please try again later.";
          } else if (err.message === "__RATE_LIMIT__") {
            fallback = brandData.language === "fr"
              ? "Vous avez atteint la limite de messages. Veuillez patienter un moment."
              : "You've reached the message limit. Please wait a moment.";
          }
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || fallback }
              : m
          )
        );
      } finally {
        setSending(false);
      }
    },
    [messages, brandData, sending, open]
  );

  return (
    <AwaContext.Provider
      value={{
        open, setOpen, messages, sending, sendMessage, brandData,
        chipsUsed, setChipsUsed, unread, currentPage,
        tourActive, tourSteps, startTour, endTour,
      }}
    >
      {children}
    </AwaContext.Provider>
  );
}
