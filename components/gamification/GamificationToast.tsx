"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";

interface ToastData {
  id: string;
  type: "milestone" | "streak";
  title?: string;
  amount: number;
  count?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss]);

  const message =
    toast.type === "milestone"
      ? t("gamification.newBadge", {
          title: toast.title ?? "",
          amount: formatFCFA(toast.amount),
        })
      : t("gamification.streakReward", {
          count: toast.count ?? 0,
          amount: formatFCFA(toast.amount),
        });

  const icon = toast.type === "milestone" ? "🎉" : "🔥";

  return (
    <div
      className={`w-full max-w-sm mx-auto rounded-xl px-4 py-3 shadow-lg transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
      style={{ backgroundColor: "rgba(26, 188, 156, 0.9)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-semibold text-white flex-1">{message}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="text-white/70 hover:text-white text-lg leading-none"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export function useGamificationToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showMilestoneToast = useCallback(
    (title: string, amount: number) => {
      const id = `toast-${++idCounter.current}`;
      setToasts((prev) => [
        ...prev,
        { id, type: "milestone", title, amount },
      ]);
    },
    []
  );

  const showStreakToast = useCallback(
    (count: number, amount: number) => {
      const id = `toast-${++idCounter.current}`;
      setToasts((prev) => [
        ...prev,
        { id, type: "streak", count, amount },
      ]);
    },
    []
  );

  const ToastContainer = useCallback(
    () => (
      <div className="fixed top-4 left-0 right-0 z-50 flex flex-col gap-2 px-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    ),
    [toasts, dismiss]
  );

  return {
    showMilestoneToast,
    showStreakToast,
    ToastContainer,
  };
}
