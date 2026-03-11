import { ReactNode } from "react";

export default function Card({
  children,
  className = "",
  hover = false,
  accentColor,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  accentColor?: "orange" | "teal" | "purple" | "red";
}) {
  const accentStyles = {
    orange: "border-l-4 border-l-primary",
    teal: "border-l-4 border-l-accent",
    purple: "border-l-4 border-l-secondary",
    red: "border-l-4 border-l-[#E74C3C]",
  };

  return (
    <div
      className={`glass-card p-6 ${hover ? "hover-lift cursor-pointer" : ""} ${accentColor ? accentStyles[accentColor] : ""} ${className}`}
    >
      {children}
    </div>
  );
}
