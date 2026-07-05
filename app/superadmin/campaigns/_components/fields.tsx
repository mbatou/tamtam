"use client";

export function InfoField({ label, value, children, className }: { label: string; value?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="font-dm text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      {children || <span className="font-dm text-sm text-white">{value}</span>}
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</label>
      {children}
    </div>
  );
}
