"use client";

import { useEffect } from "react";

interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
}

export default function OnboardingShell({ currentStep, totalSteps, children }: OnboardingShellProps) {
  useEffect(() => {
    const nav = document.querySelector(".echo-bottom-nav") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-[#0A0A1A] flex flex-col overflow-y-auto">
      {/* Progress dots */}
      <div className="pt-[calc(env(safe-area-inset-top,0px)+1rem)] px-6 pb-2">
        <div className="flex gap-2 max-w-[560px] mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= currentStep ? "bg-[#1D9E75]" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col max-w-[560px] mx-auto w-full px-5 py-4">
        {children}
      </div>
    </div>
  );
}
