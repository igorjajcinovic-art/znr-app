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

type AuthPayload = {
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

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

  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as AuthPayload;

    if (!payload.userId || !payload.email) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
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

function forbiddenRequest(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return new Response("Nemate ovlasti za ovu radnju.", { status: 403 });
  }

  return NextResponse.redirect(new URL("/tvrtke", req.url));
}

function poslovodaCanAccess(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (pathname === "/" || pathname === "/korisnici") return false;

  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/auth")) return true;
    if (pathname === "/api/upozorenja/count") return method === "GET";
    if (pathname.startsWith("/api/tvrtke")) return method === "GET";
    if (pathname.startsWith("/api/radnici")) return method === "GET";
    if (pathname.startsWith("/api/lijecnicki")) return method === "GET";
    if (pathname.startsWith("/api/osposobljavanja")) return method === "GET";
    if (pathname.startsWith("/api/oprema")) return method !== "DELETE";
    if (pathname.startsWith("/api/radno-vrijeme")) return true;
    return false;
  }

  if (pathname === "/tvrtke") return true;
  if (!pathname.startsWith("/tvrtke/")) return false;

  const parts = pathname.split("/").filter(Boolean);
  const moduleName = parts[2] || "";

  if (!moduleName) return true;

  return ["radnici", "oprema", "radno-vrijeme", "upozorenja"].includes(
    moduleName
  );
}

function poslovodaCompanyHome(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "tvrtke" && parts.length === 2 ? parts[1] : "";
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

  const payload = await verifyAuthToken(token);

  if (!payload) {
    return rejectRequest(req);
  }

  const role = payload.role || "admin";

  if (role !== "admin") {
    const firmaId = poslovodaCompanyHome(pathname);
    if (firmaId) {
      return NextResponse.redirect(
        new URL(`/tvrtke/${firmaId}/radno-vrijeme`, req.url)
      );
    }
  }

  if (role !== "admin" && !poslovodaCanAccess(req)) {
    return forbiddenRequest(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth).*)"],
};
