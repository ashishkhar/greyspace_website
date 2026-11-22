import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Gate admin pages and every write API behind the signed admin session.
 * Public: the site, /moodboard, /board/*, board GET, feedback, inquiry POST, admin login.
 */
function isProtectedApi(pathname: string, method: string): boolean {
  const write = method !== "GET" && method !== "HEAD";
  if (pathname.startsWith("/api/admin/login") || pathname.startsWith("/api/admin/logout")) return false;
  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname === "/api/upload" || pathname === "/api/create-board") return true;
  if (pathname.startsWith("/api/board/") && write) return true;
  if (pathname === "/api/site" && write) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authed = verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);

  if (pathname.startsWith("/api/")) {
    if (isProtectedApi(pathname, req.method) && !authed) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    if (authed) {
      const nextParam = req.nextUrl.searchParams.get("next");
      const dest = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  const redirectUrl = new URL("/admin/login", req.url);
  redirectUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
