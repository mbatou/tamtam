"use client";

import { useSearchParams } from "next/navigation";

export function useQueryString() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}
