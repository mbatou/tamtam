"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SuperadminMetrics {
  total_brands: number;
  new_brands_this_month: number;
  total_echos: number;
  new_echos_this_week: number;
  active_campaigns: number;
  total_campaigns: number;
  total_valid_clicks: number;
  clicks_today: number;
  clicks_this_week: number;
  total_gmv_fcfa: number;
  gmv_this_month: number;
  platform_revenue_fcfa: number;
  platform_revenue_this_month: number;
  total_echo_available: number;
  total_echo_pending: number;
  pending_payouts: number;
  computed_at: string;
}

export function useSuperadminMetrics(autoRefreshMs = 60000) {
  const [metrics, setMetrics] = useState<SuperadminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("superadmin_metrics")
        .select("*")
        .single();
      if (data) {
        setMetrics(data as SuperadminMetrics);
      }
    } catch {
      // View may not exist yet
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    if (autoRefreshMs > 0) {
      const interval = setInterval(refresh, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [refresh, autoRefreshMs]);

  return { metrics, loading, refresh, lastRefresh };
}
