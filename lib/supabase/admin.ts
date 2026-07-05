import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "./server";

let cached: SupabaseClient | null = null;

/**
 * Convenience service-role singleton — same client as `createServiceClient()`.
 *
 * Lazy: the client is constructed on first use, not at import time. Importing
 * this module must never throw, because `next build` loads route modules
 * during page-data collection — in environments without Supabase env vars
 * (CI, local builds) an eager constructor fails the whole build. At runtime,
 * missing env vars still fail loudly on first query.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!cached) cached = createServiceClient();
    const value = Reflect.get(cached, prop, receiver);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});
