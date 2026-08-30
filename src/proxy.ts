import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};
