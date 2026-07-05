"use client";

export default function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</label>
      {children}
    </div>
  );
}
