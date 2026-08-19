import { unlink } from "fs/promises";
import path from "path";
import {
  ensureTvrtkaDokumentiTable,
  type TvrtkaDokument,
} from "@/lib/company-documents";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTvrtkaDokumentiTable();
    const { id } = await params;

    const rows = await prisma.$queryRaw<TvrtkaDokument[]>`
      SELECT * FROM "TvrtkaDokument"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const dokument = rows[0];

    if (!dokument) {
      return new Response("Dokument nije pronaden.", { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), "public", dokument.fileUrl);

    try {
      await unlink(absolutePath);
    } catch {
      // Ako datoteka fizicki ne postoji, svejedno brisemo zapis iz baze.
    }

    await prisma.$executeRaw`
      DELETE FROM "TvrtkaDokument"
      WHERE "id" = ${id}
    `;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tvrtke-dokumenti/[id] error:", error);
    return new Response("Ne mogu obrisati dokument firme.", { status: 500 });
  }
}