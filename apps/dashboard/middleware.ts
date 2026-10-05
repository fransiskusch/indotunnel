import { NextResponse, type NextRequest } from "next/server";

// Redirect unauthenticated app routes to /login.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("indotunnel_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|signup|api|_next/static|_next/image|favicon.ico).*)"],
};
