"use client";

import { InputHTMLAttributes, ReactNode } from "react";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  rightLabel?: ReactNode;
  accentColor?: "orange" | "teal";
}

const focusRing = {
  orange: "focus:border-[#D35400]/50 focus:ring-1 focus:ring-[#D35400]/20",
  teal: "focus:border-[#1D9E75]/50 focus:ring-1 focus:ring-[#1D9E75]/20",
};

export default function FormField({
  label,
  value,
  onChange,
  error,
  hint,
  rightLabel,
  accentColor = "orange",
  className = "",
  ...inputProps
}: FormFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-white/50 font-dm">{label}</label>
        {rightLabel}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-[#141420] border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 font-dm transition-all outline-none ${
          error
            ? "border-red-500/40"
            : `border-white/[0.07] ${focusRing[accentColor]}`
        }`}
        {...inputProps}
      />
      {error && <p className="mt-1.5 text-xs text-red-400 font-dm">{error}</p>}
      {hint && !error && <div className="mt-1.5">{hint}</div>}
    </div>
  );
}
