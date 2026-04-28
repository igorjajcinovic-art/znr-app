import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLogin = pathname.startsWith("/login");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isNextAsset = pathname.startsWith("/_next");
  const isPublicFile =
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/uploads");

  if (isLogin || isAuthApi || isNextAsset || isPublicFile) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth).*)"],
};