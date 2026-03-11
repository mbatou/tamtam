"use client";

import { ButtonHTMLAttributes } from "react";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "teal";
  size?: "sm" | "md" | "lg";
}

const gradients = {
  primary: "bg-gradient-primary",
  secondary: "bg-gradient-secondary",
  teal: "bg-gradient-teal",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export default function GradientButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={`${gradients[variant]} ${sizes[size]} text-white font-bold rounded-btn transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 relative overflow-hidden ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
