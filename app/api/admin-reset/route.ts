import { randomUUID } from "crypto";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserTable } from "@/lib/users";

const RESET_KEY = "znr-reset-2026-08-17-privremeno";
const TEMP_PASSWORD = "123456";
const DEFAULT_ADMIN_EMAIL = "admin@test.hr";
const RESET_VERSION = "reset-v5-2026-08-17";

type ResetUser = {
  id: string;
  email: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";

  if (key !== RESET_KEY) {
    return new Response("Nedozvoljen reset.", { status: 403 });
  }

  try {
    await ensureUserTable();

    const lozinkaHash = hashPassword(TEMP_PASSWORD);
    let rows = await prisma.$queryRaw<ResetUser[]>`
      SELECT "id", "email"
      FROM "User"
      WHERE "role" = 'admin'
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

    if (rows.length === 0) {
      rows = await prisma.$queryRaw<ResetUser[]>`
        SELECT "id", "email"
        FROM "User"
        ORDER BY "createdAt" ASC
        LIMIT 1
      `;
    }

    if (rows.length > 0) {
      const user = rows[0];
      const email = user.email || DEFAULT_ADMIN_EMAIL;

      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "email" = ${email},
          "ime" = COALESCE("ime", 'Admin'),
          "lozinkaHash" = ${lozinkaHash},
          "role" = 'admin',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${user.id}
      `;

      return Response.json({
        ok: true,
        resetVersion: RESET_VERSION,
        email,
        privremenaLozinka: TEMP_PASSWORD,
      });
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "User" ("id", "email", "ime", "lozinkaHash", "role", "createdAt", "updatedAt")
      VALUES (${id}, ${DEFAULT_ADMIN_EMAIL}, 'Admin', ${lozinkaHash}, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return Response.json({
      ok: true,
      resetVersion: RESET_VERSION,
      email: DEFAULT_ADMIN_EMAIL,
      privremenaLozinka: TEMP_PASSWORD,
    });
  } catch (error) {
    console.error("GET /api/admin-reset error:", error);
    const message = error instanceof Error ? error.message : "Nepoznata greÅ¡ka";
    return Response.json({ ok: false, resetVersion: RESET_VERSION, error: message }, { status: 500 });
  }
}

