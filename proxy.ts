import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface SessionCookie {
  email?: string;
  status?: "PENDING" | "ACTIVE";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read session cookie set by useLoginSuccess
  const raw = request.cookies.get("props-ai-session")?.value;
  let session: SessionCookie | null = null;
  if (raw) {
    try { session = JSON.parse(decodeURIComponent(raw)); } catch { session = null; }
  }

  const isLoggedIn = !!session?.email;
  const isActive   = session?.status === "ACTIVE";
  const isPending  = session?.status === "PENDING";

  // ── /dashboard → must be logged in + ACTIVE ─────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", request.url));
    if (isPending)   return NextResponse.redirect(new URL("/pending", request.url));
    return NextResponse.next();
  }

  // ── /pending → must be logged in (but PENDING) ──────────────────────────
  if (pathname.startsWith("/pending")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", request.url));
    if (isActive)    return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // ── /login & /signup → redirect away if already logged in ───────────────
  if (pathname === "/login" || pathname === "/signup") {
    if (isLoggedIn && isActive)  return NextResponse.redirect(new URL("/dashboard", request.url));
    if (isLoggedIn && isPending) return NextResponse.redirect(new URL("/pending", request.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/pending/:path*", "/login", "/signup"],
};
