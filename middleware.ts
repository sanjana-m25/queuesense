/**
 * middleware.ts
 * ─────────────
 * Next.js Middleware — runs on every matched request at the edge.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie on every request (prevents stale JWT).
 *   2. Protect /admin/* and /doctor/* routes — redirect unauthenticated users to /login.
 *   3. Pass /patient/* routes through WITHOUT an auth check (token-based, no login).
 *   4. Pass /api/* routes through — individual route handlers check auth themselves.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create a mutable response so we can forward updated session cookies
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
          // First, set on the request so the downstream server code sees them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Then forward on the response so the browser stores them
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove this call.
  // It keeps the Supabase JWT valid by exchanging the refresh token when needed.
  // getUser() is the correct method here (not getSession()) to avoid stale data.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protected routes: /admin/* and /doctor/* ─────────────────────────────
  const isAdminRoute = pathname.startsWith("/admin");
  const isDoctorRoute = pathname.startsWith("/doctor");

  if ((isAdminRoute || isDoctorRoute) && !user) {
    // Redirect to login, preserving the originally requested URL as a redirect param
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect logged-in users away from /login ──────────────────────────────
  if (pathname === "/login" && user) {
    const role = user.user_metadata?.role;
    const dashboardUrl = request.nextUrl.clone();
    if (role === "admin" || role === "receptionist") {
      dashboardUrl.pathname = "/admin/queue";
    } else if (role === "doctor") {
      dashboardUrl.pathname = "/doctor";
    } else {
      dashboardUrl.pathname = "/";
    }
    return NextResponse.redirect(dashboardUrl);
  }

  // ── /patient/* passes through without auth ────────────────────────────────
  // Patient pages use short-lived consent tokens; no Supabase Auth required.

  // ── Return the (possibly cookie-updated) response ────────────────────────
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico   (browser favicon)
     * - public/       (files in /public)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
