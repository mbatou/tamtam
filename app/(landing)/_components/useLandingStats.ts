"use client";

import { useEffect, useState } from "react";

export interface LandingStats {
  echos: number;
  campaigns: number;
  validClicks: number;
  totalPaid: number;
  withdrawalCount: number;
  batteurs: number;
}

const defaultStats: LandingStats = {
  echos: 0,
  campaigns: 0,
  validClicks: 0,
  totalPaid: 0,
  withdrawalCount: 0,
  batteurs: 0,
};

export function useLandingStats() {
  const [stats, setStats] = useState<LandingStats>(defaultStats);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setStats(data);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  return { stats, loaded };
}
