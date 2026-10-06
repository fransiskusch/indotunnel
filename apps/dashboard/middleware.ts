import { NextResponse, type NextRequest } from "next/server";

// Redirect unauthenticated app routes to /login.
export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/requests") ||
    pathname.startsWith("/usage");

  if (isProtected) {
    const hasSession = req.cookies.has("indotunnel_session");
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/usage/:path*"],
};
