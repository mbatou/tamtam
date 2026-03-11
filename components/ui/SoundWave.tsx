"use client";

export default function SoundWave({ bars = 7, className = "" }: { bars?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-[3px] h-6 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] bg-gradient-to-t from-primary to-primary-light rounded-full animate-wave-bar origin-bottom"
          style={{
            height: `${40 + Math.random() * 60}%`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
