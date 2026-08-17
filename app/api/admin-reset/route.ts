import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserTable } from "@/lib/users";

const RESET_KEY = "znr-reset-2026-08-17-privremeno";
const TEMP_PASSWORD = "123456";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";

  if (key !== RESET_KEY) {
    return new Response("Nedozvoljen reset.", { status: 403 });
  }

  try {
    await ensureUserTable();

    const lozinkaHash = hashPassword(TEMP_PASSWORD);
    let user = await prisma.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lozinkaHash,
          role: "admin",
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: "admin@test.hr",
          ime: "Admin",
          lozinkaHash,
          role: "admin",
        },
      });
    }

    return Response.json({
      ok: true,
      email: user.email,
      privremenaLozinka: TEMP_PASSWORD,
    });
  } catch (error) {
    console.error("GET /api/admin-reset error:", error);
    return new Response("Reset nije uspio.", { status: 500 });
  }
}