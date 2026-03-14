"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";

interface SearchResults {
  echos: { id: string; name: string; phone: string; city: string; status: string }[];
  campaigns: { id: string; title: string; status: string; cpc: number; budget: number; spent: number }[];
  tickets: { id: string; subject: string; status: string; created_at: string }[];
}

export default function AdminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const hasResults = results && (results.echos.length > 0 || results.campaigns.length > 0 || results.tickets.length > 0);
  const noResults = results && !hasResults && query.length >= 2;

  const statusBadge: Record<string, string> = {
    active: "badge-active",
    paused: "badge-paused",
    completed: "badge-completed",
    draft: "badge-draft",
    rejected: "badge-rejected",
    open: "badge-pending",
    replied: "badge-active",
    closed: "badge-completed",
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results && query.length >= 2) setOpen(true); }}
          placeholder="Rechercher échos, campagnes, tickets..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {open && (hasResults || noResults) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">

          {noResults && (
            <div className="p-6 text-center text-white/40 text-sm">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Echos */}
          {results && results.echos.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase text-white/30 tracking-wider bg-white/[0.02] border-b border-white/5">
                Échos
              </div>
              {results.echos.map((echo) => (
                <button
                  key={echo.id}
                  onClick={() => navigate("/admin/echos")}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary-light/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {echo.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{echo.name}</p>
                    <p className="text-xs text-white/40 truncate">{echo.phone} · {echo.city || "—"}</p>
                  </div>
                  <span className="text-[10px] text-white/20 font-mono shrink-0">{echo.id.slice(0, 8)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Campaigns */}
          {results && results.campaigns.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase text-white/30 tracking-wider bg-white/[0.02] border-b border-white/5">
                Rythmes
              </div>
              {results.campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate("/admin/campaigns")}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-white/40">{formatFCFA(c.spent)} / {formatFCFA(c.budget)}</p>
                  </div>
                  <span className={`${statusBadge[c.status] || ""} text-[10px]`}>{c.status}</span>
                </button>
              ))}
            </div>
          )}

          {/* Support tickets */}
          {results && results.tickets.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase text-white/30 tracking-wider bg-white/[0.02] border-b border-white/5">
                Tickets support
              </div>
              {results.tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate("/admin/support")}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t.subject}</p>
                    <p className="text-xs text-white/40">{timeAgo(t.created_at)}</p>
                  </div>
                  <span className={`${statusBadge[t.status] || ""} text-[10px]`}>
                    {t.status === "open" ? "Ouvert" : t.status === "replied" ? "Répondu" : "Fermé"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
