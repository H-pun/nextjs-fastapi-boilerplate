import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Route prefixes that need a scope, longest first so a more specific rule wins.
 *
 * This is an optimistic check in the sense Next.js means it: scopes are read
 * from the session cookie, which is a copy taken at login and can lag behind
 * the database until the user signs in again. It exists to redirect early and
 * to catch client-side navigations, which the layout gate cannot see. The API
 * re-checks every scope against live data, and that is the real protection.
 */
const SCOPED_ROUTES: readonly (readonly [prefix: string, scope: string])[] = [
  ["/dashboard/admin", "user:manage"],
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.SECRET_KEY });

  if (token && pathname.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard`;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard")) {
    const url = req.nextUrl.clone();
    if (!token) {
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }

    const rule = SCOPED_ROUTES.find(([prefix]) => pathname.startsWith(prefix));
    if (rule) {
      const held = new Set(
        token.user?.roles?.flatMap((role) => role.scopes.map((s) => s.key)) ?? []
      );
      if (!held.has(rule[1])) {
        // Send them somewhere they can be, rather than a dead end. The menu
        // is already hidden for them, so reaching this means a typed URL or a
        // stale bookmark.
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};

