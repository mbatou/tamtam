"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Standard client-side data fetching for admin/superadmin pages.
 * Replaces the hand-rolled useState(loading/error/data) + useEffect(fetch)
 * blocks. Aborts in-flight requests on unmount/refetch; errors are surfaced
 * (never silently swallowed).
 *
 * const { data, loading, error, refetch } = useApi<Stats>("/api/admin/stats");
 * Pass `null` as the url to hold off fetching (dependent queries).
 */
export function useApi<T>(url: string | null): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (url === null) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal, credentials: "include" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error((body as { error?: string } | null)?.error || `Erreur ${res.status}`);
        }
        setData(body as T);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erreur réseau");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [url]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { data, loading, error, refetch: load };
}
