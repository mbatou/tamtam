import "server-only";

import { createServiceClient } from "./server";

/**
 * Convenience service-role singleton.
 * Same client as `createServiceClient()` — one construction path, and it
 * throws at import time if the env vars are missing instead of silently
 * falling back to placeholder credentials.
 */
export const supabaseAdmin = createServiceClient();
