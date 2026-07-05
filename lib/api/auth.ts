import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AuthContext = {
  /** Verified auth user (validated against the Supabase auth server, not just the cookie). */
  authUser: User;
  /** The user's role from the users table. */
  role: string;
  /** Service-role client for data access. */
  supabase: SupabaseClient;
};

export class ApiAuthError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Non autorisé" : "Accès refusé");
  }

  toResponse() {
    return NextResponse.json({ error: this.message }, { status: this.status });
  }
}

/**
 * Authenticate the current request and (optionally) enforce a role allowlist.
 *
 * Uses `auth.getUser()` — which revalidates the JWT against the auth server —
 * rather than `auth.getSession()`, which only reads the cookie.
 *
 * Throws ApiAuthError (401 when unauthenticated, 403 when the role check
 * fails). Route handlers can either try/catch or use `requireAuthResponse`.
 */
export async function requireAuth(
  allowedRoles?: readonly string[],
  request?: Request
): Promise<AuthContext> {
  const authClient = createClient();
  let {
    data: { user },
  } = await authClient.auth.getUser();

  // Mobile app / non-browser clients: no auth cookies, but a Supabase access
  // token in the Authorization header. getUser(token) validates the JWT
  // against the auth server exactly like the cookie path.
  if (!user && request) {
    const header = request.headers.get("authorization");
    if (header?.startsWith("Bearer ")) {
      const { data } = await authClient.auth.getUser(header.slice(7));
      user = data.user;
    }
  }

  if (!user) {
    throw new ApiAuthError(401);
  }

  const supabase = createServiceClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    throw new ApiAuthError(401);
  }

  if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
    throw new ApiAuthError(403);
  }

  return { authUser: user, role: dbUser.role, supabase };
}

/**
 * Non-throwing variant: returns either the auth context or a ready-to-return
 * NextResponse error.
 *
 * Usage:
 *   const auth = await requireAuthResponse(["admin", "superadmin"]);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAuthResponse(
  allowedRoles?: readonly string[],
  request?: Request
): Promise<AuthContext | NextResponse> {
  try {
    return await requireAuth(allowedRoles, request);
  } catch (err) {
    if (err instanceof ApiAuthError) return err.toResponse();
    throw err;
  }
}
