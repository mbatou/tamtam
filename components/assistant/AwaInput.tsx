"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";

export default function AwaInput({
  onSend,
  disabled,
}: {
  onSend: (msg: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  function handleSend() {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <div className="px-3 py-3 flex items-center gap-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder={t("awa.placeholder")}
        disabled={disabled}
        className="flex-1 rounded-lg px-3 py-2 text-[12px] font-dm text-white focus:outline-none min-w-0 disabled:opacity-40"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all hover:brightness-110 disabled:opacity-30"
        style={{ background: "#D35400" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
