import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Service role client bypasses RLS — used only for role lookups
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Helper to get user role bypassing RLS
  async function getUserRole(userId: string) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    return data?.role || null;
  }

  // Protect echo routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/rythmes") || pathname.startsWith("/earnings") || pathname.startsWith("/profil")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const role = await getUserRole(user.id);
    if (role !== "echo") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const role = await getUserRole(user.id);
    if (!role || !["admin", "superadmin", "batteur"].includes(role)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect superadmin routes
  if (pathname.startsWith("/superadmin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const role = await getUserRole(user.id);
    if (role !== "superadmin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/rythmes/:path*",
    "/earnings/:path*",
    "/profil/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
  ],
};
