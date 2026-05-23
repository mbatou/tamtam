"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { AwaMessage, AwaBrandData } from "@/types/awa";

interface AwaContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: AwaMessage[];
  sending: boolean;
  sendMessage: (content: string) => void;
  brandData: AwaBrandData;
  setBrandData: (d: AwaBrandData) => void;
  chipsUsed: boolean;
  setChipsUsed: (v: boolean) => void;
  unread: number;
}

const AwaContext = createContext<AwaContextType | null>(null);

export function useAwa() {
  const ctx = useContext(AwaContext);
  if (!ctx) throw new Error("useAwa must be used inside AwaProvider");
  return ctx;
}

export default function AwaProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<AwaMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [chipsUsed, setChipsUsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [brandData, setBrandData] = useState<AwaBrandData>({
    walletBalance: 0,
    totalSpent: 0,
    activeCampaigns: 0,
    totalCampaigns: 0,
    totalClicks: 0,
    language: "fr",
    brandName: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    if (v) setUnread(0);
  }, []);

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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "Something went wrong. Please try again." }
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
      value={{ open, setOpen, messages, sending, sendMessage, brandData, setBrandData, chipsUsed, setChipsUsed, unread }}
    >
      {children}
    </AwaContext.Provider>
  );
}
