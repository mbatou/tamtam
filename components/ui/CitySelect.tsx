"use client";

import { useState, useRef, useEffect } from "react";
import { SENEGAL_CITIES } from "@/lib/cities";

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CitySelect({ value, onChange, placeholder = "Dakar", className }: CitySelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = SENEGAL_CITIES.filter((c) =>
    c.toLowerCase().includes((search || value).toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={open ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch(value);
        }}
        placeholder={placeholder}
        className={className || "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl">
          {filtered.map((city) => (
            <li
              key={city}
              onClick={() => {
                onChange(city);
                setSearch("");
                setOpen(false);
              }}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-white/10 transition ${
                city === value ? "text-primary font-semibold" : "text-white/70"
              }`}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
