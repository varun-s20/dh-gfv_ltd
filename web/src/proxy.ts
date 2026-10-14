import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic admin gate: no session cookie → straight to the sign-in page.
 * This is a convenience only. Every admin page, action and API route still
 * verifies the session itself through requireAdmin()/adminForApi().
 */
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-gf_admin" : "gf_admin";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!request.cookies.has(COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
