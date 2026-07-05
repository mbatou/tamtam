import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Standardized JSON error envelope for API routes:
 * `{ error: message, details? }` with the given HTTP status.
 */
export function apiError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * 400 response for a failed zod parse, with flattened field errors —
 * matches the existing convention in app/api/campaigns/route.ts.
 */
export function validationError(zodError: ZodError) {
  return apiError(400, "Données invalides", zodError.flatten().fieldErrors);
}
