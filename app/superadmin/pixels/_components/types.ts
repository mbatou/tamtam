export interface Brand {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
}

export interface PixelRow {
  id: string;
  pixel_id: string;
  name: string;
  is_active: boolean;
  total_conversions: number;
  last_conversion_at: string | null;
  last_test_at: string | null;
  test_status: string;
  test_count: number;
  last_test_error: string | null;
  last_test_latency_ms: number | null;
  platform: string;
  created_at: string;
  brand_id: string;
  brand: Brand | null;
}

export interface Stats {
  totalPixels: number;
  activePixels: number;
  testedPixels: number;
  eventsToday: number;
  avgLatency: number;
  errorRate: number;
}

export interface ConversionEvent {
  id: string;
  event: string;
  event_name: string | null;
  value_amount: number | null;
  tm_ref: string | null;
  attributed: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
  external_id: string | null;
}

export type PixelHealth = "active" | "inactive" | "untested" | "slow" | "error";
export type FilterType = "Tous" | "Actifs" | "Non testés" | "Erreurs";
