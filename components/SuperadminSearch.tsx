"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import { useTranslation } from "@/lib/i18n";

interface SearchResults {
  users: { id: string; name: string; phone: string; city: string; role: string; status: string; balance: number; total_earned: number }[];
  campaigns: { id: string; title: string; status: string; cpc: number; budget: number; spent: number; batteur_id: string }[];
  tickets: { id: string; subject: string; status: string; user_id: string; created_at: string }[];
  payouts: { id: string; echo_id: string; amount: number; provider: string; status: string; created_at: string; echo_name?: string }[];
}

const roleBadge: Record<string, { label: string; cls: string }> = {
  echo: { label: "Echo", cls: "bg-accent/20 text-accent" },
  batteur: { label: "Marque", cls: "bg-primary/20 text-primary" },
  superadmin: { label: "Super", cls: "bg-red-500/20 text-red-400" },
  admin: { label: "Admin", cls: "bg-secondary/20 text-secondary" },
};

const statusBadge: Record<string, string> = {
  active: "badge-active",
  paused: "badge-paused",
  completed: "badge-completed",
  draft: "badge-draft",
  rejected: "badge-rejected",
  open: "badge-pending",
  replied: "badge-active",
  closed: "badge-completed",
  pending: "badge-pending",
  sent: "badge-active",
  failed: "badge-rejected",
};

export default function SuperadminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();
  const { t } = useTranslation();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/search?q=${encodeURIComponent(q)}`);
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const hasResults = results && (
    results.users.length > 0 || results.campaigns.length > 0 ||
    results.tickets.length > 0 || results.payouts.length > 0
  );
  const noResults = results && !hasResults && query.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Input */}
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
          placeholder={t("search.placeholder")}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {open && (hasResults || noResults) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">

          {noResults && (
            <div className="p-6 text-center text-white/40 text-sm">
              {t("search.noResults")} &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Users */}
          {results && results.users.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase text-white/30 tracking-wider bg-white/[0.02] border-b border-white/5">
                {t("search.users")}
              </div>
              {results.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/superadmin/users?id=${u.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary-light/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {getBrandDisplayName(u).charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{getBrandDisplayName(u)}</p>
                    <p className="text-xs text-white/40 truncate">
                      {u.phone} · {u.city || "—"}
                      {u.total_earned > 0 && <> · {formatFCFA(u.total_earned)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${roleBadge[u.role]?.cls || "bg-white/10 text-white/50"}`}>
                      {roleBadge[u.role]?.label || u.role}
                    </span>
                    <span className="text-[10px] text-white/20 font-mono">{u.id.slice(0, 8)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Campaigns */}
          {results && results.campaigns.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase text-white/30 tracking-wider bg-white/[0.02] border-b border-white/5">
                {t("search.campaigns")}
              </div>
              {results.campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/superadmin/campaigns?id=${c.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-white/40">{formatFCFA(c.spent)} / {formatFCFA(c.budget)} · CPC {c.cpc}</p>
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
                {t("search.tickets")}
              </div>
              {results.tickets.map((tk) => (
                <button
                  key={tk.id}
                  onClick={() => navigate(`/superadmin/support?id=${tk.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{tk.subject}</p>
                    <p className="text-xs text-white/40">{timeAgo(tk.created_at)}</p>
                  </div>
                  <span className={`${statusBadge[tk.status] || ""} text-[10px]`}>
                    {tk.status === "open" ? t("common.open") : tk.status === "replied" ? t("common.replied") : t("common.closed")}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Payouts */}
          {results && results.payouts.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-bold uppercase text-white/30 tracking-wider bg-white/[0.02] border-b border-white/5">
                {t("search.payouts")}
              </div>
              {results.payouts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/superadmin/finance?id=${p.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition text-left border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{formatFCFA(p.amount)}{p.echo_name ? ` — ${p.echo_name}` : ""}</p>
                    <p className="text-xs text-white/40">{p.provider} · {timeAgo(p.created_at)}</p>
                  </div>
                  <span className={`${statusBadge[p.status] || ""} text-[10px]`}>{p.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
