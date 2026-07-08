import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function cookieValue(req: Request, name: string) {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const found = parts.find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

export async function getCurrentUser(req: Request) {
  const token = cookieValue(req, "auth_token");
  const payload = token ? verifyToken(token) : null;

  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, ime: true, role: true },
  });

  return user;
}

export async function requireAdmin(req: Request) {
  const user = await getCurrentUser(req);
  return user?.role === "admin" ? user : null;
}
