import { ensureAuditLogTable } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);

  if (!admin) {
    return new Response("Nemate ovlasti za dnevnik promjena.", {
      status: 403,
    });
  }

  await ensureAuditLogTable();

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType")?.trim();
  const action = searchParams.get("action")?.trim();
  const user = searchParams.get("user")?.trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string | null;
      userEmail: string | null;
      userName: string | null;
      userRole: string | null;
      action: string;
      entityType: string;
      entityId: string | null;
      entityLabel: string | null;
      firmaId: string | null;
      oldData: unknown;
      newData: unknown;
      createdAt: Date;
    }>
  >`
    SELECT *
    FROM "AuditLog"
    WHERE (${entityType || null}::text IS NULL OR "entityType" = ${entityType || null})
      AND (${action || null}::text IS NULL OR "action" = ${action || null})
      AND (
        ${user || null}::text IS NULL
        OR lower(coalesce("userEmail", '')) LIKE ${user ? `%${user}%` : null}
        OR lower(coalesce("userName", '')) LIKE ${user ? `%${user}%` : null}
      )
    ORDER BY "createdAt" DESC
    LIMIT ${limit};
  `;

  return Response.json(rows);
}
