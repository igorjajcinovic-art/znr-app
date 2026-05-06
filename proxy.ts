import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-promijeni";

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "="
  );
  const normalized = padded.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized);
}

async function verifyAuthToken(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = toBase64Url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  );

  if (signature !== expected) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as {
      userId?: string;
      email?: string;
      exp?: number;
    };

    if (!payload.userId || !payload.email) return false;
    if (!payload.exp) return true;
    return payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function rejectRequest(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return new Response("Neautorizirano.", { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set("auth_token", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function proxy(req: NextRequest) {
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
    return rejectRequest(req);
  }

  const validToken = await verifyAuthToken(token);

  if (!validToken) {
    return rejectRequest(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth).*)"],
};
