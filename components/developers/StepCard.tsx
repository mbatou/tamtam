import { ReactNode } from "react";

interface StepCardProps {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function StepCard({ step, title, description, children }: StepCardProps) {
  return (
    <div className="relative">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#D35400]/15 flex items-center justify-center shrink-0">
          <span className="text-[13px] font-bold font-code text-[#D35400]">
            {String(step).padStart(2, "0")}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-bold font-syne text-white">{title}</h3>
          {description && (
            <p className="text-[13px] text-white/40 font-dm mt-1">{description}</p>
          )}
        </div>
      </div>
      <div className="ml-14">{children}</div>
    </div>
  );
}
