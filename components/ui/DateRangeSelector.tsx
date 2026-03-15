"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export interface DateRange {
  key: string;
  from: string | null;
  to: string | null;
}

interface DateRangeSelectorProps {
  value: string;
  onChange: (range: DateRange) => void;
}

function getPresetRange(key: string): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case "today":
      return { key, from: todayStart.toISOString(), to: now.toISOString() };
    case "week": {
      const weekAgo = new Date(todayStart);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { key, from: weekAgo.toISOString(), to: now.toISOString() };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { key, from: monthStart.toISOString(), to: now.toISOString() };
    }
    case "all":
      return { key, from: null, to: null };
    default:
      return { key, from: null, to: null };
  }
}

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const presets = [
    { key: "today", label: t("dateRange.today") },
    { key: "week", label: t("dateRange.thisWeek") },
    { key: "month", label: t("dateRange.thisMonth") },
    { key: "all", label: t("dateRange.allTime") },
  ];

  function handlePreset(key: string) {
    setShowCustom(false);
    onChange(getPresetRange(key));
  }

  function handleCustomApply() {
    if (customFrom && customTo) {
      onChange({
        key: "custom",
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo + "T23:59:59").toISOString(),
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => handlePreset(p.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            value === p.key && !showCustom
              ? "bg-gradient-primary text-white"
              : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          showCustom || value === "custom"
            ? "bg-gradient-primary text-white"
            : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
        }`}
      >
        {t("dateRange.custom")}
      </button>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-primary"
          />
          <span className="text-white/30 text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-bold hover:bg-accent/30 transition disabled:opacity-40"
          >
            {t("dateRange.apply")}
          </button>
        </div>
      )}
    </div>
  );
}

export { getPresetRange };
